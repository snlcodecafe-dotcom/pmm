import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_CONFIG, PlanKey, PlanConfig } from "@/lib/planConfig";

/**
 * Loads plan overrides from admin_settings (keys: plan_starter, plan_pro, plan_ultra).
 * Merges with hardcoded PLAN_CONFIG defaults so missing fields never break.
 */
export function useDynamicPlans() {
  const [plans, setPlans] = useState<Record<PlanKey, PlanConfig>>({ ...PLAN_CONFIG });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["plan_starter", "plan_pro", "plan_ultra"]);

      if (!data || data.length === 0) {
        setLoading(false);
        return;
      }

      const merged = { ...PLAN_CONFIG };
      const keyMap: Record<string, PlanKey> = {
        plan_starter: "starter",
        plan_pro: "pro",
        plan_ultra: "ultra",
      };

      for (const row of data) {
        const planKey = keyMap[row.key];
        if (!planKey) continue;
        try {
          const override = JSON.parse(row.value) as Partial<PlanConfig>;
          const base = PLAN_CONFIG[planKey];
          merged[planKey] = {
            ...base,
            name: override.name ?? base.name,
            price: override.price ?? base.price,
            priceSol: override.priceSol ?? base.priceSol,
            duration: override.duration ?? base.duration,
            durationLabel: override.durationLabel ?? base.durationLabel,
            maxCampaignsPerDay: override.maxCampaignsPerDay ?? base.maxCampaignsPerDay,
            features: { ...base.features, ...(override.features ?? {}) },
          };
        } catch {
          // ignore bad JSON
        }
      }

      setPlans(merged);
    } catch {
      // fallback to defaults
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { plans, loading, refresh: load };
}
