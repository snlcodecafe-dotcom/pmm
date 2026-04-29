import { PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { SolanaStreamClient, ICluster, getBN } from "@streamflow/stream";
import { type SolanaNetwork } from "./tokenLauncher";
import { getRpcEndpoints } from "./rpcHelper";

export interface LockLpParams {
  network: SolanaNetwork;
  walletPubkey: string;
  lpMint: string;
  lpDecimals?: number;
  amount: number; // human units of LP token
  durationDays: number;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
}

export interface LockLpResult {
  streamId: string;
  unlockAt: string;
  signature: string;
}

/**
 * Picks the first reachable RPC endpoint for the network (skips ones that 403/429).
 */
async function pickWorkingRpc(network: SolanaNetwork): Promise<string> {
  const endpoints = await getRpcEndpoints(network);
  for (const ep of endpoints) {
    try {
      const r = await fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }),
      });
      if (r.ok) {
        const j = await r.json().catch(() => null);
        if (j && !j.error) return ep;
      }
    } catch { /* try next */ }
  }
  // Last-resort: return the first endpoint anyway and let the caller surface the error
  return endpoints[0];
}

/**
 * Locks LP tokens via Streamflow as a self-stream with a cliff = full duration.
 * The recipient is the same wallet, so funds become withdrawable only after the cliff.
 */
export async function lockLpWithStreamflow(params: LockLpParams): Promise<LockLpResult> {
  const winSolana = (window as any).solana;
  const signTransaction = params.signTransaction
    ?? (winSolana?.signTransaction ? (tx: Transaction) => winSolana.signTransaction(tx) : null);
  const signAllTransactions = params.signAllTransactions
    ?? (winSolana?.signAllTransactions ? (txs: Transaction[]) => winSolana.signAllTransactions(txs) : undefined);
  if (!signTransaction) throw new Error("Wallet not available");

  const cluster = params.network === "devnet" ? ICluster.Devnet : ICluster.Mainnet;
  const rpcUrl = await pickWorkingRpc(params.network);
  const client = new SolanaStreamClient(rpcUrl, cluster, "confirmed" as any);

  const decimals = params.lpDecimals ?? 9;
  const rawAmount = getBN(params.amount, decimals);
  const startTs = Math.floor(Date.now() / 1000) + 60;
  const cliffSeconds = params.durationDays * 24 * 60 * 60;

  const createParams = {
    recipient: params.walletPubkey,
    tokenId: params.lpMint,
    start: startTs,
    amount: rawAmount,
    period: 1,
    cliff: startTs + cliffSeconds,
    cliffAmount: rawAmount,
    amountPerPeriod: rawAmount,
    name: "PromoteMyMemes LP Lock",
    canTopup: false,
    cancelableBySender: false,
    cancelableByRecipient: false,
    transferableBySender: false,
    transferableByRecipient: false,
    automaticWithdrawal: false,
    withdrawalFrequency: 0,
  };

  const sender: any = {
    publicKey: new PublicKey(params.walletPubkey),
    signTransaction,
    signAllTransactions,
  };

  const result: any = await (client as any).create(createParams, { sender });

  return {
    streamId: result?.metadataId?.toString?.() || result?.metadata || "",
    unlockAt: new Date((startTs + cliffSeconds) * 1000).toISOString(),
    signature: result?.txId || "",
  };
}

export function streamflowExplorerUrl(network: SolanaNetwork, streamId: string): string {
  const base = network === "devnet"
    ? "https://app.streamflow.finance/contract/solana/devnet"
    : "https://app.streamflow.finance/contract/solana/mainnet";
  return `${base}/${streamId}`;
}
