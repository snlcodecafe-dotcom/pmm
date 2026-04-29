// Verifies a Solana wallet signature against a server-issued nonce, then links the wallet
// to the authenticated user and backfills user_id on token_launches and token_submissions.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import bs58 from "https://esm.sh/bs58@5.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function respond(ok: boolean, payload: Record<string, unknown>) {
  return new Response(JSON.stringify({ ok, ...payload }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return respond(false, { error: "unauthorized" });

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp?.user;
    if (!user) return respond(false, { error: "unauthorized" });

    const body = await req.json();
    const { wallet_address, nonce, signature, set_primary } = body || {};
    if (!wallet_address || !nonce || !signature) {
      return respond(false, { error: "missing fields" });
    }
    if (typeof wallet_address !== "string" || wallet_address.length < 32 || wallet_address.length > 64) {
      return respond(false, { error: "bad wallet" });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Validate nonce
    const { data: nrow } = await admin.from("wallet_claim_nonces")
      .select("*").eq("user_id", user.id).eq("wallet_address", wallet_address).eq("nonce", nonce).eq("consumed", false).maybeSingle();
    if (!nrow) return respond(false, { error: "nonce not found or used" });
    if (new Date(nrow.expires_at).getTime() < Date.now()) {
      return respond(false, { error: "nonce expired" });
    }

    // Verify signature
    const message = new TextEncoder().encode(`PromoteMyMemes wallet link\nUser: ${user.id}\nNonce: ${nonce}`);
    const sigBytes = bs58.decode(signature);
    const pubBytes = bs58.decode(wallet_address);
    const ok = nacl.sign.detached.verify(message, sigBytes, pubBytes);
    if (!ok) {
      return respond(false, { error: "invalid signature" });
    }

    // Mark nonce consumed
    await admin.from("wallet_claim_nonces").update({ consumed: true }).eq("id", nrow.id);

    // Check if wallet already linked to a different user
    const { data: existing } = await admin.from("user_wallets").select("user_id").eq("wallet_address", wallet_address).maybeSingle();
    if (existing && existing.user_id !== user.id) {
      return respond(false, { error: "wallet already linked to another account" });
    }

    // Insert link
    if (!existing) {
      await admin.from("user_wallets").insert({ user_id: user.id, wallet_address, is_primary: !!set_primary });
    }
    if (set_primary) {
      await admin.from("user_wallets").update({ is_primary: false }).eq("user_id", user.id).neq("wallet_address", wallet_address);
      await admin.from("user_wallets").update({ is_primary: true }).eq("user_id", user.id).eq("wallet_address", wallet_address);
      await admin.from("profiles").update({ primary_wallet: wallet_address }).eq("user_id", user.id);
    }

    const { data: existingReferral } = await admin
      .from("referral_codes")
      .select("id")
      .eq("wallet_address", wallet_address)
      .maybeSingle();

    if (!existingReferral) {
      const code = `${wallet_address.slice(0, 4).toUpperCase()}${wallet_address.slice(-4).toUpperCase()}`;
      await admin.from("referral_codes").insert({ wallet_address, code });
    }

    // Backfill user_id on existing tables
    const { count: bfLaunches } = await admin.from("token_launches").update({ user_id: user.id }, { count: "exact" }).eq("wallet_address", wallet_address).is("user_id", null);
    const { count: bfSubs } = await admin.from("token_submissions").update({ user_id: user.id }, { count: "exact" }).eq("wallet_address", wallet_address).is("user_id", null);

    return respond(true, { backfilled_launches: bfLaunches ?? 0, backfilled_submissions: bfSubs ?? 0 });
  } catch (e) {
    return respond(false, { error: e instanceof Error ? e.message : String(e) });
  }
});
