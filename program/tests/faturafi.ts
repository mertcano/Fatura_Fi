/**
 * FaturaFi end-to-end integration test.
 *
 * Tests the full lifecycle: initialize -> list -> fund -> settle.
 * Run with: anchor test
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Faturafi } from "../target/types/faturafi";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import { randomBytes, createHash } from "crypto";

describe("faturafi", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Faturafi as Program<Faturafi>;
  const connection = provider.connection;

  // Actors
  const authority = (provider.wallet as anchor.Wallet).payer;
  const sme = Keypair.generate();
  const investor = Keypair.generate();
  const buyer = Keypair.generate();
  const treasury = Keypair.generate();

  let usdcMint: PublicKey;
  let smeUsdc: PublicKey;
  let investorUsdc: PublicKey;
  let buyerUsdc: PublicKey;
  let treasuryUsdc: PublicKey;

  let configPda: PublicKey;
  let invoicePda: PublicKey;
  let nftMintPda: PublicKey;
  let invoiceId: Buffer;

  before(async () => {
    // Fund actors
    for (const kp of [sme, investor, buyer, treasury]) {
      const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(sig);
    }

    // Mock USDC mint (6 decimals like real USDC)
    usdcMint = await createMint(connection, authority, authority.publicKey, null, 6);

    // Create USDC ATAs and fund investor + buyer
    smeUsdc = await createAssociatedTokenAccount(connection, authority, usdcMint, sme.publicKey);
    investorUsdc = await createAssociatedTokenAccount(connection, authority, usdcMint, investor.publicKey);
    buyerUsdc = await createAssociatedTokenAccount(connection, authority, usdcMint, buyer.publicKey);
    treasuryUsdc = await createAssociatedTokenAccount(connection, authority, usdcMint, treasury.publicKey);

    await mintTo(connection, authority, usdcMint, investorUsdc, authority, 100_000_000_000); // 100K USDC
    await mintTo(connection, authority, usdcMint, buyerUsdc, authority, 100_000_000_000);

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
  });

  it("initializes the protocol config", async () => {
    await program.methods
      .initialize(50) // 0.5% protocol fee on the spread
      .accounts({
        config: configPda,
        authority: authority.publicKey,
        treasury: treasuryUsdc,
        usdcMint,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const cfg = await program.account.protocolConfig.fetch(configPda);
    assert.equal(cfg.treasuryFeeBps, 50);
    assert.equal(cfg.invoiceCounter.toNumber(), 0);
  });

  it("lists an invoice from an SME", async () => {
    invoiceId = randomBytes(16);
    [invoicePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("invoice"), invoiceId],
      program.programId
    );
    [nftMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("invoice_nft"), invoiceId],
      program.programId
    );

    const faceValueUsdc = new anchor.BN(10_000_000_000); // 10,000 USDC
    const discountBps = 800; // 8%
    const maturity = new anchor.BN(Math.floor(Date.now() / 1000) + 60 * 24 * 60 * 60); // +60 days
    const driversHash = createHash("sha256").update("mock-shap-explanation").digest();

    await program.methods
      .listInvoice(
        Array.from(invoiceId),
        faceValueUsdc,
        discountBps,
        25,  // risk_score
        1,   // grade B
        maturity,
        Array.from(driversHash)
      )
      .accounts({
        config: configPda,
        invoice: invoicePda,
        nftMint: nftMintPda,
        sme: sme.publicKey,
        buyer: buyer.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([sme])
      .rpc();

    const inv = await program.account.invoice.fetch(invoicePda);
    assert.equal(inv.faceValueUsdc.toNumber(), 10_000_000_000);
    assert.equal(inv.discountedValueUsdc.toNumber(), 9_200_000_000); // 10000 * (1 - 0.08)
    assert.equal(inv.riskScore, 25);
    assert.equal(inv.status, 0); // Listed
  });

  it("investor funds the invoice; SME receives discounted USDC", async () => {
    const smeBalBefore = (await getAccount(connection, smeUsdc)).amount;
    const investorBalBefore = (await getAccount(connection, investorUsdc)).amount;

    await program.methods
      .fundInvoice()
      .accounts({
        config: configPda,
        invoice: invoicePda,
        investor: investor.publicKey,
        investorUsdc,
        sme: sme.publicKey,
        smeUsdc,
        treasuryUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([investor])
      .rpc();

    const smeBalAfter = (await getAccount(connection, smeUsdc)).amount;
    const investorBalAfter = (await getAccount(connection, investorUsdc)).amount;

    assert.equal(Number(smeBalAfter - smeBalBefore), 9_200_000_000); // SME gets discounted value
    assert.isAbove(Number(investorBalBefore - investorBalAfter), 9_200_000_000); // Investor pays slightly more (fee)

    const inv = await program.account.invoice.fetch(invoicePda);
    assert.equal(inv.status, 1); // Funded
    assert.deepEqual(inv.investor.toBase58(), investor.publicKey.toBase58());
  });

  it("buyer settles at maturity; investor receives face value", async () => {
    const investorBalBefore = (await getAccount(connection, investorUsdc)).amount;

    await program.methods
      .settleInvoice()
      .accounts({
        config: configPda,
        invoice: invoicePda,
        payer: buyer.publicKey,
        payerUsdc: buyerUsdc,
        investorUsdc,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    const investorBalAfter = (await getAccount(connection, investorUsdc)).amount;
    assert.equal(Number(investorBalAfter - investorBalBefore), 10_000_000_000); // full face value

    const inv = await program.account.invoice.fetch(invoicePda);
    assert.equal(inv.status, 2); // Settled
  });
});
