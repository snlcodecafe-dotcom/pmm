// ─── Centralized Plan Configuration ─────────────────────────────────────────

export type PlanKey = "starter" | "pro" | "ultra";

export type FeatureName =
  | "homepage_listing"
  | "featured_slot"
  | "telegram_distribution"
  | "discord_distribution"
  | "twitter_posting"
  | "instagram_posting"
  | "reddit_posting"
  | "ai_narrative"
  | "ai_engagement"
  | "real_time_dashboard"
  | "analytics"
  | "report_export"
  | "strategy_selection"
  | "tone_selection";

export type FeatureValue = boolean | "limited" | "standard" | "extended" | "basic" | "enhanced" | "priority" | "advanced" | "full";

export type PlanFeatures = Record<FeatureName, FeatureValue>;

export interface PlanConfig {
  key: PlanKey;
  name: string;
  price: string;
  priceSol: number;
  duration: string;
  durationLabel: string;
  maxCampaignsPerDay: number;
  features: PlanFeatures;
  dbKey: string;
}

export const PLAN_CONFIG: Record<PlanKey, PlanConfig> = {
  starter: {
    key: "starter",
    name: "Starter",
    price: "Free",
    priceSol: 0,
    duration: "10 min",
    durationLabel: "10 minutes",
    maxCampaignsPerDay: 1,
    dbKey: "basic",
    features: {
      homepage_listing: true,
      featured_slot: false,
      telegram_distribution: "limited",
      discord_distribution: false,
      twitter_posting: false,
      instagram_posting: false,
      reddit_posting: false,
      ai_narrative: "basic",
      ai_engagement: false,
      real_time_dashboard: false,
      analytics: "basic",
      report_export: false,
      strategy_selection: false,
      tone_selection: false,
    },
  },
  pro: {
    key: "pro",
    name: "Pro",
    price: "0.1 SOL",
    priceSol: 0.1,
    duration: "3h",
    durationLabel: "3 hours",
    maxCampaignsPerDay: 5,
    dbKey: "advanced",
    features: {
      homepage_listing: true,
      featured_slot: true,
      telegram_distribution: "standard",
      discord_distribution: true,
      twitter_posting: true,
      instagram_posting: true,
      reddit_posting: false,
      ai_narrative: "enhanced",
      ai_engagement: true,
      real_time_dashboard: true,
      analytics: "advanced",
      report_export: false,
      strategy_selection: true,
      tone_selection: true,
    },
  },
  ultra: {
    key: "ultra",
    name: "Ultra",
    price: "0.5 SOL",
    priceSol: 0.5,
    duration: "24h",
    durationLabel: "24 hours",
    maxCampaignsPerDay: 20,
    dbKey: "premium",
    features: {
      homepage_listing: true,
      featured_slot: "priority",
      telegram_distribution: "extended",
      discord_distribution: true,
      twitter_posting: "priority",
      instagram_posting: true,
      reddit_posting: true,
      ai_narrative: "priority",
      ai_engagement: "priority",
      real_time_dashboard: true,
      analytics: "full",
      report_export: true,
      strategy_selection: true,
      tone_selection: true,
    },
  },
};

// Resolve plan from DB promotion_type string
export function planFromDbKey(dbKey: string): PlanKey {
  if (dbKey === "premium") return "ultra";
  if (dbKey === "advanced") return "pro";
  return "starter";
}

// Check if a user's plan grants access to a feature
export function hasFeatureAccess(userPlan: PlanKey, feature: FeatureName): boolean {
  const val = PLAN_CONFIG[userPlan].features[feature];
  return val !== false;
}

// Get minimum plan required for a feature
export function minPlanForFeature(feature: FeatureName): PlanKey {
  if (PLAN_CONFIG.starter.features[feature] !== false) return "starter";
  if (PLAN_CONFIG.pro.features[feature] !== false) return "pro";
  return "ultra";
}

// Feature display labels
export const FEATURE_LABELS: Record<FeatureName, string> = {
  homepage_listing: "Homepage Listing",
  featured_slot: "Featured Slot",
  telegram_distribution: "Telegram Distribution",
  discord_distribution: "Discord Distribution",
  twitter_posting: "Twitter/X Posting",
  instagram_posting: "Instagram Posting",
  reddit_posting: "Reddit Posting",
  ai_narrative: "AI Narrative Engine",
  ai_engagement: "AI Engagement Engine",
  real_time_dashboard: "Real-Time Dashboard",
  analytics: "Analytics",
  report_export: "Report Export",
  strategy_selection: "Strategy Selection",
  tone_selection: "Tone Selection",
};

// ─── Strategy Types ─────────────────────────────────────────────────────────

export type StrategyKey = "viral_pump" | "organic_growth" | "influencer_boost";

export interface StrategyConfig {
  key: StrategyKey;
  name: string;
  icon: string;
  description: string;
  estimatedReach: string;
  engagementPotential: string;
  creditMultiplier: number;
  features: string[];
}

export const STRATEGIES: Record<StrategyKey, StrategyConfig> = {
  viral_pump: {
    key: "viral_pump",
    name: "Viral Pump Mode",
    icon: "🔥",
    description: "Meme-heavy content with high-frequency posting. Best for hype & FOMO.",
    estimatedReach: "50K–200K",
    engagementPotential: "Very High",
    creditMultiplier: 1.2,
    features: [
      "High-frequency posting",
      "FOMO-driven content",
      "Meme-heavy messaging",
      "Rapid social spread",
    ],
  },
  organic_growth: {
    key: "organic_growth",
    name: "Organic Growth Mode",
    icon: "🌱",
    description: "Natural community tone with slower posting. Builds trust and credibility.",
    estimatedReach: "10K–50K",
    engagementPotential: "High",
    creditMultiplier: 1.0,
    features: [
      "Natural community tone",
      "Trust-building content",
      "Slower, steady posting",
      "Long-term growth focus",
    ],
  },
  influencer_boost: {
    key: "influencer_boost",
    name: "Influencer Boost Mode",
    icon: "🚀",
    description: "Influencer-style messaging with authority-driven tone.",
    estimatedReach: "30K–150K",
    engagementPotential: "High",
    creditMultiplier: 1.5,
    features: [
      "Authority-driven tone",
      "Influencer-style messaging",
      "Social proof emphasis",
      "High conversion potential",
    ],
  },
};

// ─── Tone Types ──────────────────────────────────────────────────────────────

export type ToneKey = "degenerate" | "professional" | "meme" | "hype";

export interface ToneConfig {
  key: ToneKey;
  name: string;
  icon: string;
  description: string;
}

export const TONES: Record<ToneKey, ToneConfig> = {
  degenerate: { key: "degenerate", name: "Degenerate", icon: "🎰", description: "Full degen energy, CT slang" },
  professional: { key: "professional", name: "Professional", icon: "💼", description: "Clean, data-driven analysis" },
  meme: { key: "meme", name: "Meme/Funny", icon: "😂", description: "Humor-first, meme culture" },
  hype: { key: "hype", name: "Hype/FOMO", icon: "🚀", description: "Urgency-driven, scarcity" },
};

// ─── Content Types ───────────────────────────────────────────────────────────

export type ContentTypeKey = "text_post" | "thread" | "image_caption" | "short_hook";

export const CONTENT_TYPES: Record<ContentTypeKey, { name: string; icon: string; platforms: string[] }> = {
  text_post: { name: "Text Posts", icon: "📝", platforms: ["Twitter/X", "Telegram", "Discord", "Instagram", "Reddit"] },
  thread: { name: "Threads", icon: "🧵", platforms: ["Twitter/X", "Reddit"] },
  image_caption: { name: "Image Captions", icon: "📸", platforms: ["Instagram"] },
  short_hook: { name: "Short-form Hooks", icon: "⚡", platforms: ["Twitter/X", "Telegram"] },
};

// ─── Dynamic Pricing ─────────────────────────────────────────────────────────

export function calculateDynamicPrice(
  basePriceSol: number,
  platforms: string[],
  strategy: StrategyKey,
  postFrequency: "low" | "medium" | "high" = "medium",
): number {
  if (basePriceSol === 0) return 0; // free plan stays free
  
  const platformMultiplier = 1 + (platforms.length - 1) * 0.1; // +10% per extra platform
  const strategyMultiplier = STRATEGIES[strategy].creditMultiplier;
  const frequencyMultiplier = postFrequency === "low" ? 0.8 : postFrequency === "high" ? 1.3 : 1.0;
  
  return Math.round(basePriceSol * platformMultiplier * strategyMultiplier * frequencyMultiplier * 100) / 100;
}

// ─── Fake / Demo Stats ─────────────────────────────────────────────────────────

export const FAKE_STATS = {
  totalTokens: 2847,
  totalViews: 1_240_000,
  totalRevenue: 142.8,
  activePromotions: 34,
  premiumCount: 89,
  advancedCount: 312,
  basicCount: 2446,
  platformStats: { twitter: 4210, telegram: 8920, discord: 3180, instagram: 2450, reddit: 1890 },
  trendingTokens: [
    { symbol: "BONK", name: "Bonk", mc: "$4.2M", change: "+312%", volume: "892K", holders: 4821, hot: true, age: "2h", img: "🐕" },
    { symbol: "PEPE", name: "PepeSol", mc: "$891K", change: "+187%", volume: "231K", holders: 1243, hot: true, age: "5h", img: "🐸" },
    { symbol: "MOON", name: "MoonShib", mc: "$2.1M", change: "+94%", volume: "445K", holders: 2109, hot: false, age: "12h", img: "🌙" },
    { symbol: "DOGE2", name: "DogeKing", mc: "$312K", change: "+441%", volume: "78K", holders: 892, hot: true, age: "1h", img: "👑" },
    { symbol: "CHAD", name: "ChadToken", mc: "$1.5M", change: "+223%", volume: "567K", holders: 3201, hot: true, age: "3h", img: "💪" },
    { symbol: "FROG", name: "FrogArmy", mc: "$458K", change: "+156%", volume: "123K", holders: 789, hot: false, age: "8h", img: "🐸" },
    { symbol: "APE", name: "SolApe", mc: "$789K", change: "+78%", volume: "234K", holders: 1567, hot: false, age: "1d", img: "🦍" },
    { symbol: "ROCKET", name: "RocketFuel", mc: "$3.1M", change: "+512%", volume: "1.2M", holders: 5432, hot: true, age: "30m", img: "🚀" },
  ],
  leaderboard: [
    { rank: 1, wallet: "7xKX...AsU", points: 12450, badge: "🥇" },
    { rank: 2, wallet: "3h1z...UjX", points: 9820, badge: "🥈" },
    { rank: 3, wallet: "9mNP...nYZ", points: 8340, badge: "🥉" },
    { rank: 4, wallet: "5rFK...xJQ", points: 6120, badge: "4️⃣" },
    { rank: 5, wallet: "4eLb...vK", points: 4890, badge: "5️⃣" },
  ],
  walletActivity: [
    { wallet: "Smart Money 🧠", action: "Bought", token: "BONK", amount: "42.5 SOL", dir: "buy", time: "2m ago" },
    { wallet: "Whale 🐳", action: "Bought", token: "PEPE", amount: "189.2 SOL", dir: "buy", time: "8m ago" },
    { wallet: "Early Adopter ⚡", action: "Sold", token: "DOGE2", amount: "12.1 SOL", dir: "sell", time: "15m ago" },
    { wallet: "Degen Trader 🎰", action: "Bought", token: "MOON", amount: "8.7 SOL", dir: "buy", time: "23m ago" },
    { wallet: "Diamond Hands 💎", action: "Bought", token: "CHAD", amount: "56.3 SOL", dir: "buy", time: "31m ago" },
  ],
};
