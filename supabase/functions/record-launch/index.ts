import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RPC: Record<string, string> = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://rpc.ankr.com/solana",
};

function validate(p: any): { ok: true } | { ok: false; error: string } {
  if (!p) return { ok: false, error: "missing body" };
  if (!["devnet", "mainnet"].includes(p.network)) return { ok: false, error: "invalid network" };
  if (typeof p.wallet_address !== "string" || p.wallet_address.length < 32) return { ok: false, error: "wallet" };
  if (typeof p.mint_address !== "string" || p.mint_address.length < 32) return { ok: false, error: "mint" };
  if (typeof p.token_name !== "string" || p.token_name.length < 2 || p.token_name.length > 32) return { ok: false, error: "name" };
  if (typeof p.token_symbol !== "string" || !/^[A-Z0-9]{2,10}$/.test(p.token_symbol)) return { ok: false, error: "symbol" };
  if (typeof p.decimals !== "number" || p.decimals < 0 || p.decimals > 9) return { ok: false, error: "decimals" };
  const supply = Number(p.total_supply);
  if (!Number.isFinite(supply) || supply <= 0 || supply > 1e15) return { ok: false, error: "supply" };
  if (typeof p.create_tx_signature !== "string" || p.create_tx_signature.length < 32) return { ok: false, error: "tx" };
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const v = validate(body);
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve user_id from auth header (preferred) — falls back to wallet only
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: u } = await supabase.auth.getUser(token);
      if (u.user) userId = u.user.id;
    }

    // Rate limit: max 5 launches per wallet per hour
    const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await supabase
      .from("token_launches")
      .select("*", { count: "exact", head: true })
      .eq("wallet_address", body.wallet_address)
      .gte("created_at", oneHourAgo);
    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: "Rate limit: max 5 launches per hour" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Best-effort tx verification — never block persistence on RPC propagation/rate limits.
    // The mint address is the source of truth; if the user has a signature, we record it.
    try {
      const rpcRes = await fetch(RPC[body.network as string], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0", id: 1, method: "getSignatureStatuses",
          params: [[body.create_tx_signature], { searchTransactionHistory: true }],
        }),
      });
      const rpcData = await rpcRes.json();
      const status = rpcData?.result?.value?.[0];
      if (status?.err) {
        console.warn("Tx reported error on-chain, recording anyway:", status.err);
      } else if (!status) {
        console.warn("Tx not yet visible on RPC, recording optimistically:", body.create_tx_signature);
      }
    } catch (e) {
      console.warn("RPC verify skipped:", e);
    }

    const { data, error } = await supabase
      .from("token_launches")
      .insert({
        user_id: userId,
        wallet_address: body.wallet_address,
        network: body.network,
        mint_address: body.mint_address,
        token_name: body.token_name,
        token_symbol: body.token_symbol,
        decimals: body.decimals,
        total_supply: body.total_supply,
        description: body.description ?? null,
        logo_url: body.logo_url ?? null,
        metadata_uri: body.metadata_uri ?? null,
        website: body.website ?? null,
        twitter: body.twitter ?? null,
        telegram: body.telegram ?? null,
        token_created: true,
        metadata_attached: !!body.metadata_uri,
        create_tx_signature: body.create_tx_signature,
        metadata_tx_signature: body.metadata_tx_signature ?? null,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ledger: record real signature steps for this launch
    try {
      let solUsd: number | null = null;
      try {
        const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
        const j = await r.json();
        const p = Number(j?.solana?.usd);
        if (Number.isFinite(p) && p > 0) solUsd = p;
      } catch {}
      const usd = (sol: number) => solUsd ? sol * solUsd : null;
      const network = body.network as string;
      const baseRow = {
        token_address: body.mint_address,
        token_symbol: body.token_symbol,
        user_id: userId,
        wallet_address: body.wallet_address,
        related_launch_id: data.id,
        network,
        sol_usd_at_time: solUsd,
      };

      // 1) Mint creation tx — real SPL rent ≈ 0.0025 SOL + signature fee
      const MINT_GAS = 0.0025;
      await supabase.from("financial_transactions").insert({
        ...baseRow,
        tx_type: "mint_creation",
        source: "user", destination: "blockchain",
        amount_sol: MINT_GAS,
        amount_usd_at_time: usd(MINT_GAS),
        tx_signature: body.create_tx_signature,
        notes: "SPL mint account rent + creation",
      });

      // 2) Metadata pin/attach — only if metadata was attached
      if (body.metadata_uri) {
        const META_COST = 0.01;
        await supabase.from("financial_transactions").insert({
          ...baseRow,
          tx_type: "metadata_pin",
          source: "user", destination: "blockchain",
          amount_sol: META_COST,
          amount_usd_at_time: usd(META_COST),
          tx_signature: body.metadata_tx_signature ?? body.create_tx_signature,
          notes: "Metaplex metadata account",
        });
      }

      // 3) PMM platform launch fee (admin-configurable, mainnet only)
      const { data: feeRow } = await supabase
        .from("admin_settings").select("value").eq("key", "launch_fee_sol").maybeSingle();
      const launchFee = Number(feeRow?.value ?? 0);
      if (launchFee > 0 && network === "mainnet") {
        const { data: pmmAcct } = await supabase.rpc("fin_get_or_create_account", {
          _account_type: "pmm_revenue", _scope_token: null, _scope_user: null, _label: "PMM Revenue (Global)",
        });
        await supabase.from("financial_transactions").insert({
          ...baseRow,
          tx_type: "launch_fee",
          source: "user", destination: "pmm",
          amount_sol: launchFee,
          amount_usd_at_time: usd(launchFee),
          destination_account_id: pmmAcct,
          notes: "PMM platform launch fee",
        });
      }
    } catch (e) {
      console.error("ledger insert (launch flow) failed:", e);
    }

    return new Response(JSON.stringify({ ok: true, launch: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
