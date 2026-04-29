import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Package definitions ───────────────────────────────────────────────────

const PACKAGES = {
  basic: {
    price: 0,
    durationMinutes: 10,
    platforms: ["telegram"],
    featured: false,
    priority: false,
  },
  advanced: {
    price: 0.1,
    durationMinutes: 180,
    platforms: ["twitter", "telegram", "discord", "instagram"],
    featured: true,
    priority: false,
  },
  premium: {
    price: 0.5,
    durationMinutes: 1440,
    platforms: ["twitter", "telegram", "discord", "instagram", "reddit"],
    featured: true,
    priority: true,
  },
};

type PackageOverride = {
  key?: string;
  name?: string;
  priceSol?: number;
  duration?: string;
  deliverables?: string;
  platforms?: string[];
  features?: string[];
  dbPromotionType?: string;
  strategy?: string | null;
  tone?: string | null;
  postFrequency?: string | null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tokenAddress, tokenSymbol, promotionType, walletAddress, txSignature, referralCode, packageConfig } = await req.json();

    if (!tokenAddress || !promotionType) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(tokenAddress)) {
      return new Response(JSON.stringify({ error: "Invalid Solana address format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pkg = PACKAGES[promotionType as keyof typeof PACKAGES];
    if (!pkg) {
      return new Response(JSON.stringify({ error: "Invalid promotion type" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const override = (packageConfig ?? {}) as PackageOverride;
    const finalPrice = typeof override.priceSol === "number" ? override.priceSol : pkg.price;
    const finalPlatforms = Array.isArray(override.platforms) && override.platforms.length > 0 ? override.platforms : pkg.platforms;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Resolve user_id from auth header
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
      const token = authHeader.replace("Bearer ", "");
      const { data: u } = await supabase.auth.getUser(token);
      if (u.user) userId = u.user.id;
    }

    const expiresAt = new Date(Date.now() + pkg.durationMinutes * 60 * 1000).toISOString();
    const symbol = tokenSymbol || tokenAddress.slice(0, 6).toUpperCase();

    // ── Insert submission ─────────────────────────────────────────────────
    const { data: submission, error: insertErr } = await supabase
      .from("token_submissions")
      .insert({
        user_id: userId,
        token_address: tokenAddress,
        token_symbol: symbol,
        promotion_type: promotionType,
        price_sol: finalPrice,
        wallet_address: walletAddress || null,
        tx_signature: txSignature || null,
        referral_code: referralCode || null,
        status: "active",
        campaign_status: "queued",
        expires_at: expiresAt,
        services_delivered: {
          listed: true,
          platforms: finalPlatforms,
          featured: pkg.featured,
          priority: pkg.priority,
          duration_minutes: pkg.durationMinutes,
          package_key: override.key || null,
          package_name: override.name || null,
          package_duration: override.duration || null,
          package_deliverables: override.deliverables || null,
          package_features: override.features || [],
          strategy: override.strategy || null,
          tone: override.tone || null,
          post_frequency: override.postFrequency || null,
        },
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // ── Financial ledger: record promotion fee ────────────────────────────
    if (finalPrice > 0) {
      try {
        // Try to detect network from token_launches
        let network: string | null = null;
        const { data: launchRow } = await supabase
          .from("token_launches").select("network").eq("mint_address", tokenAddress).maybeSingle();
        if (launchRow?.network) network = launchRow.network;

        // Fetch SOL/USD snapshot
        let solUsd: number | null = null;
        try {
          const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
          const j = await r.json();
          const p = Number(j?.solana?.usd);
          if (Number.isFinite(p) && p > 0) solUsd = p;
        } catch {}

        const { data: pmmAcct } = await supabase.rpc("fin_get_or_create_account", {
          _account_type: "pmm_revenue", _scope_token: null, _scope_user: null, _label: "PMM Revenue (Global)",
        });
        await supabase.from("financial_transactions").insert({
          tx_type: "promotion_fee",
          source: "user", destination: "pmm",
          amount_sol: finalPrice,
          sol_usd_at_time: solUsd,
          amount_usd_at_time: solUsd ? finalPrice * solUsd : null,
          token_address: tokenAddress, token_symbol: symbol,
          user_id: userId, wallet_address: walletAddress || null,
          referral_code: referralCode || null,
          destination_account_id: pmmAcct,
          related_submission_id: submission.id,
          tx_signature: txSignature || null,
          network,
          notes: `Promotion package: ${promotionType}`,
        });
      } catch (e) {
        console.error("ledger insert (promotion_fee) failed:", e);
      }
    }

    // ── Partner attribution: if referral code matches a verified channel, record earning ─
    if (referralCode && finalPrice > 0) {
      const { data: channel } = await supabase.from("partner_channels")
        .select("id, user_id, tier_percent")
        .eq("referral_code", referralCode)
        .eq("verification_status", "verified")
        .maybeSingle();
      if (channel) {
        const commission = (Number(finalPrice) * Number(channel.tier_percent)) / 100;
        const { data: earning } = await supabase.from("partner_earnings").insert({
          partner_user_id: channel.user_id,
          channel_id: channel.id,
          referral_code: referralCode,
          token_submission_id: submission.id,
          commission_sol: commission,
          tier_percent_at_time: channel.tier_percent,
          payout_status: "pending",
        }).select().single();

        // Ledger entry for partner commission accrual
        try {
          const { data: pmmAcct } = await supabase.rpc("fin_get_or_create_account", {
            _account_type: "pmm_revenue", _scope_token: null, _scope_user: null, _label: "PMM Revenue (Global)",
          });
          const { data: partnerAcct } = await supabase.rpc("fin_get_or_create_account", {
            _account_type: "partner_commission", _scope_token: null, _scope_user: channel.user_id, _label: "Partner commissions",
          });
          await supabase.from("financial_transactions").insert({
            tx_type: "partner_commission",
            source: "pmm", destination: "partner",
            amount_sol: commission,
            token_address: tokenAddress, token_symbol: symbol,
            partner_user_id: channel.user_id,
            referral_code: referralCode,
            source_account_id: pmmAcct,
            destination_account_id: partnerAcct,
            related_submission_id: submission.id,
            related_earning_id: earning?.id ?? null,
            notes: `Partner commission ${channel.tier_percent}%`,
          });
        } catch (e) {
          console.error("ledger insert (partner_commission) failed:", e);
        }
      }
    }

    // ── Trigger real campaign execution ──────────────────────────────────
    // Fire-and-forget: call execute-campaign to post to real platforms
    const execBody = {
      submissionId: submission.id,
      tokenSymbol: symbol,
      tokenAddress,
       platforms: finalPlatforms,
      promotionType,
    };

    // Call execute-campaign edge function
    fetch(`${supabaseUrl}/functions/v1/execute-campaign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(execBody),
    }).catch(err => console.error("execute-campaign trigger failed:", err));

    // ── Seed campaigns/missions for premium ─────────────────────────────
    if (promotionType === "premium") {
      await supabase.from("campaigns").insert({
        name: `${symbol} Pump Hour 🚀`,
        campaign_type: "pump_hour",
        description: `Community coordinated promotion for ${symbol}. 24h campaign.`,
        status: "active",
        token_symbol: symbol,
        token_address: tokenAddress,
        target_participants: 100,
        current_participants: 0,
        reward_pool: 0.1,
        end_time: expiresAt,
      });

      await supabase.from("community_missions").insert([
        {
          title: `Share ${symbol} on X`,
          description: `Post about ${symbol} on Twitter/X with #Solana to earn 300 points`,
          mission_type: "share",
          reward_points: 300,
          status: "active",
          token_symbol: symbol,
          token_address: tokenAddress,
          expires_at: expiresAt,
        },
      ]);
    }

    // ── Wallet intelligence for paid tiers ──────────────────────────────
    if (promotionType !== "basic" && walletAddress) {
      const { data: existing } = await supabase
        .from("wallet_labels")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single();

      if (!existing) {
        await supabase.from("wallet_labels").insert({
          wallet_address: walletAddress,
          label: promotionType === "premium" ? "Premium Promoter" : "Growth Backer",
          score: promotionType === "premium" ? 85 : 60,
           total_volume_sol: finalPrice,
          tokens_tracked: 1,
          win_rate: 72,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      submission,
      deliverables: {
         platforms: finalPlatforms,
        duration_minutes: pkg.durationMinutes,
        featured: pkg.featured,
        priority: pkg.priority,
        execution: "triggered",
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-token error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
