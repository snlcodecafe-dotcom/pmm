import {
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createInitializeMint2Instruction,
  getMinimumBalanceForRentExemptMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
} from "@solana/spl-token";
import { getConnectionWithFallback, type SolanaNetwork } from "@/lib/rpcHelper";

export type { SolanaNetwork };

// A minimal signer interface fulfilled by any wallet adapter (Phantom, Solflare,
// Backpack, Coinbase, Trust, Glow, Torus). We pass this in from the UI instead
// of reaching for window.solana so we honor whichever wallet the user connected.
export type WalletSigner = (tx: Transaction) => Promise<Transaction>;

function resolveSigner(signer?: WalletSigner): WalletSigner {
  if (signer) return signer;
  const solana = (window as any).solana;
  if (solana?.signTransaction) return (tx: Transaction) => solana.signTransaction(tx);
  throw new Error("Wallet not available");
}

// Legacy export kept for backwards compat — prefer getConnectionWithFallback() / getRpcUrl()
export const RPC_URLS: Record<SolanaNetwork, string> = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

// Metaplex Token Metadata Program
const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

function findMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID,
  );
  return pda;
}

// Borsh-ish encoding for CreateMetadataAccountV3 (instruction discriminator 33)
function encodeString(s: string): Buffer {
  const buf = Buffer.from(s, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(buf.length, 0);
  return Buffer.concat([len, buf]);
}

function buildCreateMetadataV3Ix(args: {
  metadata: PublicKey;
  mint: PublicKey;
  mintAuthority: PublicKey;
  payer: PublicKey;
  updateAuthority: PublicKey;
  name: string;
  symbol: string;
  uri: string;
}): TransactionInstruction {
  const sellerFeeBasisPoints = 0;
  const isMutable = 1;
  const collectionPresent = 0;
  const usesPresent = 0;
  const collectionDetailsPresent = 0;

  // DataV2: name, symbol, uri, seller_fee_basis_points (u16), creators (Option<Vec>), collection (Option), uses (Option)
  const data = Buffer.concat([
    encodeString(args.name),
    encodeString(args.symbol),
    encodeString(args.uri),
    Buffer.from([sellerFeeBasisPoints & 0xff, (sellerFeeBasisPoints >> 8) & 0xff]),
    Buffer.from([0]), // creators: None
    Buffer.from([collectionPresent]), // collection: None
    Buffer.from([usesPresent]), // uses: None
  ]);

  const ixData = Buffer.concat([
    Buffer.from([33]), // CreateMetadataAccountV3 discriminator
    data,
    Buffer.from([isMutable]),
    Buffer.from([collectionDetailsPresent]),
  ]);

  return new TransactionInstruction({
    programId: METADATA_PROGRAM_ID,
    keys: [
      { pubkey: args.metadata, isSigner: false, isWritable: true },
      { pubkey: args.mint, isSigner: false, isWritable: false },
      { pubkey: args.mintAuthority, isSigner: true, isWritable: false },
      { pubkey: args.payer, isSigner: true, isWritable: true },
      { pubkey: args.updateAuthority, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: ixData,
  });
}

export interface LaunchParams {
  network: SolanaNetwork;
  walletPubkey: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number; // human-readable units
  metadataUri?: string; // IPFS uri (set after pinning)
  revokeMintAuthority?: boolean;
  signTransaction?: WalletSigner;
}

export interface LaunchResult {
  mintAddress: string;
  signature: string;
}

/**
 * Builds and sends a single transaction that:
 *   - creates a new SPL mint
 *   - creates the user's associated token account
 *   - mints the entire supply to the user
 *   - (optionally) revokes mint authority
 *   - attaches Metaplex metadata (if metadataUri provided)
 * Returns the mint address and tx signature.
 */
export async function createTokenWithMetadata(params: LaunchParams): Promise<LaunchResult> {
  const sign = resolveSigner(params.signTransaction);

  const { connection } = await getConnectionWithFallback(params.network);
  const payer = new PublicKey(params.walletPubkey);

  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const ata = await getAssociatedTokenAddress(mint, payer);

  // raw amount = totalSupply * 10^decimals
  const rawAmount = BigInt(Math.floor(params.totalSupply)) * BigInt(10) ** BigInt(params.decimals);

  const ixs: TransactionInstruction[] = [
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMint2Instruction(mint, params.decimals, payer, payer),
    createAssociatedTokenAccountInstruction(payer, ata, payer, mint),
    createMintToInstruction(mint, ata, payer, rawAmount),
  ];

  if (params.metadataUri) {
    ixs.push(
      buildCreateMetadataV3Ix({
        metadata: findMetadataPda(mint),
        mint,
        mintAuthority: payer,
        payer,
        updateAuthority: payer,
        name: params.name,
        symbol: params.symbol,
        uri: params.metadataUri,
      }),
    );
  }

  if (params.revokeMintAuthority) {
    ixs.push(createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null));
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction().add(...ixs);
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;
  tx.partialSign(mintKeypair);

  const signed = await sign(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

  return { mintAddress: mint.toBase58(), signature: sig };
}

/**
 * Attaches Metaplex metadata to an EXISTING mint via CreateMetadataAccountV3.
 * Requires the connected wallet to currently hold the mint authority.
 * Returns the transaction signature.
 */
export async function attachMetadataToExistingMint(params: {
  network: SolanaNetwork;
  walletPubkey: string;
  mintAddress: string;
  name: string;
  symbol: string;
  uri: string;
  signTransaction?: WalletSigner;
}): Promise<{ signature: string; metadataPda: string }> {
  const sign = resolveSigner(params.signTransaction);

  const { connection } = await getConnectionWithFallback(params.network);
  const payer = new PublicKey(params.walletPubkey);
  const mint = new PublicKey(params.mintAddress);
  const metadataPda = findMetadataPda(mint);

  // Refuse if metadata account already exists (use update flow instead — out of scope here)
  const existing = await connection.getAccountInfo(metadataPda);
  if (existing) {
    throw new Error("Metadata account already exists for this mint. Use an update flow instead.");
  }

  const ix = buildCreateMetadataV3Ix({
    metadata: metadataPda,
    mint,
    mintAuthority: payer,
    payer,
    updateAuthority: payer,
    name: params.name,
    symbol: params.symbol,
    uri: params.uri,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction().add(ix);
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  const signed = await sign(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

  return { signature: sig, metadataPda: metadataPda.toBase58() };
}

export function explorerUrl(network: SolanaNetwork, address: string, type: "address" | "tx" = "address"): string {
  const base = "https://solscan.io";
  const cluster = network === "devnet" ? "?cluster=devnet" : "";
  return `${base}/${type === "tx" ? "tx" : "token"}/${address}${cluster}`;
}

// ─── Authority revoke (mint + freeze) — final lock step ────────────────
export async function revokeAuthorities(params: {
  network: SolanaNetwork;
  walletPubkey: string;
  mintAddress: string;
  revokeMint?: boolean;
  revokeFreeze?: boolean;
  signTransaction?: WalletSigner;
}): Promise<{ signature: string }> {
  const sign = resolveSigner(params.signTransaction);
  const { connection } = await getConnectionWithFallback(params.network);
  const payer = new PublicKey(params.walletPubkey);
  const mint = new PublicKey(params.mintAddress);

  const ixs: TransactionInstruction[] = [];
  if (params.revokeMint !== false) {
    ixs.push(createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null));
  }
  if (params.revokeFreeze !== false) {
    ixs.push(createSetAuthorityInstruction(mint, payer, AuthorityType.FreezeAccount, null));
  }
  if (ixs.length === 0) throw new Error("Nothing to revoke");

  // Pre-flight balance check — surfaces a clear error instead of the cryptic
  // "Attempt to debit an account but found no record of a prior credit" message
  // that Solana returns when the fee-payer has never received any SOL.
  const balance = await connection.getBalance(payer, "confirmed");
  if (balance < 5_000) {
    throw new Error(
      `Fee-payer wallet ${payer.toBase58().slice(0, 4)}…${payer.toBase58().slice(-4)} has 0 SOL on ${params.network}. ` +
      `Send a small amount of SOL (≥ 0.001) to this wallet to cover transaction fees, then retry. ` +
      `Make sure you're connected with the same wallet that created the token.`
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction().add(...ixs);
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;
  const signed = await sign(tx);
  const sig = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
  return { signature: sig };
}

// ─── Metadata verification engine ──────────────────────────────────────
export type MetadataVerification = {
  ok: boolean;
  exists: boolean;
  updateAuthorityIsUser: boolean;
  name: string | null;
  symbol: string | null;
  uri: string | null;
  imageUrl: string | null;
  imageLoads: boolean;
  fieldsComplete: boolean;
  errors: string[];
};

function parseMetadataAccount(data: Uint8Array): { updateAuthority: string; name: string; symbol: string; uri: string } | null {
  try {
    // layout: key(1) + updateAuthority(32) + mint(32) + name(string) + symbol(string) + uri(string) ...
    let o = 1;
    const updateAuthority = new PublicKey(data.slice(o, o + 32)).toBase58(); o += 32;
    o += 32; // mint
    const readString = () => {
      const len = new DataView(data.buffer, data.byteOffset + o, 4).getUint32(0, true); o += 4;
      const raw = new TextDecoder().decode(data.slice(o, o + len)); o += len;
      return raw.replace(/\0+$/g, "").trim();
    };
    const name = readString();
    const symbol = readString();
    const uri = readString();
    return { updateAuthority, name, symbol, uri };
  } catch {
    return null;
  }
}

export async function verifyMetadataOnChain(params: {
  network: SolanaNetwork;
  walletPubkey: string;
  mintAddress: string;
}): Promise<MetadataVerification> {
  const errors: string[] = [];
  const out: MetadataVerification = {
    ok: false, exists: false, updateAuthorityIsUser: false,
    name: null, symbol: null, uri: null, imageUrl: null,
    imageLoads: false, fieldsComplete: false, errors,
  };

  try {
    const { connection } = await getConnectionWithFallback(params.network);
    const mint = new PublicKey(params.mintAddress);
    const pda = findMetadataPda(mint);
    const acc = await connection.getAccountInfo(pda);
    if (!acc) { errors.push("Metadata account does not exist on-chain."); return out; }
    out.exists = true;
    const parsed = parseMetadataAccount(acc.data);
    if (!parsed) { errors.push("Metadata account could not be decoded."); return out; }
    out.name = parsed.name; out.symbol = parsed.symbol; out.uri = parsed.uri;
    out.updateAuthorityIsUser = parsed.updateAuthority === params.walletPubkey;
    if (!out.updateAuthorityIsUser) errors.push("Update authority is not your wallet — you cannot edit metadata.");
    out.fieldsComplete = !!(parsed.name && parsed.symbol && parsed.uri);
    if (!out.fieldsComplete) errors.push("Metadata fields incomplete (name/symbol/uri).");

    if (parsed.uri) {
      try {
        const r = await fetch(parsed.uri);
        if (r.ok) {
          const j = await r.json().catch(() => null);
          out.imageUrl = j?.image || null;
          if (out.imageUrl) {
            try {
              const i = await fetch(out.imageUrl, { method: "HEAD" });
              out.imageLoads = i.ok;
              if (!i.ok) errors.push("Logo image URL did not return OK.");
            } catch { errors.push("Logo image URL is unreachable."); }
          } else {
            errors.push("Off-chain JSON has no image field.");
          }
        } else {
          errors.push("Metadata JSON URI did not return OK.");
        }
      } catch {
        errors.push("Could not fetch off-chain metadata JSON.");
      }
    }
  } catch (e: any) {
    errors.push(e?.message || "Metadata verification failed.");
  }

  out.ok = out.exists && out.updateAuthorityIsUser && out.fieldsComplete && out.imageLoads;
  return out;
}

// ─── Mint authority status (for guards & scoring) ──────────────────────
export async function getMintAuthorityStatus(params: { network: SolanaNetwork; mintAddress: string }):
  Promise<{ mintAuthorityNull: boolean; freezeAuthorityNull: boolean; mintAuthority: string | null; freezeAuthority: string | null }> {
  const { connection } = await getConnectionWithFallback(params.network);
  const info = await connection.getParsedAccountInfo(new PublicKey(params.mintAddress));
  const parsed: any = (info.value?.data as any)?.parsed?.info;
  const mintAuthority = parsed?.mintAuthority ?? null;
  const freezeAuthority = parsed?.freezeAuthority ?? null;
  return {
    mintAuthority,
    freezeAuthority,
    mintAuthorityNull: !mintAuthority,
    freezeAuthorityNull: !freezeAuthority,
  };
}

// ─── Indexing status (live, single mint) ───────────────────────────────
export type IndexingStatus = {
  dexscreener: boolean;
  jupiter: boolean;
  raydium: boolean;
  state: "NOT_INDEXED" | "PARTIAL" | "FULLY_INDEXED";
  pairUrl?: string;
};

export async function getIndexingStatus(mint: string): Promise<IndexingStatus> {
  const out: IndexingStatus = { dexscreener: false, jupiter: false, raydium: false, state: "NOT_INDEXED" };
  await Promise.all([
    (async () => {
      try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        if (r.ok) {
          const j = await r.json();
          if (Array.isArray(j?.pairs) && j.pairs.length > 0) {
            out.dexscreener = true;
            const pair = j.pairs[0];
            out.pairUrl = pair?.url;
            if (typeof pair?.dexId === "string" && pair.dexId.toLowerCase().includes("raydium")) out.raydium = true;
          }
        }
      } catch { /* noop */ }
    })(),
    (async () => {
      try {
        const r = await fetch(`https://tokens.jup.ag/token/${mint}`);
        out.jupiter = r.ok;
      } catch { /* noop */ }
    })(),
  ]);
  const count = [out.dexscreener, out.jupiter, out.raydium].filter(Boolean).length;
  out.state = count === 0 ? "NOT_INDEXED" : count >= 2 ? "FULLY_INDEXED" : "PARTIAL";
  return out;
}

