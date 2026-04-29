import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { walletAddress, submissionId } = await req.json();

    if (!walletAddress) {
      return new Response(JSON.stringify({ error: "Missing walletAddress" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user's submissions (filter to premium/viral for export access)
    let query = supabase
      .from("token_submissions")
      .select("*")
      .eq("wallet_address", walletAddress)
      .eq("promotion_type", "premium")
      .order("created_at", { ascending: false });

    if (submissionId) {
      query = query.eq("id", submissionId);
    }

    const { data: submissions, error: subErr } = await query.limit(50);
    if (subErr) throw subErr;

    if (!submissions || submissions.length === 0) {
      return new Response(JSON.stringify({ error: "No Viral-tier campaigns found for this wallet" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subIds = submissions.map(s => s.id);

    // Fetch related data
    const [postsRes, botsRes] = await Promise.all([
      supabase.from("social_posts").select("*").in("token_submission_id", subIds),
      supabase.from("bot_activity_log").select("*").in("token_submission_id", subIds),
    ]);

    // Build CSV
    const csvLines = ["Token Symbol,Token Address,Plan,Status,Created,Expires,Views,Engagement Score,Platforms,Total Likes,Total Shares,Total Views,Bot Actions"];

    for (const sub of submissions) {
      const posts = (postsRes.data || []).filter(p => p.token_submission_id === sub.id);
      const bots = (botsRes.data || []).filter(b => b.token_submission_id === sub.id);
      const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
      const totalShares = posts.reduce((s, p) => s + (p.shares || 0), 0);
      const totalViews = posts.reduce((s, p) => s + (p.views || 0), 0);
      const platforms = [...new Set(posts.map(p => p.platform))].join("; ");

      csvLines.push([
        sub.token_symbol || "",
        sub.token_address,
        sub.promotion_type,
        sub.status,
        sub.created_at,
        sub.expires_at || "",
        sub.views || 0,
        sub.engagement_score || 0,
        platforms,
        totalLikes,
        totalShares,
        totalViews,
        bots.length,
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }

    const csv = csvLines.join("\n");

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="promotemymemes-report-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
