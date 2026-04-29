// Backwards-compatible wrapper around @solana/wallet-adapter-react.
// Existing code that imports { wallet, connect, disconnect, sendSol } continues to work.
// Now supports Phantom, Solflare, Backpack, Coinbase, Trust, Glow, Torus.
import { useMemo, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnectionWithFallback } from "@/lib/rpcHelper";

export type WalletState = {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  walletName: string | null;
};

export function useSolanaWallet() {
  const { publicKey, connected, connecting, disconnect: adapterDisconnect, wallet: adapterWallet, signTransaction, signAllTransactions } = useWallet();
  const { setVisible } = useWalletModal();

  const wallet: WalletState = useMemo(() => ({
    connected,
    publicKey: publicKey ? publicKey.toBase58() : null,
    connecting,
    walletName: adapterWallet?.adapter.name ?? null,
  }), [connected, publicKey, connecting, adapterWallet]);

  const connect = useCallback(async () => {
    setVisible(true);
  }, [setVisible]);

  const disconnect = useCallback(async () => {
    try { await adapterDisconnect(); } catch {}
  }, [adapterDisconnect]);

  const sendSol = useCallback(async (toAddress: string, amountSol: number): Promise<string | null> => {
    if (!publicKey || !signTransaction) throw new Error("Wallet not connected");

    // Try mainnet by default for payments. If tx is meant for devnet, callers should use payment helpers there.
    const { connection } = await getConnectionWithFallback("mainnet");
    const fromPubkey = publicKey;
    const toPubkey = new PublicKey(toAddress);
    const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey, toPubkey, lamports })
    );
    tx.recentBlockhash = blockhash;
    tx.feePayer = fromPubkey;

    const signedTx = (await signTransaction(tx)) as Transaction;
    const sig = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    return sig;
  }, [publicKey, signTransaction]);

  return { wallet, connect, disconnect, sendSol, signTransaction, signAllTransactions };
}
