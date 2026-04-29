import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Launch = {
  id: string;
  mint_address: string;
  network: string;
  token_symbol: string;
  token_name: string;
  logo_url: string | null;
  wallet_address: string;
  indexed_dexscreener: boolean;
  indexed_jupiter: boolean;
  promotion_started: boolean;
  auto_promo_submission_id: string | null;
};

async function checkDexscreener(mint: string): Promise<boolean> {
  try {
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
    if (!r.ok) return false;
    const j = await r.json();
    return Array.isArray(j?.pairs) && j.pairs.length > 0;
  } catch {
    return false;
  }
}

async function checkJupiter(mint: string): Promise<boolean> {
  try {
    const r = await fetch(`https://tokens.jup.ag/token/${mint}`);
    return r.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Pull launches that have liquidity but aren't fully indexed yet
    const { data: launches, error } = await supabase
      .from("token_launches")
      .select("id, mint_address, network, token_symbol, token_name, logo_url, wallet_address, indexed_dexscreener, indexed_jupiter, promotion_started, auto_promo_submission_id")
      .eq("liquidity_added", true)
      .or("indexed_dexscreener.eq.false,indexed_jupiter.eq.false,promotion_started.eq.false")
      .limit(50);

    if (error) throw error;

    const results: any[] = [];

    for (const l of (launches as Launch[]) || []) {
      // Only check mainnet against external indexers (devnet won't be there)
      const isMainnet = l.network === "mainnet";

      const dex = isMainnet ? (l.indexed_dexscreener || await checkDexscreener(l.mint_address)) : true;
      const jup = isMainnet ? (l.indexed_jupiter || await checkJupiter(l.mint_address)) : true;

      const updates: Record<string, any> = {
        indexed_dexscreener: dex,
        indexed_jupiter: jup,
        last_indexing_check_at: new Date().toISOString(),
      };

      // Auto-create promotion submission once indexed
      let promoSubmissionId = l.auto_promo_submission_id;
      if (dex && !l.promotion_started && !promoSubmissionId) {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        const { data: sub, error: subErr } = await supabase
          .from("token_submissions")
          .insert({
            token_address: l.mint_address,
            token_symbol: l.token_symbol,
            token_name: l.token_name,
            promotion_type: "basic",
            price_sol: 0,
            wallet_address: l.wallet_address,
            status: "active",
            campaign_status: "queued",
            expires_at: expiresAt,
            services_delivered: {
              listed: true,
              platforms: ["telegram"],
              featured: false,
              priority: false,
              duration_minutes: 10,
              auto_launched: true,
            },
          })
          .select("id")
          .single();

        if (!subErr && sub) {
          promoSubmissionId = sub.id;
          updates.auto_promo_submission_id = sub.id;
          updates.promotion_started = true;

          // Fire-and-forget execute-campaign
          fetch(`${supabaseUrl}/functions/v1/execute-campaign`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              submissionId: sub.id,
              tokenSymbol: l.token_symbol,
              tokenAddress: l.mint_address,
              platforms: ["telegram"],
              promotionType: "basic",
            }),
          }).catch((e) => console.error("execute-campaign trigger failed:", e));
        }
      }

      await supabase.from("token_launches").update(updates).eq("id", l.id);

      results.push({ id: l.id, mint: l.mint_address, dex, jup, promo: !!promoSubmissionId });
    }

    return new Response(JSON.stringify({ checked: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("check-indexing error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
