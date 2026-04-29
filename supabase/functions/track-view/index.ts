import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tokenId } = await req.json();
    if (!tokenId || typeof tokenId !== "string") {
      return new Response(JSON.stringify({ error: "Missing tokenId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Increment view count atomically via RPC or manual update
    const { data: current } = await supabase
      .from("token_submissions")
      .select("views")
      .eq("id", tokenId)
      .eq("status", "active")
      .single();

    if (!current) {
      return new Response(JSON.stringify({ error: "Token not found or inactive" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newViews = (current.views || 0) + 1;
    await supabase
      .from("token_submissions")
      .update({ views: newViews })
      .eq("id", tokenId);

    return new Response(JSON.stringify({ success: true, views: newViews }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
