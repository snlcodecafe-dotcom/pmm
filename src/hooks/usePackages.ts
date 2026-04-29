import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PackageConfig {
  key: string;
  name: string;
  price: string;
  priceSol: number;
  duration: string;
  color: string;
  popular: boolean;
  features: string[];
  deliverables: string;
  platforms: string[];
  icon: string;
  dbPromotionType: string;
}

const DEFAULT_PACKAGES: PackageConfig[] = [
  {
    key: "starter", name: "Starter", price: "Free", priceSol: 0, duration: "10 minutes",
    color: "var(--cyan)", popular: false, icon: "🟢", dbPromotionType: "basic",
    features: [
      "Homepage listing (limited duration)",
      "AI-generated Telegram post",
      "Community distribution (internal)",
      "Basic analytics summary",
    ],
    deliverables: "AI-generated post + community distribution",
    platforms: ["Telegram"],
  },
  {
    key: "pro", name: "Pro", price: "0.1 SOL", priceSol: 0.1, duration: "3 hours",
    color: "var(--purple)", popular: true, icon: "🔵", dbPromotionType: "advanced",
    features: [
      "Featured homepage placement (3h)",
      "Multi-platform boost (X + Telegram + Discord + Instagram)",
      "AI engagement engine active",
      "Live campaign dashboard",
      "Strategy selection (Viral / Organic / Influencer)",
    ],
    deliverables: "Multi-platform AI-driven promotion with strategy",
    platforms: ["Twitter/X", "Telegram", "Discord", "Instagram"],
  },
  {
    key: "ultra", name: "Ultra", price: "0.5 SOL", priceSol: 0.5, duration: "24 hours",
    color: "var(--cyan)", popular: false, icon: "🟡", dbPromotionType: "premium",
    features: [
      "Top homepage placement (24h)",
      "All 5 platforms (X + TG + Discord + IG + Reddit)",
      "Priority promotion scheduling",
      "Full analytics report + export",
      "Campaign orchestration (24h pacing)",
      "All strategies & tones unlocked",
    ],
    deliverables: "Priority 24h promotion across all 5 platforms",
    platforms: ["Twitter/X", "Telegram", "Discord", "Instagram", "Reddit"],
  },
];

export { DEFAULT_PACKAGES };

export function usePackages() {
  const [packages, setPackages] = useState<PackageConfig[]>(DEFAULT_PACKAGES);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "packages_config")
        .single();

      if (data?.value) {
        const parsed = JSON.parse(data.value) as PackageConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPackages(parsed);
        }
      }
    } catch {
      // fallback to defaults
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { packages, loading, refresh: load };
}
