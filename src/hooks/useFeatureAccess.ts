import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PlanKey, FeatureName, hasFeatureAccess } from "@/lib/planConfig";

const LS_KEY = "pm_wallet_pubkey";

export function useFeatureAccess() {
  const [userPlan, setUserPlan] = useState<PlanKey>("starter");
  const [loading, setLoading] = useState(true);

  const resolve = useCallback(async () => {
    const walletKey = localStorage.getItem(LS_KEY);
    if (!walletKey) {
      setUserPlan("starter");
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from("token_submissions")
        .select("promotion_type")
        .eq("wallet_address", walletKey);
      if (data && data.length > 0) {
        if (data.some(t => t.promotion_type === "premium")) setUserPlan("ultra");
        else if (data.some(t => t.promotion_type === "advanced")) setUserPlan("pro");
        else setUserPlan("starter");
      } else {
        setUserPlan("starter");
      }
    } catch {
      setUserPlan("starter");
    }
    setLoading(false);
  }, []);

  useEffect(() => { resolve(); }, [resolve]);

  const canAccess = useCallback(
    (feature: FeatureName) => hasFeatureAccess(userPlan, feature),
    [userPlan]
  );

  return { userPlan, canAccess, loading, refresh: resolve };
}
