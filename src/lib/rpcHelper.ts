// Centralized Solana RPC URL resolution + auto-fallback.
// All client-side Solana code should use getRpcUrl() instead of hardcoding.
import { supabase } from "@/integrations/supabase/client";
import { Connection } from "@solana/web3.js";

export type SolanaNetwork = "devnet" | "mainnet";

const FALLBACK_DEVNET = "https://api.devnet.solana.com";
const FALLBACK_MAINNET = "https://api.mainnet-beta.solana.com";

const SETTING_KEYS = {
  devnet: ["solana_rpc_devnet"],
  mainnetPrimary: "solana_rpc_mainnet_primary",
  mainnetFb1: "solana_rpc_mainnet_fallback_1",
  mainnetFb2: "solana_rpc_mainnet_fallback_2",
  active: "solana_rpc_active_preset", // 'primary' | 'fallback_1' | 'fallback_2'
};

let cache: { ts: number; map: Record<string, string> } | null = null;
const CACHE_MS = 30_000;

async function loadAll(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.map;
  const { data } = await supabase
    .from("admin_settings")
    .select("key,value")
    .in("key", [
      SETTING_KEYS.devnet[0],
      SETTING_KEYS.mainnetPrimary,
      SETTING_KEYS.mainnetFb1,
      SETTING_KEYS.mainnetFb2,
      SETTING_KEYS.active,
      "solana_rpc_url", // legacy
    ]);
  const map: Record<string, string> = {};
  (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
  cache = { ts: Date.now(), map };
  return map;
}

export function clearRpcCache() { cache = null; }

export async function getMainnetEndpoints(): Promise<string[]> {
  const m = await loadAll();
  const active = m[SETTING_KEYS.active] || "primary";
  const primary = m[SETTING_KEYS.mainnetPrimary] || m["solana_rpc_url"] || FALLBACK_MAINNET;
  const fb1 = m[SETTING_KEYS.mainnetFb1] || "";
  const fb2 = m[SETTING_KEYS.mainnetFb2] || "";
  // Active first, then the others as fallback in order
  const ordered = [];
  const all = { primary, fallback_1: fb1, fallback_2: fb2 };
  if (all[active as keyof typeof all]) ordered.push(all[active as keyof typeof all]);
  ["primary", "fallback_1", "fallback_2"].forEach(k => {
    const v = all[k as keyof typeof all];
    if (v && !ordered.includes(v)) ordered.push(v);
  });
  if (ordered.length === 0) ordered.push(FALLBACK_MAINNET);
  return ordered;
}

export async function getRpcUrl(network: SolanaNetwork): Promise<string> {
  if (network === "devnet") {
    const m = await loadAll();
    return m[SETTING_KEYS.devnet[0]] || FALLBACK_DEVNET;
  }
  const list = await getMainnetEndpoints();
  return list[0];
}

export async function getRpcEndpoints(network: SolanaNetwork): Promise<string[]> {
  if (network === "devnet") return [await getRpcUrl("devnet")];
  return getMainnetEndpoints();
}

/**
 * Creates a Connection that auto-fails-over to the next mainnet preset
 * on 403 / 429. Try each endpoint until one works for getLatestBlockhash.
 */
export async function getConnectionWithFallback(network: SolanaNetwork): Promise<{ connection: Connection; endpoint: string; }> {
  const endpoints = await getRpcEndpoints(network);
  let lastErr: unknown = null;
  for (const ep of endpoints) {
    try {
      const conn = new Connection(ep, "confirmed");
      // Probe — if this throws 403/429 we fall to the next
      await conn.getLatestBlockhash("confirmed");
      return { connection: conn, endpoint: ep };
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      // continue to next on auth/rate errors
      if (!/403|429|rate|forbidden|unauthor/i.test(msg)) {
        // For other errors (e.g. timeout), still try fallback
      }
    }
  }
  throw new Error(`All RPC endpoints failed. Last error: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
}

export async function testRpc(url: string): Promise<{ ok: boolean; latencyMs?: number; error?: string; slot?: number }> {
  const start = Date.now();
  try {
    const c = new Connection(url, "confirmed");
    const slot = await c.getSlot();
    return { ok: true, latencyMs: Date.now() - start, slot };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
