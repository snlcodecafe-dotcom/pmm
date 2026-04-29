// Admin-only finance module: backfill, summary, ledger queries, CSV export
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Approx splits used by backfill when actual values weren't recorded.
// Solana SPL mint creation real cost ≈ 0.0025 SOL; we keep 0.01 as conservative gas buffer.
const ESTIMATED_LAUNCH_GAS_SOL = 0.01;
// Default platform launch fee (kept editable by admin via package config)
const DEFAULT_LAUNCH_FEE_SOL = 0.05;

async function fetchSolUsd(): Promise<number> {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const j = await r.json();
    const p = Number(j?.solana?.usd);
    return Number.isFinite(p) && p > 0 ? p : 0;
  } catch {
    return 0;
  }
}

async function checkAdmin(req: Request, supabase: any): Promise<{ ok: boolean; userId?: string; password?: string }> {
  const authHeader = req.headers.get("Authorization");
  let userId: string | null = null;
  if (authHeader && !authHeader.endsWith(SERVICE_KEY)) {
    const token = authHeader.replace("Bearer ", "");
    const { data: u } = await supabase.auth.getUser(token);
    if (u.user) userId = u.user.id;
  }
  if (!userId) return { ok: false };
  const { data: hasRole } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!hasRole) return { ok: false };
  return { ok: true, userId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || (await req.clone().json().catch(() => ({}))).action;

    // Verify admin (password OR role; we accept either for compat with existing /admin)
    const body = await req.json().catch(() => ({}));
    const password = body.password as string | undefined;

    let isAdmin = false;
    if (password) {
      const { data: stored } = await supabase.from("admin_settings").select("value").eq("key", "admin_password").single();
      if (stored?.value === password) isAdmin = true;
    }
    if (!isAdmin) {
      const ar = await checkAdmin(req, supabase);
      isAdmin = ar.ok;
    }
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const act = action || body.action;

    // ─────────────────────────────────────────────────
    // BACKFILL
    // ─────────────────────────────────────────────────
    if (act === "backfill") {
      const solUsd = await fetchSolUsd();
      if (solUsd > 0) {
        await supabase.from("sol_price_snapshots").insert({ price_usd: solUsd, source: "coingecko" });
      }

      // Skip records that already have ledger entries
      const { data: existing } = await supabase
        .from("financial_transactions")
        .select("related_launch_id, related_submission_id, related_earning_id");
      const seenLaunch = new Set((existing ?? []).map((r: any) => r.related_launch_id).filter(Boolean));
      const seenSub = new Set((existing ?? []).map((r: any) => r.related_submission_id).filter(Boolean));
      const seenEarn = new Set((existing ?? []).map((r: any) => r.related_earning_id).filter(Boolean));

      let txCount = 0;
      const insertTx = async (row: any) => {
        const usd = solUsd > 0 ? Number(row.amount_sol) * solUsd : null;
        const { error } = await supabase.from("financial_transactions").insert({
          ...row,
          sol_usd_at_time: solUsd > 0 ? solUsd : null,
          amount_usd_at_time: usd,
        });
        if (!error) txCount++;
        else console.error("insertTx error", error.message);
      };

      const ensureAccount = async (
        type: string, scopeToken: string | null, scopeUser: string | null, label: string | null,
      ): Promise<string> => {
        const { data } = await supabase.rpc("fin_get_or_create_account", {
          _account_type: type, _scope_token: scopeToken, _scope_user: scopeUser, _label: label,
        });
        return data as string;
      };

      const pmmAccount = await ensureAccount("pmm_revenue", null, null, "PMM Revenue (Global)");

      // Read configurable launch fee (mainnet only)
      const { data: feeRow } = await supabase
        .from("admin_settings").select("value").eq("key", "launch_fee_sol").maybeSingle();
      const launchFee = Number(feeRow?.value ?? 0);

      // 1. token_launches
      const { data: launches } = await supabase.from("token_launches").select("*");
      for (const l of launches ?? []) {
        if (seenLaunch.has(l.id)) continue;
        const launchAccount = await ensureAccount(
          "launch", l.mint_address, null, `Launch: ${l.token_symbol}`,
        );

        // Mint creation gas (real estimate)
        await insertTx({
          tx_type: "mint_creation",
          source: "user", destination: "blockchain",
          amount_sol: 0.0025,
          token_address: l.mint_address, token_symbol: l.token_symbol,
          user_id: l.user_id, wallet_address: l.wallet_address,
          related_launch_id: l.id, network: l.network,
          tx_signature: l.create_tx_signature,
          notes: "Backfill: SPL mint creation",
          occurred_at: l.created_at,
        });

        // Metadata pin
        if (l.metadata_attached) {
          await insertTx({
            tx_type: "metadata_pin",
            source: "user", destination: "blockchain",
            amount_sol: 0.01,
            token_address: l.mint_address, token_symbol: l.token_symbol,
            user_id: l.user_id, wallet_address: l.wallet_address,
            related_launch_id: l.id, network: l.network,
            tx_signature: l.metadata_tx_signature,
            notes: "Backfill: Metaplex metadata",
            occurred_at: l.created_at,
          });
        }

        // Liquidity (only if recorded)
        if (l.liquidity_added && l.base_amount_sol && Number(l.base_amount_sol) > 0) {
          await insertTx({
            tx_type: "liquidity",
            source: "user", destination: "liquidity_pool",
            amount_sol: Number(l.base_amount_sol),
            token_address: l.mint_address, token_symbol: l.token_symbol,
            user_id: l.user_id, wallet_address: l.wallet_address,
            source_account_id: null, destination_account_id: launchAccount,
            related_launch_id: l.id, network: l.network,
            notes: `Backfill: liquidity added (${l.amm_type ?? "unknown AMM"})`,
            occurred_at: l.updated_at,
          });
          // Pool creation gas
          await insertTx({
            tx_type: "gas_fee",
            source: "user", destination: "blockchain",
            amount_sol: 0.2,
            token_address: l.mint_address, token_symbol: l.token_symbol,
            user_id: l.user_id, wallet_address: l.wallet_address,
            related_launch_id: l.id, network: l.network,
            notes: "Backfill: pool creation rent",
            occurred_at: l.updated_at,
          });
        }

        // LP lock
        if (l.liquidity_locked) {
          await insertTx({
            tx_type: "lp_lock",
            source: "user", destination: "blockchain",
            amount_sol: 0.005,
            token_address: l.mint_address, token_symbol: l.token_symbol,
            user_id: l.user_id, wallet_address: l.wallet_address,
            related_launch_id: l.id, network: l.network,
            tx_signature: l.lock_address,
            notes: `Backfill: LP locked via ${l.lock_provider ?? "Streamflow"}`,
            occurred_at: l.updated_at,
          });
        }

        // PMM platform launch fee — mainnet only
        if (launchFee > 0 && l.network === "mainnet") {
          await insertTx({
            tx_type: "launch_fee",
            source: "user", destination: "pmm",
            amount_sol: launchFee,
            token_address: l.mint_address, token_symbol: l.token_symbol,
            user_id: l.user_id, wallet_address: l.wallet_address,
            destination_account_id: pmmAccount,
            related_launch_id: l.id, network: l.network,
            notes: "Backfill: PMM platform launch fee",
            occurred_at: l.created_at,
          });
        }
      }

      // 2. token_submissions (promotion fees)
      const { data: subs } = await supabase.from("token_submissions").select("*");
      // Build mint→network map from launches for submission/earning backfills
      const mintNet = new Map<string, string>();
      for (const l of launches ?? []) {
        if (l.mint_address && l.network) mintNet.set(l.mint_address, l.network);
      }

      for (const s of subs ?? []) {
        if (seenSub.has(s.id)) continue;
        const price = Number(s.price_sol ?? 0);
        if (price <= 0) continue;
        await insertTx({
          tx_type: "promotion_fee",
          source: "user", destination: "pmm",
          amount_sol: price,
          token_address: s.token_address, token_symbol: s.token_symbol,
          user_id: s.user_id, wallet_address: s.wallet_address,
          referral_code: s.referral_code,
          source_account_id: null, destination_account_id: pmmAccount,
          related_submission_id: s.id,
          tx_signature: s.tx_signature,
          network: mintNet.get(s.token_address) ?? null,
          notes: `Promotion package: ${s.promotion_type}`,
          occurred_at: s.created_at,
        });
      }

      // 3. partner_earnings (commission paid out / accrued)
      const { data: earnings } = await supabase.from("partner_earnings").select("*");
      for (const e of earnings ?? []) {
        if (seenEarn.has(e.id)) continue;
        const partnerAccount = await ensureAccount(
          "partner_commission", null, e.partner_user_id, "Partner commissions",
        );
        await insertTx({
          tx_type: "partner_commission",
          source: "pmm", destination: "partner",
          amount_sol: Number(e.commission_sol ?? 0),
          partner_user_id: e.partner_user_id,
          referral_code: e.referral_code,
          source_account_id: pmmAccount, destination_account_id: partnerAccount,
          related_earning_id: e.id,
          related_submission_id: e.token_submission_id,
          notes: `Tier ${e.tier_percent_at_time}% — ${e.payout_status}`,
          occurred_at: e.created_at,
        });
        if (e.payout_status === "paid" && e.paid_at) {
          await insertTx({
            tx_type: "partner_payout",
            source: "partner", destination: "user",
            amount_sol: Number(e.commission_sol ?? 0),
            partner_user_id: e.partner_user_id,
            referral_code: e.referral_code,
            source_account_id: partnerAccount, destination_account_id: null,
            related_earning_id: e.id,
            tx_signature: e.payout_tx_signature,
            notes: "Partner payout settled",
            occurred_at: e.paid_at,
          });
        }
      }

      return new Response(JSON.stringify({ ok: true, inserted: txCount, sol_usd: solUsd }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────
    // SUMMARY (KPIs) — supports network filter
    // ─────────────────────────────────────────────────
    if (act === "summary") {
      const networkFilter = body.network as ("mainnet" | "devnet" | "all" | undefined);
      const solUsd = await fetchSolUsd();
      let q = supabase.from("financial_transactions").select("tx_type, amount_sol, amount_usd_at_time, occurred_at, token_address, token_symbol, network");
      if (networkFilter && networkFilter !== "all") q = q.eq("network", networkFilter);
      const { data: txs } = await q;
      const all = txs ?? [];

      const sumByType = (t: string) => all.filter((x: any) => x.tx_type === t)
        .reduce((s: number, x: any) => s + Number(x.amount_sol || 0), 0);

      const launchFees = sumByType("launch_fee");
      const promoFees = sumByType("promotion_fee");
      const tradingFees = sumByType("trading_fee");
      const partnerComm = sumByType("partner_commission");
      const partnerPaid = sumByType("partner_payout");
      const liquidity = sumByType("liquidity");
      const gas = sumByType("gas_fee") + sumByType("mint_creation") + sumByType("metadata_pin")
        + sumByType("lp_lock") + sumByType("authority_revoke") + sumByType("indexer_submission");

      const pmmGross = launchFees + promoFees + tradingFees;
      const pmmNet = pmmGross - partnerComm;

      // Token-wise rollup
      const tokens = new Map<string, any>();
      for (const t of all) {
        if (!t.token_address) continue;
        const k = t.token_address;
        if (!tokens.has(k)) {
          tokens.set(k, {
            token_address: k, token_symbol: t.token_symbol, network: t.network,
            user_spent_sol: 0, liquidity_sol: 0,
            pmm_revenue_sol: 0, partner_commissions_sol: 0, gas_sol: 0, trading_fees_sol: 0,
            tx_count: 0,
          });
        }
        const r = tokens.get(k);
        const amt = Number(t.amount_sol || 0);
        const userOutflow = ["promotion_fee", "launch_fee", "liquidity", "gas_fee", "mint_creation", "metadata_pin", "lp_lock", "authority_revoke", "indexer_submission"];
        const gasLike = ["gas_fee", "mint_creation", "metadata_pin", "lp_lock", "authority_revoke", "indexer_submission"];
        if (userOutflow.includes(t.tx_type)) r.user_spent_sol += amt;
        if (t.tx_type === "liquidity") r.liquidity_sol += amt;
        if (gasLike.includes(t.tx_type)) r.gas_sol += amt;
        if (t.tx_type === "promotion_fee" || t.tx_type === "launch_fee") r.pmm_revenue_sol += amt;
        if (t.tx_type === "partner_commission") r.partner_commissions_sol += amt;
        if (t.tx_type === "trading_fee") r.trading_fees_sol += amt;
        r.tx_count += 1;
      }

      return new Response(JSON.stringify({
        ok: true,
        sol_usd: solUsd,
        network: networkFilter ?? "all",
        kpis: {
          launchFees, promoFees, tradingFees, partnerComm, partnerPaid, liquidity, gas,
          pmmGross, pmmNet,
          partnerPending: partnerComm - partnerPaid,
          totalTransactions: all.length,
        },
        tokens: Array.from(tokens.values()).sort((a, b) => b.pmm_revenue_sol - a.pmm_revenue_sol),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Token detail: every tx for one mint
    if (act === "token_detail") {
      const addr = String(body.token_address || "");
      if (!addr) return new Response(JSON.stringify({ error: "token_address required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data } = await supabase.from("financial_transactions")
        .select("*").eq("token_address", addr).order("occurred_at", { ascending: false });
      return new Response(JSON.stringify({ ok: true, rows: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Admin-configurable launch fee
    if (act === "get_settings") {
      const { data } = await supabase.from("admin_settings").select("key, value")
        .in("key", ["launch_fee_sol"]);
      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => map[r.key] = r.value);
      return new Response(JSON.stringify({ ok: true, settings: map }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (act === "set_launch_fee") {
      const fee = String(Number(body.fee_sol ?? 0));
      await supabase.from("admin_settings").upsert(
        { key: "launch_fee_sol", value: fee },
        { onConflict: "key" }
      );
      return new Response(JSON.stringify({ ok: true, fee_sol: fee }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─────────────────────────────────────────────────
    // LEDGER (paginated, filterable)
    // ─────────────────────────────────────────────────
    if (act === "ledger") {
      const limit = Math.min(Number(body.limit ?? 200), 1000);
      const offset = Number(body.offset ?? 0);
      let q = supabase.from("financial_transactions").select("*", { count: "exact" })
        .order("occurred_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (body.token_address) q = q.eq("token_address", body.token_address);
      if (body.user_id) q = q.eq("user_id", body.user_id);
      if (body.tx_type) q = q.eq("tx_type", body.tx_type);
      if (body.network && body.network !== "all") q = q.eq("network", body.network);
      if (body.from) q = q.gte("occurred_at", body.from);
      if (body.to) q = q.lte("occurred_at", body.to);
      const { data, count } = await q;
      return new Response(JSON.stringify({ ok: true, rows: data ?? [], total: count ?? 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────
    // ACCOUNTS list
    // ─────────────────────────────────────────────────
    if (act === "accounts") {
      const { data } = await supabase.from("financial_accounts").select("*").order("account_type");
      return new Response(JSON.stringify({ ok: true, accounts: data ?? [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────
    // CSV export
    // ─────────────────────────────────────────────────
    if (act === "export_csv") {
      const { data: rows } = await supabase.from("financial_transactions").select("*").order("occurred_at", { ascending: false }).limit(50000);
      const headers = [
        "id", "occurred_at", "tx_type", "source", "destination", "network",
        "amount_sol", "sol_usd_at_time", "amount_usd_at_time",
        "token_symbol", "token_address", "user_id", "wallet_address",
        "partner_user_id", "referral_code", "tx_signature", "notes",
      ];
      const csv = [headers.join(",")].concat((rows ?? []).map((r: any) =>
        headers.map(h => {
          const v = r[h] ?? "";
          const s = String(v).replace(/"/g, '""');
          return /[,"\n]/.test(s) ? `"${s}"` : s;
        }).join(",")
      )).join("\n");
      return new Response(csv, {
        headers: { ...corsHeaders, "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="ledger-${Date.now()}.csv"` },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("finance-admin error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
