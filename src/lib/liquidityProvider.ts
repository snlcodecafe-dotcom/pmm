import { LAMPORTS_PER_SOL, PublicKey, SendTransactionError, Transaction } from "@solana/web3.js";
import { Raydium, TxVersion, CREATE_CPMM_POOL_PROGRAM, CREATE_CPMM_POOL_FEE_ACC, DEVNET_PROGRAM_ID, getCpmmPdaAmmConfigId } from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";
import Decimal from "decimal.js";
import { getConnectionWithFallback, type SolanaNetwork } from "./rpcHelper";

export type AmmType = "raydium-cpmm" | "raydium-amm-v4" | "meteora-dlmm";

export interface AmmOption {
  id: AmmType;
  label: string;
  description: string;
  status: "live" | "coming-soon";
}

export const AMM_OPTIONS: AmmOption[] = [
  {
    id: "raydium-cpmm",
    label: "Raydium CPMM",
    description: "Cheapest, simplest. Best for new memecoins. Live on devnet + mainnet.",
    status: "live",
  },
  {
    id: "raydium-amm-v4",
    label: "Raydium AMM v4",
    description: "Classic Raydium pool with OpenBook market. Higher liquidity reach.",
    status: "coming-soon",
  },
  {
    id: "meteora-dlmm",
    label: "Meteora DLMM",
    description: "Concentrated liquidity bins. Best for tight spreads.",
    status: "coming-soon",
  },
];

export interface CreateCpmmParams {
  network: SolanaNetwork;
  walletPubkey: string;
  tokenMint: string;
  tokenDecimals: number;
  tokenAmount: number; // human units of new token
  solAmount: number; // SOL to pair
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
}

export interface CreateCpmmResult {
  poolId: string;
  lpMint: string;
  signature: string;
}

export const RAYDIUM_CPMM_BUFFER_SOL = 0.18;

export function estimateRaydiumCpmmSolNeeded(solAmount: number): number {
  return solAmount + RAYDIUM_CPMM_BUFFER_SOL;
}

const NATIVE_SOL = "So11111111111111111111111111111111111111112";

/**
 * Creates a Raydium CPMM pool pairing the new token with WSOL.
 * Single browser-signed transaction. Mints LP tokens to the user.
 */
export async function createRaydiumCpmmPool(params: CreateCpmmParams): Promise<CreateCpmmResult> {
  const sign = params.signTransaction
    ?? (((window as any).solana?.signTransaction
      ? (tx: Transaction) => (window as any).solana.signTransaction(tx)
      : null) as ((tx: Transaction) => Promise<Transaction>) | null);
  if (!sign) throw new Error("Wallet not available");

  const { connection } = await getConnectionWithFallback(params.network);
  const owner = new PublicKey(params.walletPubkey);
  const balanceLamports = await connection.getBalance(owner, "confirmed");
  const requiredLamports = Math.ceil(estimateRaydiumCpmmSolNeeded(params.solAmount) * LAMPORTS_PER_SOL);

  if (balanceLamports < requiredLamports) {
    const missingSol = (requiredLamports - balanceLamports) / LAMPORTS_PER_SOL;
    throw new Error(
      `Insufficient SOL for liquidity setup. Wallet balance: ${(balanceLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL. ` +
      `Needed: ${(requiredLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL total ` +
      `(${params.solAmount.toFixed(4)} SOL for liquidity + ~${RAYDIUM_CPMM_BUFFER_SOL.toFixed(2)} SOL for pool rent and fees). ` +
      `Add at least ${missingSol.toFixed(4)} SOL and try again.`
    );
  }

  // Initialize SDK in browser-compatible mode (no signer keypair — we sign client-side)
  let raydium;
  try {
    raydium = await Raydium.load({
      connection,
      owner,
      cluster: params.network === "devnet" ? "devnet" : "mainnet",
      disableFeatureCheck: true,
      disableLoadToken: true,
      blockhashCommitment: "confirmed",
    });
  } catch (err: any) {
    console.error("Raydium.load failed:", err);
    throw new Error(`Failed to initialize Raydium SDK on ${params.network}. RPC may be rate-limited. Try again in a moment. (${err?.message || "unknown"})`);
  }

  let mintAInfo, mintBInfo;
  try {
    mintAInfo = await raydium.token.getTokenInfo(params.tokenMint);
    mintBInfo = await raydium.token.getTokenInfo(NATIVE_SOL);
  } catch (err: any) {
    console.error("getTokenInfo failed:", err);
    throw new Error(`Could not load token info from RPC. Your token mint may not be visible to public RPC yet — wait 30s and retry. (${err?.message || "unknown"})`);
  }

  // Standard CPMM fee config (0.25%)
  const programId = params.network === "devnet" ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM : CREATE_CPMM_POOL_PROGRAM;
  const feeAccount = params.network === "devnet" ? DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC : CREATE_CPMM_POOL_FEE_ACC;
  let feeConfigs;
  try {
    feeConfigs = await raydium.api.getCpmmConfigs();
  } catch (err: any) {
    console.error("getCpmmConfigs failed:", err);
    throw new Error(`Raydium API unreachable. Please retry in a moment. (${err?.message || "unknown"})`);
  }
  const ammConfigId = feeConfigs[0]
    ? new PublicKey(feeConfigs[0].id)
    : getCpmmPdaAmmConfigId(programId, 0).publicKey;

  const tokenAmountRaw = new BN(new Decimal(params.tokenAmount).mul(10 ** params.tokenDecimals).toFixed(0));
  const solAmountRaw = new BN(new Decimal(params.solAmount).mul(1e9).toFixed(0));

  const { transaction, extInfo } = await raydium.cpmm.createPool({
    programId,
    poolFeeAccount: feeAccount,
    mintA: mintAInfo,
    mintB: mintBInfo,
    mintAAmount: tokenAmountRaw,
    mintBAmount: solAmountRaw,
    startTime: new BN(0),
    feeConfig: feeConfigs[0],
    associatedOnly: false,
    ownerInfo: { useSOLBalance: true },
    txVersion: TxVersion.LEGACY,
    computeBudgetConfig: {
      units: 600000,
      microLamports: 50000,
    },
  });

  const tx = transaction as Transaction;
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
  tx.recentBlockhash = blockhash;
  tx.feePayer = owner;

  let signed: Transaction;
  try {
    signed = await sign(tx);
  } catch (error: any) {
    const msg = String(error?.message || error || "");
    if (/user rejected|reject|denied|cancel/i.test(msg)) {
      throw new Error("Transaction was rejected in your wallet. Approve it to create the pool.");
    }
    console.error("Wallet signing failed:", error);
    throw new Error(`Wallet signing failed: ${msg || "unknown error"}`);
  }

  try {
    const sig = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");

    return {
      poolId: extInfo.address.poolId.toBase58(),
      lpMint: extInfo.address.lpMint.toBase58(),
      signature: sig,
    };
  } catch (error) {
    if (error instanceof SendTransactionError) {
      const logs = await error.getLogs(connection).catch(() => [] as string[]);
      const insufficientLog = logs.find((line) => /insufficient lamports/i.test(line));

      if (insufficientLog) {
        const match = insufficientLog.match(/insufficient lamports\s+(\d+),\s+need\s+(\d+)/i);
        if (match) {
          const [, current, needed] = match;
          const missingSol = (Number(needed) - Number(current)) / LAMPORTS_PER_SOL;
          throw new Error(`Insufficient SOL for pool creation. Add ${missingSol.toFixed(4)} SOL and retry.`);
        }
      }

      if (logs.length) {
        throw new Error(`Pool creation failed on-chain: ${logs[logs.length - 1]}`);
      }
    }

    console.error("sendRawTransaction failed:", error);
    throw new Error(`Pool transaction failed: ${(error as any)?.message || "unknown"}`);
  }
}

export function dexscreenerUrl(network: SolanaNetwork, mint: string): string {
  return network === "devnet"
    ? `https://dexscreener.com/solana/${mint}`
    : `https://dexscreener.com/solana/${mint}`;
}
