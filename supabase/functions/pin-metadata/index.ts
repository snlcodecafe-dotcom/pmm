import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MetadataPayload {
  name: string;
  symbol: string;
  description?: string;
  image: string; // public URL of logo
  external_url?: string;
  extensions?: {
    website?: string;
    twitter?: string;
    telegram?: string;
  };
}

function validate(p: any): { ok: true; data: MetadataPayload } | { ok: false; error: string } {
  if (!p || typeof p !== "object") return { ok: false, error: "Invalid body" };
  if (typeof p.name !== "string" || p.name.length < 2 || p.name.length > 32)
    return { ok: false, error: "name 2-32 chars" };
  if (typeof p.symbol !== "string" || !/^[A-Z0-9]{2,10}$/.test(p.symbol))
    return { ok: false, error: "symbol must be 2-10 uppercase alphanumeric" };
  if (typeof p.image !== "string" || !/^https?:\/\//.test(p.image))
    return { ok: false, error: "image must be http(s) url" };
  if (p.description && (typeof p.description !== "string" || p.description.length > 500))
    return { ok: false, error: "description max 500" };
  return { ok: true, data: p as MetadataPayload };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const PINATA_JWT = Deno.env.get("PINATA_JWT");
    if (!PINATA_JWT) {
      return new Response(JSON.stringify({ error: "PINATA_JWT not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const v = validate(body);
    if (!v.ok) {
      return new Response(JSON.stringify({ error: v.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metadata = {
      name: v.data.name,
      symbol: v.data.symbol,
      description: v.data.description || "",
      image: v.data.image,
      external_url: v.data.external_url || v.data.extensions?.website || "",
      extensions: v.data.extensions || {},
    };

    const pinRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `${v.data.symbol}-metadata.json` },
      }),
    });

    if (!pinRes.ok) {
      const txt = await pinRes.text();
      return new Response(JSON.stringify({ error: `Pinata error: ${txt}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pinData = await pinRes.json();
    const cid = pinData.IpfsHash;
    const uri = `https://gateway.pinata.cloud/ipfs/${cid}`;

    return new Response(JSON.stringify({ ok: true, uri, cid, metadata }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
