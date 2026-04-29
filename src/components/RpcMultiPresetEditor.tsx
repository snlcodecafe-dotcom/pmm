import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { testRpc, clearRpcCache } from "@/lib/rpcHelper";
import { Check, Zap, AlertCircle, Loader2 } from "lucide-react";

const KEYS = [
  { key: "solana_rpc_devnet", label: "Devnet", placeholder: "https://api.devnet.solana.com", isMainnet: false },
  { key: "solana_rpc_mainnet_primary", label: "Mainnet — Primary", placeholder: "https://your-helius-or-quicknode-url", isMainnet: true },
  { key: "solana_rpc_mainnet_fallback_1", label: "Mainnet — Fallback 1", placeholder: "https://rpc.ankr.com/solana", isMainnet: true },
  { key: "solana_rpc_mainnet_fallback_2", label: "Mainnet — Fallback 2", placeholder: "https://api.mainnet-beta.solana.com", isMainnet: true },
];

const PRESETS = [
  { label: "Helius", url: "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY" },
  { label: "QuickNode", url: "https://YOUR-NAME.solana-mainnet.quiknode.pro/YOUR_TOKEN/" },
  { label: "Triton One", url: "https://YOUR.rpcpool.com/" },
  { label: "Ankr (free)", url: "https://rpc.ankr.com/solana" },
];

type Probe = { ok?: boolean; latencyMs?: number; error?: string; loading?: boolean };

type RpcMultiPresetEditorProps = {
  onSaveSetting: (key: string, value: string, savingKey: string) => Promise<void>;
};

export function RpcMultiPresetEditor({ onSaveSetting }: RpcMultiPresetEditorProps) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [active, setActive] = useState("primary");
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [probes, setProbes] = useState<Record<string, Probe>>({});

  useEffect(() => { void load(); }, []);
  async function load() {
    const { data } = await supabase.from("admin_settings").select("key,value")
      .in("key", [...KEYS.map(k => k.key), "solana_rpc_active_preset"]);
    const m: Record<string, string> = {};
    (data ?? []).forEach((r: any) => { m[r.key] = r.value; });
    setVals(m); setActive(m["solana_rpc_active_preset"] || "primary");
  }

  async function saveOne(key: string, value: string) {
    setSavingKey(key);
    await onSaveSetting(key, value, key);
    clearRpcCache();
    setSavingKey(null); setSavedKey(key); setTimeout(() => setSavedKey(null), 1500);
    void load();
  }
  async function saveActive(v: string) {
    setActive(v);
    await onSaveSetting("solana_rpc_active_preset", v, "solana_rpc_active_preset");
    clearRpcCache();
  }
  async function probe(key: string) {
    const url = vals[key]?.trim(); if (!url) return;
    setProbes(p => ({ ...p, [key]: { loading: true } }));
    const r = await testRpc(url);
    setProbes(p => ({ ...p, [key]: r }));
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-bold text-muted-foreground block mb-1">Active mainnet preset</label>
        <div className="grid grid-cols-3 gap-1">
          {[["primary", "Primary"], ["fallback_1", "Fallback 1"], ["fallback_2", "Fallback 2"]].map(([k, l]) => (
            <button key={k} onClick={() => saveActive(k)}
              className="px-2 py-1.5 rounded-lg text-[11px] font-bold border transition-all"
              style={{
                background: active === k ? "hsl(var(--purple) / 0.2)" : "hsl(var(--surface-2))",
                borderColor: active === k ? "hsl(var(--purple) / 0.4)" : "hsl(var(--border))",
                color: active === k ? "hsl(var(--purple))" : "hsl(var(--muted-foreground))",
              }}>{l}</button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[11px] font-bold text-muted-foreground block mb-1">Quick presets (paste your URL into a slot below)</label>
        <div className="grid grid-cols-2 gap-1">
          {PRESETS.map(p => (
            <div key={p.label} className="text-[10px] px-2 py-1.5 rounded text-muted-foreground font-mono truncate"
              style={{ background: "hsl(var(--surface-2))" }}>{p.label}</div>
          ))}
        </div>
      </div>

      {KEYS.map(k => {
        const probeR = probes[k.key];
        return (
          <div key={k.key} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-muted-foreground">{k.label}</label>
              {probeR && !probeR.loading && (
                probeR.ok
                  ? <span className="text-[10px] flex items-center gap-1" style={{ color: "hsl(120 70% 50%)" }}><Check className="w-3 h-3" /> {probeR.latencyMs}ms</span>
                  : <span className="text-[10px] flex items-center gap-1 truncate max-w-[60%]" title={probeR.error} style={{ color: "hsl(var(--destructive))" }}><AlertCircle className="w-3 h-3" /> {probeR.error?.slice(0, 40)}</span>
              )}
            </div>
            <div className="flex gap-1">
              <input type="text" value={vals[k.key] ?? ""} onChange={e => setVals(v => ({ ...v, [k.key]: e.target.value }))}
                placeholder={k.placeholder}
                className="flex-1 bg-surface-2 border border-border rounded-lg px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:border-purple"
                style={{ color: "hsl(var(--foreground))" }} />
              <button type="button" onClick={() => probe(k.key)} disabled={!vals[k.key]?.trim() || probeR?.loading}
                className="px-2 py-1.5 rounded-lg text-[10px] font-bold border" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--cyan))" }}
                title="Test RPC">
                {probeR?.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              </button>
              <button type="button" onClick={() => saveOne(k.key, vals[k.key]?.trim() ?? "")} disabled={savingKey === k.key}
                className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white"
                style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))" }}>
                {savedKey === k.key ? <Check className="w-3 h-3" /> : "Save"}
              </button>
            </div>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground">If you see <span className="font-mono">"API key is not allowed to access blockchain"</span> (403), your provider account doesn't have Solana enabled. Use a Solana-specific key from Helius / QuickNode / Triton, or Ankr free tier as fallback.</p>
    </div>
  );
}
