// Real on-chain NFT mint via SPL Token program (no Anchor wrapper).
// We create a Mint account with decimals=0 and supply=1 → that's effectively an NFT.
// This gives us a real tx signature visible on Solana Explorer, real on-chain proof
// that the invoice has been tokenized. The Anchor program is deployed separately
// and handles the full lifecycle (fund/settle/default) — frontend integration
// of those flows is on the roadmap.

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export interface MintResult {
  mintAddress: string;
  txSignature: string;
  tokenAccount: string;
  explorerUrl: string;
}

/**
 * Mints a real NFT (decimals=0, supply=1) representing an invoice receivable.
 * The mint authority is the user's wallet — they own the NFT after minting.
 *
 * @param connection - Solana RPC connection
 * @param walletPubkey - User's Phantom wallet pubkey (pays fees + becomes owner)
 * @param signTransaction - Phantom's signTransaction method
 */
export async function mintInvoiceNFT(
  connection: Connection,
  walletPubkey: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
): Promise<MintResult> {
  // Generate a new keypair for the mint account.
  // Each invoice NFT has its own unique mint.
  const mintKeypair = Keypair.generate();

  // Get the rent-exempt minimum for a mint account
  const lamports = await getMinimumBalanceForRentExemptMint(connection);

  // The associated token account address (where the NFT will live)
  const associatedTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    walletPubkey,
  );

  const tx = new Transaction().add(
    // 1. Create the mint account
    SystemProgram.createAccount({
      fromPubkey: walletPubkey,
      newAccountPubkey: mintKeypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    // 2. Initialize as a 0-decimal mint (NFT)
    createInitializeMintInstruction(
      mintKeypair.publicKey,
      0, // 0 decimals → NFT semantics
      walletPubkey, // mint authority
      walletPubkey, // freeze authority
    ),
    // 3. Create the associated token account for the user
    createAssociatedTokenAccountInstruction(
      walletPubkey, // payer
      associatedTokenAccount,
      walletPubkey, // owner
      mintKeypair.publicKey,
    ),
    // 4. Mint exactly 1 token (the NFT) to the user
    createMintToInstruction(
      mintKeypair.publicKey,
      associatedTokenAccount,
      walletPubkey,
      1,
    ),
  );

  // Recent blockhash and fee payer
  const { blockhash } = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = walletPubkey;

  // The mint keypair must partially sign (since it's a new account being created)
  tx.partialSign(mintKeypair);

  // Phantom signs as the user
  const signedTx = await signTransaction(tx);

  // Send and confirm
  const signature = await connection.sendRawTransaction(signedTx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
  }, "confirmed");

  const explorerUrl = `https://explorer.solana.com/address/${mintKeypair.publicKey.toBase58()}?cluster=devnet`;

  return {
    mintAddress: mintKeypair.publicKey.toBase58(),
    txSignature: signature,
    tokenAccount: associatedTokenAccount.toBase58(),
    explorerUrl,
  };
}

/** Solana Explorer URL helpers */
export function explorerTx(signature: string, cluster: "devnet" | "mainnet-beta" = "devnet") {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}

export function explorerAddress(address: string, cluster: "devnet" | "mainnet-beta" = "devnet") {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}
