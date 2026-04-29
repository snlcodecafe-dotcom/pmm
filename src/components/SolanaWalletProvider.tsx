import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { CoinbaseWalletAdapter } from "@solana/wallet-adapter-coinbase";
import { TrustWalletAdapter } from "@solana/wallet-adapter-trust";
import { GlowWalletAdapter } from "@solana/wallet-adapter-glow";
import { TorusWalletAdapter } from "@solana/wallet-adapter-torus";
import "@solana/wallet-adapter-react-ui/styles.css";

// Default endpoint for the WalletProvider (used when devs hit RPC via useConnection()).
// Our token-launch/liquidity code uses getConnectionWithFallback() directly, so this is
// just a baseline default that auto-detects mainnet.
const DEFAULT_ENDPOINT = "https://api.mainnet-beta.solana.com";

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new BackpackWalletAdapter(),
    new CoinbaseWalletAdapter(),
    new TrustWalletAdapter(),
    new GlowWalletAdapter(),
    new TorusWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={DEFAULT_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
