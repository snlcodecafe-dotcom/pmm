// Records ad-hoc launch-related transactions (authority revoke, indexer submission)
// triggered after the user signs them in the browser.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED = new Set(["authority_revoke", "indexer_submission", "metadata_pin"]);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      launch_id, wallet_address, mint_address, token_symbol,
      tx_type, amount_sol, tx_signature, notes,
    } = body || {};

    if (!ALLOWED.has(tx_type)) {
      return new Response(JSON.stringify({ error: "tx_type not allowed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!wallet_address || !mint_address) {
      return new Response(JSON.stringify({ error: "wallet_address + mint_address required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const amt = Number(amount_sol);
    if (!Number.isFinite(amt) || amt < 0 || amt > 10) {
      return new Response(JSON.stringify({ error: "invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve user_id + verify ownership against the launch
    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth) {
      const t = auth.replace("Bearer ", "");
      const { data: u } = await supabase.auth.getUser(t);
      if (u.user) userId = u.user.id;
    }

    // Ownership check via launch row
    const { data: launchRow } = await supabase.from("token_launches")
      .select("id, wallet_address, network, token_symbol, user_id")
      .eq("mint_address", mint_address).maybeSingle();
    if (!launchRow || launchRow.wallet_address !== wallet_address) {
      return new Response(JSON.stringify({ error: "Launch not found or wallet mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // SOL/USD snapshot
    let solUsd: number | null = null;
    try {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
      const j = await r.json();
      const p = Number(j?.solana?.usd);
      if (Number.isFinite(p) && p > 0) solUsd = p;
    } catch {}

    const { error } = await supabase.from("financial_transactions").insert({
      tx_type,
      source: "user", destination: "blockchain",
      amount_sol: amt,
      sol_usd_at_time: solUsd,
      amount_usd_at_time: solUsd ? amt * solUsd : null,
      token_address: mint_address,
      token_symbol: token_symbol ?? launchRow.token_symbol,
      user_id: userId ?? launchRow.user_id,
      wallet_address,
      related_launch_id: launchRow.id,
      network: launchRow.network,
      tx_signature: tx_signature ?? null,
      notes: notes ?? null,
    });
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("record-tx-event error:", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
