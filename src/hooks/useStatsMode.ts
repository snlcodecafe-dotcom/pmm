import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StatsMode = "fake" | "live";

const LS_KEY = "pm_stats_mode";

export function useStatsMode() {
  const [mode, setMode] = useState<StatsMode>(() => {
    return (localStorage.getItem(LS_KEY) as StatsMode) || "fake";
  });
  const [loading, setLoading] = useState(true);

  // Load from admin_settings
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("admin_settings")
          .select("value")
          .eq("key", "stats_mode")
          .single();
        if (data?.value === "live" || data?.value === "fake") {
          setMode(data.value as StatsMode);
          localStorage.setItem(LS_KEY, data.value);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  return { mode, loading };
}
