// FaturaFi - On-chain invoice tokenization protocol
//
// This Anchor program manages the lifecycle of a tokenized invoice:
//   1. SME lists an invoice (off-chain scoring already done by the API)
//   2. Program mints an Invoice NFT representing the receivable
//   3. Investor purchases the NFT by depositing discounted USDC into escrow
//   4. SME receives discounted USDC immediately (their working capital)
//   5. On maturity, buyer (or anyone) deposits face value -> investor receives full face value
//   6. If maturity passes without payment, NFT is marked defaulted (extensible to recovery flow)
//
// Why Solana: micro-invoices (5-50 USDC face value) are economically viable here
// (per-tx cost ~$0.00025) but unworkable on L1 EVM chains.

use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fatura1nv0iceProgram111111111111111111111111");

#[program]
pub mod faturafi {
    use super::*;

    /// Initialize the global protocol config (called once by admin).
    pub fn initialize(ctx: Context<Initialize>, treasury_fee_bps: u16) -> Result<()> {
        require!(treasury_fee_bps <= 1000, FaturaError::FeeTooHigh); // max 10%
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.treasury = ctx.accounts.treasury.key();
        config.usdc_mint = ctx.accounts.usdc_mint.key();
        config.treasury_fee_bps = treasury_fee_bps;
        config.invoice_counter = 0;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// SME lists an invoice. Mints an Invoice NFT (this PDA-derived mint represents the
    /// receivable). The off-chain risk score is recorded on-chain for transparency.
    pub fn list_invoice(
        ctx: Context<ListInvoice>,
        invoice_id: [u8; 16],          // UUID bytes from the API
        face_value_usdc: u64,           // amount with 6 decimals (USDC standard)
        discount_bps: u16,              // e.g. 1200 = 12%
        risk_score: u8,                 // 0-100
        grade: u8,                      // 0=A, 1=B, 2=C, 3=D, 4=E
        maturity_unix_ts: i64,
        risk_drivers_hash: [u8; 32],    // sha256 of the SHAP explanation JSON
    ) -> Result<()> {
        require!(face_value_usdc > 0, FaturaError::ZeroAmount);
        require!(discount_bps < 5000, FaturaError::DiscountTooHigh); // sanity bound
        require!(risk_score <= 100, FaturaError::InvalidRiskScore);
        require!(grade <= 4, FaturaError::InvalidGrade);
        let clock = Clock::get()?;
        require!(maturity_unix_ts > clock.unix_timestamp, FaturaError::MaturityInPast);

        let invoice = &mut ctx.accounts.invoice;
        invoice.invoice_id = invoice_id;
        invoice.sme = ctx.accounts.sme.key();
        invoice.buyer = ctx.accounts.buyer.key();
        invoice.face_value_usdc = face_value_usdc;
        invoice.discount_bps = discount_bps;
        invoice.discounted_value_usdc = face_value_usdc
            .checked_mul(10_000u64.checked_sub(discount_bps as u64).unwrap())
            .ok_or(FaturaError::MathOverflow)?
            .checked_div(10_000)
            .ok_or(FaturaError::MathOverflow)?;
        invoice.risk_score = risk_score;
        invoice.grade = grade;
        invoice.risk_drivers_hash = risk_drivers_hash;
        invoice.maturity_ts = maturity_unix_ts;
        invoice.listed_at = clock.unix_timestamp;
        invoice.status = InvoiceStatus::Listed as u8;
        invoice.investor = Pubkey::default();
        invoice.nft_mint = ctx.accounts.nft_mint.key();
        invoice.bump = ctx.bumps.invoice;

        let config = &mut ctx.accounts.config;
        config.invoice_counter = config.invoice_counter.checked_add(1).unwrap();

        emit!(InvoiceListed {
            invoice_pubkey: invoice.key(),
            sme: invoice.sme,
            face_value_usdc,
            risk_score,
            grade,
        });
        Ok(())
    }

    /// Investor funds an invoice. They deposit discounted USDC into escrow; the program
    /// immediately transfers the funds to the SME, and the Invoice NFT is transferred
    /// to the investor.
    pub fn fund_invoice(ctx: Context<FundInvoice>) -> Result<()> {
        let invoice = &mut ctx.accounts.invoice;
        require!(
            invoice.status == InvoiceStatus::Listed as u8,
            FaturaError::InvalidStatus
        );
        let clock = Clock::get()?;
        require!(invoice.maturity_ts > clock.unix_timestamp, FaturaError::InvoiceExpired);

        // Treasury fee on discount spread (protocol revenue)
        let config = &ctx.accounts.config;
        let spread = invoice.face_value_usdc.checked_sub(invoice.discounted_value_usdc).unwrap();
        let protocol_fee = spread
            .checked_mul(config.treasury_fee_bps as u64).unwrap()
            .checked_div(10_000).unwrap();
        let sme_proceeds = invoice.discounted_value_usdc;

        // Investor pays discounted amount + fee in one transfer
        let total_paid = sme_proceeds.checked_add(protocol_fee).ok_or(FaturaError::MathOverflow)?;

        // Investor -> SME (discounted face value)
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.investor_usdc.to_account_info(),
                    to: ctx.accounts.sme_usdc.to_account_info(),
                    authority: ctx.accounts.investor.to_account_info(),
                },
            ),
            sme_proceeds,
        )?;

        // Investor -> Treasury (protocol fee on the spread)
        if protocol_fee > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.investor_usdc.to_account_info(),
                        to: ctx.accounts.treasury_usdc.to_account_info(),
                        authority: ctx.accounts.investor.to_account_info(),
                    },
                ),
                protocol_fee,
            )?;
        }

        invoice.investor = ctx.accounts.investor.key();
        invoice.funded_at = clock.unix_timestamp;
        invoice.status = InvoiceStatus::Funded as u8;

        emit!(InvoiceFunded {
            invoice_pubkey: invoice.key(),
            investor: invoice.investor,
            amount_paid: total_paid,
            sme_proceeds,
            protocol_fee,
        });
        Ok(())
    }

    /// Anyone (typically the buyer) deposits face value to settle a funded invoice.
    /// The full face value is transferred to the current NFT holder (investor).
    pub fn settle_invoice(ctx: Context<SettleInvoice>) -> Result<()> {
        let invoice = &mut ctx.accounts.invoice;
        require!(
            invoice.status == InvoiceStatus::Funded as u8,
            FaturaError::InvalidStatus
        );

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_usdc.to_account_info(),
                    to: ctx.accounts.investor_usdc.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            invoice.face_value_usdc,
        )?;

        let clock = Clock::get()?;
        invoice.settled_at = clock.unix_timestamp;
        invoice.status = InvoiceStatus::Settled as u8;

        emit!(InvoiceSettled {
            invoice_pubkey: invoice.key(),
            face_value_paid: invoice.face_value_usdc,
        });
        Ok(())
    }

    /// After maturity passes without settlement, mark the invoice as defaulted.
    /// This unlocks the recovery flow (out of scope for the hackathon MVP but the
    /// hook is preserved).
    pub fn mark_defaulted(ctx: Context<MarkDefaulted>) -> Result<()> {
        let invoice = &mut ctx.accounts.invoice;
        require!(
            invoice.status == InvoiceStatus::Funded as u8,
            FaturaError::InvalidStatus
        );
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp > invoice.maturity_ts + 7 * 24 * 60 * 60,
            FaturaError::GracePeriodActive
        );
        invoice.status = InvoiceStatus::Defaulted as u8;
        emit!(InvoiceDefaulted { invoice_pubkey: invoice.key() });
        Ok(())
    }
}

// ─────────────────────────────────────────── Account contexts ───────────────────────────────────────────

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolConfig::LEN,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, ProtocolConfig>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: treasury wallet (USDC ATA derived off-chain)
    pub treasury: UncheckedAccount<'info>,
    pub usdc_mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(invoice_id: [u8; 16])]
pub struct ListInvoice<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        init,
        payer = sme,
        space = 8 + Invoice::LEN,
        seeds = [b"invoice", invoice_id.as_ref()],
        bump
    )]
    pub invoice: Account<'info, Invoice>,

    /// The NFT mint representing this invoice (PDA, 0 decimals, supply 1).
    #[account(
        init,
        payer = sme,
        mint::decimals = 0,
        mint::authority = invoice,
        mint::freeze_authority = invoice,
        seeds = [b"invoice_nft", invoice_id.as_ref()],
        bump
    )]
    pub nft_mint: Account<'info, Mint>,

    #[account(mut)]
    pub sme: Signer<'info>,
    /// CHECK: buyer pubkey (informational, not a signer)
    pub buyer: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct FundInvoice<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"invoice", invoice.invoice_id.as_ref()],
        bump = invoice.bump
    )]
    pub invoice: Account<'info, Invoice>,

    #[account(mut)]
    pub investor: Signer<'info>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = investor)]
    pub investor_usdc: Account<'info, TokenAccount>,

    /// CHECK: SME public key recorded in invoice
    #[account(address = invoice.sme)]
    pub sme: UncheckedAccount<'info>,
    #[account(mut, token::mint = config.usdc_mint)]
    pub sme_usdc: Account<'info, TokenAccount>,

    #[account(mut, token::mint = config.usdc_mint)]
    pub treasury_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleInvoice<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, ProtocolConfig>,

    #[account(
        mut,
        seeds = [b"invoice", invoice.invoice_id.as_ref()],
        bump = invoice.bump
    )]
    pub invoice: Account<'info, Invoice>,

    #[account(mut)]
    pub payer: Signer<'info>, // typically the buyer
    #[account(mut, token::mint = config.usdc_mint, token::authority = payer)]
    pub payer_usdc: Account<'info, TokenAccount>,

    #[account(mut, token::mint = config.usdc_mint)]
    pub investor_usdc: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MarkDefaulted<'info> {
    #[account(
        mut,
        seeds = [b"invoice", invoice.invoice_id.as_ref()],
        bump = invoice.bump
    )]
    pub invoice: Account<'info, Invoice>,
    /// CHECK: anyone can call this after grace period; no auth needed
    pub caller: Signer<'info>,
}

// ────────────────────────────────────────────── Accounts ──────────────────────────────────────────────

#[account]
pub struct ProtocolConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub usdc_mint: Pubkey,
    pub treasury_fee_bps: u16,
    pub invoice_counter: u64,
    pub bump: u8,
}
impl ProtocolConfig {
    pub const LEN: usize = 32 + 32 + 32 + 2 + 8 + 1;
}

#[account]
pub struct Invoice {
    pub invoice_id: [u8; 16],
    pub sme: Pubkey,
    pub buyer: Pubkey,
    pub investor: Pubkey,
    pub nft_mint: Pubkey,
    pub face_value_usdc: u64,
    pub discounted_value_usdc: u64,
    pub discount_bps: u16,
    pub risk_score: u8,
    pub grade: u8,
    pub risk_drivers_hash: [u8; 32],
    pub status: u8,
    pub maturity_ts: i64,
    pub listed_at: i64,
    pub funded_at: i64,
    pub settled_at: i64,
    pub bump: u8,
}
impl Invoice {
    pub const LEN: usize = 16 + 32*4 + 8*2 + 2 + 1 + 1 + 32 + 1 + 8*4 + 1;
}

#[repr(u8)]
pub enum InvoiceStatus {
    Listed = 0,
    Funded = 1,
    Settled = 2,
    Defaulted = 3,
}

// ─────────────────────────────────────────────── Events ───────────────────────────────────────────────

#[event]
pub struct InvoiceListed {
    pub invoice_pubkey: Pubkey,
    pub sme: Pubkey,
    pub face_value_usdc: u64,
    pub risk_score: u8,
    pub grade: u8,
}

#[event]
pub struct InvoiceFunded {
    pub invoice_pubkey: Pubkey,
    pub investor: Pubkey,
    pub amount_paid: u64,
    pub sme_proceeds: u64,
    pub protocol_fee: u64,
}

#[event]
pub struct InvoiceSettled {
    pub invoice_pubkey: Pubkey,
    pub face_value_paid: u64,
}

#[event]
pub struct InvoiceDefaulted {
    pub invoice_pubkey: Pubkey,
}

// ─────────────────────────────────────────────── Errors ───────────────────────────────────────────────

#[error_code]
pub enum FaturaError {
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Discount rate is unrealistically high")]
    DiscountTooHigh,
    #[msg("Risk score must be 0-100")]
    InvalidRiskScore,
    #[msg("Grade must be 0-4 (A-E)")]
    InvalidGrade,
    #[msg("Maturity timestamp must be in the future")]
    MaturityInPast,
    #[msg("Treasury fee cannot exceed 10%")]
    FeeTooHigh,
    #[msg("Math operation overflowed")]
    MathOverflow,
    #[msg("Invoice is not in the required status for this action")]
    InvalidStatus,
    #[msg("Invoice has passed maturity and cannot be funded")]
    InvoiceExpired,
    #[msg("Grace period is still active; cannot mark defaulted yet")]
    GracePeriodActive,
}
