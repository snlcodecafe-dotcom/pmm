import type { LucideIcon } from "lucide-react";
import { BarChart3, Megaphone, Rocket, Waves } from "lucide-react";

export type TokenLaunch = {
  id: string;
  token_name: string;
  token_symbol: string;
  mint_address: string;
  network: string;
  wallet_address: string;
  logo_url: string | null;
  total_supply?: number;
  decimals?: number;
  description?: string | null;
  website?: string | null;
  twitter?: string | null;
  telegram?: string | null;
  pool_address?: string | null;
  lock_unlock_at?: string | null;
  base_amount_sol?: number | null;
  quote_amount_tokens?: number | null;
  token_created: boolean;
  metadata_attached: boolean;
  liquidity_added: boolean;
  liquidity_locked: boolean;
  indexed_dexscreener?: boolean;
  indexed_jupiter?: boolean;
  promotion_started: boolean;
  created_at: string;
};

export type TokenSubmission = {
  id: string;
  token_name: string | null;
  token_symbol: string | null;
  token_address: string;
  promotion_type: string;
  status: string;
  campaign_status: string;
  price_sol: number;
  views: number | null;
  engagement_score: number | null;
  created_at: string;
};

export type ActivityItem = {
  id: string;
  title: string;
  detail: string;
  created_at: string;
  kind: "launch" | "campaign";
};

export type OnboardingStep = {
  label: string;
  to: string;
  icon: LucideIcon;
  description: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  { label: "Create Token", to: "/launch-token", icon: Rocket, description: "Set up your token details and metadata." },
  { label: "Add Liquidity", to: "/launch-token", icon: Waves, description: "Prepare pool depth so buyers can enter smoothly." },
  { label: "Start Promotion", to: "/campaign-engine", icon: Megaphone, description: "Launch your first campaign package and targeting." },
  { label: "Track Results", to: "/dashboard#campaign-performance", icon: BarChart3, description: "Review views, reach, and next actions from one place." },
];

export const formatAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const shorten = (value: string) => `${value.slice(0, 6)}...${value.slice(-6)}`;