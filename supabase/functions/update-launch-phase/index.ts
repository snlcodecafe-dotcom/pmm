import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Updates phase flags + addresses on a token_launch row.
// Trusted by wallet match: only the recorded wallet_address can update its launch.
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      launch_id,
      wallet_address,
      // liquidity
      amm_type,
      pool_address,
      lp_mint,
      base_amount_sol,
      quote_amount_tokens,
      liquidity_added,
      // lock
      lock_provider,
      lock_address,
      lock_unlock_at,
      liquidity_locked,
    } = body || {};

    if (!launch_id || !wallet_address) {
      return new Response(JSON.stringify({ error: "launch_id and wallet_address required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from("token_launches")
      .select("id, wallet_address, network, mint_address, token_symbol, user_id, liquidity_added, liquidity_locked")
      .eq("id", launch_id)
      .single();

    if (fetchErr || !existing) {
      return new Response(JSON.stringify({ error: "Launch not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (existing.wallet_address !== wallet_address) {
      return new Response(JSON.stringify({ error: "Wallet mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (amm_type !== undefined) updates.amm_type = amm_type;
    if (pool_address !== undefined) updates.pool_address = pool_address;
    if (lp_mint !== undefined) updates.lp_mint = lp_mint;
    if (base_amount_sol !== undefined) updates.base_amount_sol = base_amount_sol;
    if (quote_amount_tokens !== undefined) updates.quote_amount_tokens = quote_amount_tokens;
    if (liquidity_added !== undefined) updates.liquidity_added = liquidity_added;
    if (lock_provider !== undefined) updates.lock_provider = lock_provider;
    if (lock_address !== undefined) updates.lock_address = lock_address;
    if (lock_unlock_at !== undefined) updates.lock_unlock_at = lock_unlock_at;
    if (liquidity_locked !== undefined) updates.liquidity_locked = liquidity_locked;

    const { data, error } = await supabase
      .from("token_launches")
      .update(updates)
      .eq("id", launch_id)
      .select()
      .single();

    if (error) throw error;

    // ── Ledger entries for this phase ─────────────────────────────────
    try {
      let solUsd: number | null = null;
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
        const j = await r.json();
        const p = Number(j?.solana?.usd);
        if (Number.isFinite(p) && p > 0) solUsd = p;
      } catch {}
      const usd = (sol: number) => solUsd ? sol * solUsd : null;
      const baseRow = {
        token_address: existing.mint_address,
        token_symbol: existing.token_symbol,
        user_id: existing.user_id,
        wallet_address,
        related_launch_id: launch_id,
        network: existing.network,
        sol_usd_at_time: solUsd,
      };

      // Liquidity (only on first add)
      if (liquidity_added && !existing.liquidity_added && Number(base_amount_sol) > 0) {
        const launchAcct = await supabase.rpc("fin_get_or_create_account", {
          _account_type: "launch", _scope_token: existing.mint_address, _scope_user: null,
          _label: `Launch: ${existing.token_symbol}`,
        });
        await supabase.from("financial_transactions").insert({
          ...baseRow,
          tx_type: "liquidity",
          source: "user", destination: "liquidity_pool",
          amount_sol: Number(base_amount_sol),
          amount_usd_at_time: usd(Number(base_amount_sol)),
          destination_account_id: launchAcct.data,
          notes: `Liquidity added (${amm_type ?? "unknown AMM"})`,
        });
        // Pool creation gas estimate (Raydium CPMM ≈ 0.2 SOL rent-exempt)
        const POOL_GAS = 0.2;
        await supabase.from("financial_transactions").insert({
          ...baseRow,
          tx_type: "gas_fee",
          source: "user", destination: "blockchain",
          amount_sol: POOL_GAS,
          amount_usd_at_time: usd(POOL_GAS),
          notes: "Pool creation rent + fee (estimated)",
        });
      }

      // LP Lock
      if (liquidity_locked && !existing.liquidity_locked) {
        const LOCK_GAS = 0.005;
        await supabase.from("financial_transactions").insert({
          ...baseRow,
          tx_type: "lp_lock",
          source: "user", destination: "blockchain",
          amount_sol: LOCK_GAS,
          amount_usd_at_time: usd(LOCK_GAS),
          tx_signature: lock_address ?? null,
          notes: `LP locked via ${lock_provider ?? "Streamflow"}`,
        });
      }
    } catch (e) {
      console.error("ledger insert (phase) failed:", e);
    }

    return new Response(JSON.stringify({ success: true, launch: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("update-launch-phase error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
