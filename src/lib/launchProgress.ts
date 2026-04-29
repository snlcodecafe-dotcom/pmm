import type { SolanaNetwork } from "@/lib/tokenLauncher";

export type LaunchProgressRecord = {
  id: string;
  mint_address: string;
  token_created: boolean;
  metadata_attached: boolean;
  liquidity_added: boolean;
  liquidity_locked: boolean;
  indexed_dexscreener?: boolean;
  promotion_started: boolean;
};

export type LaunchSharePayload = {
  name: string;
  symbol: string;
  mint: string;
  totalSupply: number;
  liquiditySummary?: string | null;
  lockSummary?: string | null;
  website?: string | null;
  twitter?: string | null;
  telegram?: string | null;
  network: SolanaNetwork;
};

export const buildAlphaMemeSniperUrl = (mintAddress: string) => `https://alphamemesniper.com/token/${mintAddress}`;

export const getLaunchResumeStep = (launch: LaunchProgressRecord) => {
  if (!launch.token_created || !launch.metadata_attached) return 3;
  if (!launch.liquidity_added) return 4;
  if (!launch.liquidity_locked) return 5;
  if (!launch.indexed_dexscreener || !launch.promotion_started) return 6;
  return 7;
};

export const getLaunchNextActionLabel = (launch: LaunchProgressRecord) => {
  if (!launch.token_created || !launch.metadata_attached) return "Continue setup";
  if (!launch.liquidity_added) return "Add liquidity";
  if (!launch.liquidity_locked) return "Lock LP";
  if (!launch.indexed_dexscreener || !launch.promotion_started) return "Finalize";
  return "View details";
};

export const buildLaunchShareMessage = ({
  name,
  symbol,
  mint,
  totalSupply,
  liquiditySummary,
  lockSummary,
  website,
  twitter,
  telegram,
}: LaunchSharePayload) => {
  return [
    `🚀 ${name || "New Token"} (${symbol || "TOKEN"}) is now live on Solana`,
    "",
    `Token Address: ${mint}`,
    `Total Supply: ${totalSupply.toLocaleString()}`,
    liquiditySummary ? `Liquidity: ${liquiditySummary}` : "",
    lockSummary ? `LP Lock: ${lockSummary}` : "",
    website ? `Website: ${website}` : "",
    twitter ? `X: ${twitter}` : "",
    telegram ? `Telegram: ${telegram}` : "",
    `Powered by https://promotemymemes.com`,
  ].filter(Boolean).join("\n");
};