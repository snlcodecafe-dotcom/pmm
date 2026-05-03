import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Wallet, Check, Eye, EyeOff, ArrowLeft,
  Activity, Users, TrendingUp, Copy, Server, ExternalLink, RefreshCw,
  BarChart3, Settings, Send, MessageSquare, Twitter, Target, Zap,
  ToggleLeft, ToggleRight, Rocket, Clock, Search, Crown, Star,
  AlertTriangle, ChevronRight, Globe, Key, Power, Gauge, Save, Plus, Minus, DollarSign, Edit3,
  Camera, Hash, Bot,
  Sparkles, CalendarClock, Vote, Play, Pause, Trash2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { PLAN_CONFIG, FAKE_STATS, FEATURE_LABELS, type PlanKey, type FeatureName, type FeatureValue, type PlanConfig } from "@/lib/planConfig";
import { DEFAULT_PACKAGES, type PackageConfig } from "@/hooks/usePackages";
import { RpcMultiPresetEditor } from "@/components/RpcMultiPresetEditor";
import { AdminUsersTab } from "@/components/admin/AdminUsersTab";
import { AccountsTab } from "@/components/admin/AccountsTab";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type AdminTab = "overview" | "settings" | "submissions" | "campaigns" | "analytics" | "distribution" | "plans" | "integrations" | "viral" | "tg-users" | "scheduler" | "engagement" | "users" | "accounts" | "auto-promote";

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
      style={{
        background: active ? "hsl(var(--purple) / 0.2)" : "transparent",
        color: active ? "hsl(var(--purple))" : "hsl(var(--muted-foreground))",
        border: active ? "1px solid hsl(var(--purple) / 0.4)" : "1px solid transparent",
      }}>
      {icon} <span>{label}</span>
    </button>
  );
}

function SCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}
      style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
      {children}
    </div>
  );
}

function CredentialField({ label, value, onChange, placeholder, masked = true, saving, saved, onSave, savingKey }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
  masked?: boolean; saving: string | null; saved: string | null; onSave: () => void; savingKey: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground block">{label}</label>
      <div className="relative">
        <input
          type={masked && !show ? "password" : "text"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-purple transition-colors pr-16"
          style={{ color: "hsl(var(--foreground))" }}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {masked && (
            <button type="button" onClick={() => setShow(!show)} className="text-muted-foreground p-1 hover:text-foreground">
              {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>
      <button onClick={onSave} disabled={saving === savingKey || !value.trim()}
        className="w-full py-2 rounded-lg font-bold text-xs text-white transition-all active:scale-95 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))" }}>
        {saved === savingKey ? <span className="flex items-center justify-center gap-1"><Check className="w-3 h-3" /> Saved!</span> : saving === savingKey ? "Saving..." : "Save"}
      </button>
    </div>
  );
}

function IntegrationToggle({ label, icon, enabled, onToggle, color, description }: {
  label: string; icon: React.ReactNode; enabled: boolean; onToggle: () => void; color: string; description: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "hsl(var(--surface-2))", border: `1px solid ${enabled ? color + "40" : "hsl(var(--border))"}` }}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold">{label}</div>
          <div className="text-[10px] text-muted-foreground">{description}</div>
        </div>
      </div>
      <button onClick={onToggle}
        className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
        style={{
          background: enabled ? "hsl(120 70% 50% / 0.15)" : "hsl(0 80% 60% / 0.12)",
          color: enabled ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)",
          border: `1px solid ${enabled ? "hsl(120 70% 50% / 0.3)" : "hsl(0 80% 60% / 0.2)"}`,
        }}>
        {enabled ? <><Power className="w-3.5 h-3.5" /> ON</> : <><Power className="w-3.5 h-3.5" /> OFF</>}
      </button>
    </div>
  );
}

function TestConnectionBtn({ platform, color, testing, result, onTest }: {
  platform: string; color: string;
  testing: boolean;
  result?: { success: boolean; message?: string; error?: string; resolution?: string };
  onTest: () => void;
}) {
  return (
    <div className="mt-4">
      <button onClick={onTest} disabled={testing}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
        style={{ background: testing ? "hsl(var(--muted))" : color }}>
        {testing ? (
          <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing Connection...</>
        ) : (
          <><Zap className="w-3.5 h-3.5" /> Test Connection</>
        )}
      </button>
      {result && (
        <div className="mt-3 p-3 rounded-xl text-xs" style={{
          background: result.success ? "hsl(120 70% 50% / 0.08)" : "hsl(0 80% 60% / 0.08)",
          border: `1px solid ${result.success ? "hsl(120 70% 50% / 0.25)" : "hsl(0 80% 60% / 0.25)"}`,
        }}>
          <div className="flex items-center gap-2 mb-1">
            {result.success ? (
              <Check className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(120 70% 50%)" }} />
            ) : (
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(0 80% 60%)" }} />
            )}
            <span className="font-bold" style={{ color: result.success ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)" }}>
              {result.success ? "Connection Successful" : "Connection Failed"}
            </span>
          </div>
          <p style={{ color: result.success ? "hsl(120 60% 70%)" : "hsl(var(--foreground))" }}>
            {result.success ? result.message : result.error}
          </p>
          {result.resolution && (
            <div className="mt-2 p-2 rounded-lg text-[11px]" style={{ background: "hsl(45 100% 55% / 0.08)", border: "1px solid hsl(45 100% 55% / 0.15)" }}>
              <span className="font-bold" style={{ color: "hsl(45 100% 55%)" }}>💡 How to fix: </span>
              <span className="text-muted-foreground">{result.resolution}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const FEATURE_OPTIONS: FeatureValue[] = [false, true, "limited", "basic", "standard", "enhanced", "extended", "priority", "advanced", "full"];

function FeatureSelect({ value, onChange }: { value: FeatureValue; onChange: (v: FeatureValue) => void }) {
  return (
    <select
      value={String(value)}
      onChange={e => {
        const v = e.target.value;
        if (v === "true") onChange(true);
        else if (v === "false") onChange(false);
        else onChange(v as FeatureValue);
      }}
      className="bg-surface-2 border border-border rounded px-2 py-1 text-[11px] focus:outline-none focus:border-purple min-w-[80px]"
      style={{ color: "hsl(var(--foreground))" }}
    >
      {FEATURE_OPTIONS.map(opt => (
        <option key={String(opt)} value={String(opt)}>
          {opt === false ? "✗ Off" : opt === true ? "✓ On" : String(opt)}
        </option>
      ))}
    </select>
  );
}

function PackagesEditor({ password }: { password: string }) {
  const [packages, setPackages] = useState<PackageConfig[]>(() => JSON.parse(JSON.stringify(DEFAULT_PACKAGES)));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("value")
        .eq("key", "packages_config")
        .single();
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value) as PackageConfig[];
          if (Array.isArray(parsed) && parsed.length > 0) setPackages(parsed);
        } catch {}
      }
    })();
  }, []);

  const updatePkg = (idx: number, field: keyof PackageConfig, value: any) => {
    setPackages(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const updateFeature = (idx: number, fIdx: number, value: string) => {
    setPackages(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const features = [...p.features];
      features[fIdx] = value;
      return { ...p, features };
    }));
  };

  const addFeature = (idx: number) => {
    setPackages(prev => prev.map((p, i) => i === idx ? { ...p, features: [...p.features, "New feature"] } : p));
  };

  const removeFeature = (idx: number, fIdx: number) => {
    setPackages(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      return { ...p, features: p.features.filter((_, j) => j !== fIdx) };
    }));
  };

  const addPackage = () => {
    const id = `pkg_${Date.now()}`;
    setPackages(prev => [...prev, {
      key: id, name: "New Package", price: "0.1 SOL", priceSol: 0.1, duration: "1 hour",
      color: "var(--purple)", popular: false, icon: "📦", dbPromotionType: "basic",
      features: ["Feature 1"], deliverables: "Description of deliverables", platforms: ["Telegram"],
    }]);
  };

  const removePackage = (idx: number) => {
    if (packages.length <= 1) return;
    setPackages(prev => prev.filter((_, i) => i !== idx));
  };

  const movePackage = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= packages.length) return;
    setPackages(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({ key: "packages_config", value: JSON.stringify(packages), password }),
      });
      const d = await res.json();
      if (res.ok && d.success) { setSaved(true); setTimeout(() => setSaved(false), 2500); }
    } catch (err) { console.error("Save packages error:", err); }
    setSaving(false);
  };

  const PLATFORM_OPTIONS = ["Telegram", "Twitter/X", "Discord", "Instagram", "Reddit"];
  const COLOR_OPTIONS = [
    { label: "Cyan", value: "var(--cyan)" },
    { label: "Purple", value: "var(--purple)" },
    { label: "Gold", value: "45 100% 55%" },
    { label: "Green", value: "120 60% 50%" },
    { label: "Red", value: "0 80% 60%" },
  ];
  const DB_TYPE_OPTIONS = ["basic", "advanced", "premium"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">📦 Promotion Packages Manager</h2>
          <p className="text-sm text-muted-foreground">Add, remove, and edit packages. Changes apply to the landing page and campaign engine.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addPackage}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))" }}>
            <Plus className="w-3.5 h-3.5" /> Add Package
          </button>
          <button onClick={saveAll} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs text-white transition-all active:scale-95 disabled:opacity-50"
            style={{ background: saved ? "hsl(120 70% 40%)" : "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))" }}>
            {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : saving ? "Saving..." : <><Save className="w-3.5 h-3.5" /> Save All</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {packages.map((pkg, idx) => (
          <SCard key={pkg.key} className="relative">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <input value={pkg.icon} onChange={e => updatePkg(idx, "icon", e.target.value)}
                  className="w-8 text-center text-xl bg-transparent border-b border-transparent hover:border-border focus:border-purple focus:outline-none" />
                <input value={pkg.name} onChange={e => updatePkg(idx, "name", e.target.value)}
                  className="bg-transparent font-black text-lg border-b border-transparent hover:border-border focus:border-purple focus:outline-none w-full transition-colors"
                  style={{ color: `hsl(${pkg.color})` }} />
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => movePackage(idx, -1)} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5 rotate-180" /></button>
                <button onClick={() => movePackage(idx, 1)} disabled={idx === packages.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                <button onClick={() => removePackage(idx)} disabled={packages.length <= 1}
                  className="p-1 text-muted-foreground hover:text-red-500 disabled:opacity-30"><Minus className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Price Label</label>
                <input value={pkg.price} onChange={e => updatePkg(idx, "price", e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-2 text-xs font-bold focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Price (SOL)</label>
                <input type="number" step="0.01" min="0" value={pkg.priceSol}
                  onChange={e => updatePkg(idx, "priceSol", parseFloat(e.target.value) || 0)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-2 text-xs font-mono focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }} />
              </div>
            </div>

            {/* Duration + DB Type */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Duration</label>
                <input value={pkg.duration} onChange={e => updatePkg(idx, "duration", e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }} />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">DB Promo Type</label>
                <select value={pkg.dbPromotionType} onChange={e => updatePkg(idx, "dbPromotionType", e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }}>
                  {DB_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Color + Popular */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Color</label>
                <select value={pkg.color} onChange={e => updatePkg(idx, "color", e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }}>
                  {COLOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pkg.popular} onChange={e => updatePkg(idx, "popular", e.target.checked)}
                    className="rounded border-border" />
                  <span className="text-xs font-semibold text-muted-foreground">⭐ Popular Badge</span>
                </label>
              </div>
            </div>

            {/* Deliverables */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Deliverables Summary</label>
              <input value={pkg.deliverables} onChange={e => updatePkg(idx, "deliverables", e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-purple"
                style={{ color: "hsl(var(--foreground))" }} />
            </div>

            {/* Platforms */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Platforms</label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map(pl => (
                  <label key={pl} className="flex items-center gap-1 text-[11px] cursor-pointer">
                    <input type="checkbox" checked={pkg.platforms.includes(pl)}
                      onChange={e => {
                        const platforms = e.target.checked ? [...pkg.platforms, pl] : pkg.platforms.filter(x => x !== pl);
                        updatePkg(idx, "platforms", platforms);
                      }} className="rounded border-border" />
                    {pl}
                  </label>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="mb-3">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Features</label>
              <div className="space-y-1.5">
                {pkg.features.map((f, fIdx) => (
                  <div key={fIdx} className="flex items-center gap-1.5">
                    <input value={f} onChange={e => updateFeature(idx, fIdx, e.target.value)}
                      className="flex-1 bg-surface-2 border border-border rounded px-2 py-1.5 text-[11px] focus:outline-none focus:border-purple"
                      style={{ color: "hsl(var(--foreground))" }} />
                    <button onClick={() => removeFeature(idx, fIdx)} className="text-muted-foreground hover:text-red-500 p-0.5"><Minus className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => addFeature(idx)}
                className="mt-2 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors"
                style={{ color: "hsl(var(--purple))", background: "hsl(var(--purple) / 0.08)" }}>
                <Plus className="w-3 h-3" /> Add Feature
              </button>
            </div>
          </SCard>
        ))}
      </div>

      {/* Reset to defaults */}
      <SCard>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">Reset to Defaults</h3>
            <p className="text-xs text-muted-foreground">Restore all packages to their original configuration.</p>
          </div>
          <button onClick={() => setPackages(JSON.parse(JSON.stringify(DEFAULT_PACKAGES)))}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{ background: "hsl(0 80% 60% / 0.12)", color: "hsl(0 80% 60%)", border: "1px solid hsl(0 80% 60% / 0.2)" }}>
            Reset All
          </button>
        </div>
      </SCard>
    </div>
  );
}

export default function Admin() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Settings
  const [adminWallet, setAdminWallet] = useState("");
  const [newWallet, setNewWallet] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [newRpcUrl, setNewRpcUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [statsMode, setStatsMode] = useState<"fake" | "live">("fake");

  // Integration credentials
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramCooldown, setTelegramCooldown] = useState("60");
  const [telegramMaxPosts, setTelegramMaxPosts] = useState("1");
  const [partnerBotUsername, setPartnerBotUsername] = useState("promotememes_bot");
  const [partnerMainChannelUsername, setPartnerMainChannelUsername] = useState("promotememesai");

  const [discordToken, setDiscordToken] = useState("");
  const [discordEnabled, setDiscordEnabled] = useState(false);

  const [twitterConsumerKey, setTwitterConsumerKey] = useState("");
  const [twitterConsumerSecret, setTwitterConsumerSecret] = useState("");
  const [twitterAccessToken, setTwitterAccessToken] = useState("");
  const [twitterAccessTokenSecret, setTwitterAccessTokenSecret] = useState("");
  const [twitterEnabled, setTwitterEnabled] = useState(false);
  const [twitterPostsPerDay, setTwitterPostsPerDay] = useState("12");

  // Instagram
  const [instagramAccessToken, setInstagramAccessToken] = useState("");
  const [instagramPageId, setInstagramPageId] = useState("");
  const [instagramEnabled, setInstagramEnabled] = useState(false);
  const [instagramPostsPerDay, setInstagramPostsPerDay] = useState("6");

  // Reddit
  const [redditClientId, setRedditClientId] = useState("");
  const [redditClientSecret, setRedditClientSecret] = useState("");
  const [redditUsername, setRedditUsername] = useState("");
  const [redditPassword, setRedditPasswordState] = useState("");
  const [redditEnabled, setRedditEnabled] = useState(false);
  const [redditSubreddits, setRedditSubreddits] = useState("CryptoMoonShots,SatoshiStreetBets");
  const [redditPostDelay, setRedditPostDelay] = useState("30");

  // Message templates per platform
  const DEFAULT_RICH_TEMPLATE = "🚨 NEW GEM ALERT 🚨\n\n🐸 {{TOKEN_NAME}} (${{TOKEN_SYMBOL}})\n\n📜 CA: `{{TOKEN_ADDRESS}}`\n\n💰 MC: ${{MARKET_CAP}} | 💧 LP: ${{LIQUIDITY}}\n📈 Vol: ${{VOLUME_24H}} | 👥 {{HOLDERS}} Holders\n\n🔥 {{AUTO_HYPE_LINE}}\n\n🖼️ {{TOKEN_IMAGE_URL}}\n📊 Chart: {{DEXSCREENER_URL}}\n\n[📊 View Chart]({{DEXSCREENER_URL}}) | [🚀 Buy Now]({{BUY_LINK}})\n\n🚀 Don't fade early alpha.\n\n#Memecoin #CryptoGem #Solana";
  const [msgTemplates, setMsgTemplates] = useState<Record<string, string>>({
    telegram: DEFAULT_RICH_TEMPLATE,
    discord: DEFAULT_RICH_TEMPLATE,
    twitter: "🚨 NEW GEM ALERT 🚨\n\n🐸 {{TOKEN_NAME}} (${{TOKEN_SYMBOL}})\n\n📜 CA: {{TOKEN_ADDRESS}}\n\n💰 MC: ${{MARKET_CAP}} | 💧 LP: ${{LIQUIDITY}}\n📈 Vol: ${{VOLUME_24H}} | 👥 {{HOLDERS}} Holders\n\n🔥 {{AUTO_HYPE_LINE}}\n\n📊 {{DEXSCREENER_URL}}\n🚀 {{BUY_LINK}}\n\n#Memecoin #CryptoGem #Solana",
    instagram: "🚨 NEW GEM ALERT 🚨\n\n🐸 {{TOKEN_NAME}} (${{TOKEN_SYMBOL}})\n\n📜 CA: {{TOKEN_ADDRESS}}\n\n💰 MC: ${{MARKET_CAP}} | 💧 LP: ${{LIQUIDITY}}\n📈 Vol: ${{VOLUME_24H}} | 👥 {{HOLDERS}} Holders\n\n🔥 {{AUTO_HYPE_LINE}}\n\n📊 Chart: {{DEXSCREENER_URL}}\n\n🚀 Don't fade early alpha.\n\n#Memecoin #CryptoGem #Solana #{{TOKEN_SYMBOL}}",
    reddit: "# 🚨 NEW GEM ALERT — {{TOKEN_NAME}} (${{TOKEN_SYMBOL}})\n\n**CA:** {{TOKEN_ADDRESS}}\n\n💰 Market Cap: ${{MARKET_CAP}} | 💧 Liquidity: ${{LIQUIDITY}}\n📈 24h Volume: ${{VOLUME_24H}} | 👥 {{HOLDERS}} Holders\n\n🔥 {{AUTO_HYPE_LINE}}\n\n📊 [View Chart]({{DEXSCREENER_URL}}) | 🚀 [Buy Now]({{BUY_LINK}})\n\n🖼️ Token Image: {{TOKEN_IMAGE_URL}}\n\nDYOR! #Memecoin #Solana",
  });
  const [templateSending, setTemplateSending] = useState<string | null>(null);
  const [templateSent, setTemplateSent] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);
  const [connectionResults, setConnectionResults] = useState<Record<string, { success: boolean; message?: string; error?: string; resolution?: string }>>({});
  const [testTokenCA, setTestTokenCA] = useState("");
  const [testTokenData, setTestTokenData] = useState<Record<string, string> | null>(null);
  const [fetchingTokenData, setFetchingTokenData] = useState(false);

  const fetchTestTokenData = async () => {
    if (!testTokenCA.trim()) return;
    setFetchingTokenData(true);
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${testTokenCA.trim()}`);
      const data = await res.json();
      const pair = data.pairs?.[0];
      if (!pair) { alert("❌ Token not found on DexScreener"); setFetchingTokenData(false); return; }
      const hypeLines = ["Stealth launch 🚀", "Whales accumulating 🐳", "Trending on Dexscreener 📈", "Community growing fast 🔥", "Diamond hands only 💎", "Early alpha detected 🧠"];
      setTestTokenData({
        TOKEN_NAME: pair.baseToken?.name || "Unknown",
        TOKEN_SYMBOL: pair.baseToken?.symbol || "???",
        TOKEN_ADDRESS: testTokenCA.trim(),
        MARKET_CAP: pair.marketCap ? Number(pair.marketCap).toLocaleString() : "N/A",
        LIQUIDITY: pair.liquidity?.usd ? Number(pair.liquidity.usd).toLocaleString() : "N/A",
        VOLUME_24H: pair.volume?.h24 ? Number(pair.volume.h24).toLocaleString() : "N/A",
        HOLDERS: pair.holders?.toString() || "N/A",
        AUTO_HYPE_LINE: hypeLines[Math.floor(Math.random() * hypeLines.length)],
        TOKEN_IMAGE_URL: pair.info?.imageUrl || `https://dd.dexscreener.com/ds-data/tokens/solana/${testTokenCA.trim()}.png`,
        DEXSCREENER_URL: `https://dexscreener.com/solana/${testTokenCA.trim()}`,
        BUY_LINK: `https://jup.ag/swap/SOL-${testTokenCA.trim()}`,
      });
    } catch (err) {
      alert(`❌ Error fetching token data: ${err}`);
    }
    setFetchingTokenData(false);
  };

  const resolveTemplate = (template: string, data?: Record<string, string> | null) => {
    const d = data || {
      TOKEN_NAME: "Dogecoin", TOKEN_SYMBOL: "DOGE",
      TOKEN_ADDRESS: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      MARKET_CAP: "1,250,000", LIQUIDITY: "85,000", VOLUME_24H: "320,000",
      HOLDERS: "2,451", AUTO_HYPE_LINE: "Stealth launch 🚀",
      TOKEN_IMAGE_URL: "https://dd.dexscreener.com/ds-data/tokens/solana/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263.png",
      DEXSCREENER_URL: "https://dexscreener.com/solana/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      BUY_LINK: "https://jup.ag/swap/SOL-DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    };
    let result = template;
    Object.entries(d).forEach(([key, val]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
    });
    return result;
  };

  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  // Data
  const [stats, setStats] = useState({ total: 0, active: 0, revenue: 0, basic: 0, advanced: 0, premium: 0 });
  const [submissions, setSubmissions] = useState<{
    id: string; token_symbol: string | null; token_address: string;
    promotion_type: string; price_sol: number; status: string;
    wallet_address: string | null; created_at: string; tx_signature: string | null;
    views: number | null; engagement_score: number | null; campaign_status?: string;
  }[]>([]);
  const [campaigns, setCampaigns] = useState<{
    id: string; name: string; campaign_type: string; status: string;
    token_symbol: string | null; current_participants: number | null;
    target_participants: number | null; end_time: string | null; created_at: string;
  }[]>([]);
  const [socialPosts, setSocialPosts] = useState<{
    id: string; platform: string; post_text: string; views: number | null;
    likes: number | null; shares: number | null; created_at: string;
  }[]>([]);
  const [botLogs, setBotLogs] = useState<{
    id: string; token_symbol: string; platform: string; action_type: string;
    action_detail: string; status: string; created_at: string;
  }[]>([]);
  const [chartData, setChartData] = useState<{ day: string; submissions: number; revenue: number }[]>([]);

  // Distribution management
  const [telegramGroups, setTelegramGroups] = useState<{
    id: string; chat_id: string; group_name: string; category: string;
    is_active: boolean; last_post_at: string | null; cooldown_minutes: number; total_posts: number;
  }[]>([]);
  const [discordWebhooks, setDiscordWebhooks] = useState<{
    id: string; webhook_url: string; server_name: string; channel_name: string;
    is_active: boolean; last_post_at: string | null; total_posts: number;
  }[]>([]);
  const [executionLogs, setExecutionLogs] = useState<{
    id: string; platform: string; action_type: string; status: string;
    external_url: string | null; error_message: string | null; executed_at: string;
    request_payload: any; response_payload: any;
  }[]>([]);
  const [newGroupChatId, setNewGroupChatId] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCategory, setNewGroupCategory] = useState("general");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookServer, setNewWebhookServer] = useState("");
  const [newWebhookChannel, setNewWebhookChannel] = useState("");

  // Viral content engine state
  const [viralContent, setViralContent] = useState<any[]>([]);
  const [tgBotUsers, setTgBotUsers] = useState<any[]>([]);
  const [contentSchedules, setContentSchedules] = useState<any[]>([]);
  const [engagementActions, setEngagementActions] = useState<any[]>([]);
  const [generateCA, setGenerateCA] = useState("");
  const [generating, setGenerating] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.from("admin_settings").select("value").eq("key", "admin_password").single();
    if (data?.value === password) {
      setAuthed(true);
      setAuthError("");
      loadData();
    } else {
      setAuthError("Incorrect password");
    }
  }

  const loadData = useCallback(async () => {
    const [walletRes, rpcRes, statsModeRes, subsRes, campRes, postsRes, botsRes, tgGroupsRes, dcWebhooksRes, execLogsRes] = await Promise.all([
      supabase.from("admin_settings").select("value").eq("key", "admin_wallet").single(),
      supabase.from("admin_settings").select("value").eq("key", "solana_rpc_url").single(),
      supabase.from("admin_settings").select("value").eq("key", "stats_mode").single(),
      supabase.from("token_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("social_posts").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("bot_activity_log").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("telegram_groups").select("*").order("created_at", { ascending: false }),
      supabase.from("discord_webhooks").select("*").order("created_at", { ascending: false }),
      supabase.from("campaign_execution_logs").select("*").order("executed_at", { ascending: false }).limit(100),
    ]);

    // Load integration settings
    const integrationKeys = [
      "telegram_bot_token", "telegram_enabled", "telegram_cooldown_minutes", "telegram_max_posts_per_hour", "partner_bot_username", "partner_main_channel_username",
      "discord_bot_token", "discord_enabled",
      "twitter_consumer_key", "twitter_consumer_secret", "twitter_access_token", "twitter_access_token_secret",
      "twitter_enabled", "twitter_posts_per_day",
      "instagram_access_token", "instagram_page_id", "instagram_enabled", "instagram_posts_per_day",
      "reddit_client_id", "reddit_client_secret", "reddit_username", "reddit_password",
      "reddit_enabled", "reddit_subreddits", "reddit_post_delay_minutes",
      "msg_template_telegram", "msg_template_discord", "msg_template_twitter", "msg_template_instagram", "msg_template_reddit",
    ];
    const { data: intSettings } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", integrationKeys);

    const intMap: Record<string, string> = {};
    intSettings?.forEach(s => { intMap[s.key] = s.value; });

    if (intMap.telegram_bot_token) setTelegramToken(intMap.telegram_bot_token);
    setTelegramEnabled(intMap.telegram_enabled === "true");
    if (intMap.telegram_cooldown_minutes) setTelegramCooldown(intMap.telegram_cooldown_minutes);
    if (intMap.telegram_max_posts_per_hour) setTelegramMaxPosts(intMap.telegram_max_posts_per_hour);
    if (intMap.partner_bot_username) setPartnerBotUsername(intMap.partner_bot_username.replace(/^@/, ""));
    if (intMap.partner_main_channel_username) setPartnerMainChannelUsername(intMap.partner_main_channel_username.replace(/^@/, ""));

    if (intMap.discord_bot_token) setDiscordToken(intMap.discord_bot_token);
    setDiscordEnabled(intMap.discord_enabled === "true");

    if (intMap.twitter_consumer_key) setTwitterConsumerKey(intMap.twitter_consumer_key);
    if (intMap.twitter_consumer_secret) setTwitterConsumerSecret(intMap.twitter_consumer_secret);
    if (intMap.twitter_access_token) setTwitterAccessToken(intMap.twitter_access_token);
    if (intMap.twitter_access_token_secret) setTwitterAccessTokenSecret(intMap.twitter_access_token_secret);
    setTwitterEnabled(intMap.twitter_enabled === "true");
    if (intMap.twitter_posts_per_day) setTwitterPostsPerDay(intMap.twitter_posts_per_day);

    if (intMap.instagram_access_token) setInstagramAccessToken(intMap.instagram_access_token);
    if (intMap.instagram_page_id) setInstagramPageId(intMap.instagram_page_id);
    setInstagramEnabled(intMap.instagram_enabled === "true");
    if (intMap.instagram_posts_per_day) setInstagramPostsPerDay(intMap.instagram_posts_per_day);

    if (intMap.reddit_client_id) setRedditClientId(intMap.reddit_client_id);
    if (intMap.reddit_client_secret) setRedditClientSecret(intMap.reddit_client_secret);
    if (intMap.reddit_username) setRedditUsername(intMap.reddit_username);
    if (intMap.reddit_password) setRedditPasswordState(intMap.reddit_password);
    setRedditEnabled(intMap.reddit_enabled === "true");
    if (intMap.reddit_subreddits) setRedditSubreddits(intMap.reddit_subreddits);
    if (intMap.reddit_post_delay_minutes) setRedditPostDelay(intMap.reddit_post_delay_minutes);

    // Load message templates
    const templatePlatforms = ["telegram", "discord", "twitter", "instagram", "reddit"];
    const loadedTemplates: Record<string, string> = {};
    templatePlatforms.forEach(p => {
      if (intMap[`msg_template_${p}`]) loadedTemplates[p] = intMap[`msg_template_${p}`];
    });
    if (Object.keys(loadedTemplates).length > 0) {
      setMsgTemplates(prev => ({ ...prev, ...loadedTemplates }));
    }

    if (walletRes.data) setAdminWallet(walletRes.data.value);
    if (rpcRes.data) setRpcUrl(rpcRes.data.value);
    if (statsModeRes.data) setStatsMode(statsModeRes.data.value as "fake" | "live");
    if (subsRes.data) {
      setSubmissions(subsRes.data as typeof submissions);
      const active = subsRes.data.filter(s => s.status === "active").length;
      const revenue = subsRes.data.reduce((sum, s) => sum + Number(s.price_sol || 0), 0);
      const basic = subsRes.data.filter(s => s.promotion_type === "basic").length;
      const advanced = subsRes.data.filter(s => s.promotion_type === "advanced").length;
      const premium = subsRes.data.filter(s => s.promotion_type === "premium").length;
      setStats({ total: subsRes.data.length, active, revenue, basic, advanced, premium });

      const now = Date.now();
      const cd = Array.from({ length: 7 }, (_, i) => {
        const dayStart = now - (6 - i) * 86400000;
        const dayEnd = dayStart + 86400000;
        const dayTokens = subsRes.data.filter(t => {
          const ts = new Date(t.created_at).getTime();
          return ts >= dayStart && ts < dayEnd;
        });
        return {
          day: new Date(dayStart).toLocaleDateString("en", { weekday: "short" }),
          submissions: dayTokens.length,
          revenue: dayTokens.reduce((s, t) => s + Number(t.price_sol || 0), 0),
        };
      });
      setChartData(cd);
    }
    if (campRes.data) setCampaigns(campRes.data as typeof campaigns);
    if (postsRes.data) setSocialPosts(postsRes.data as typeof socialPosts);
    if (botsRes.data) setBotLogs(botsRes.data as typeof botLogs);
    if (tgGroupsRes.data) setTelegramGroups(tgGroupsRes.data as typeof telegramGroups);
    if (dcWebhooksRes.data) setDiscordWebhooks(dcWebhooksRes.data as typeof discordWebhooks);
    if (execLogsRes.data) setExecutionLogs(execLogsRes.data as typeof executionLogs);

    // Load viral engine data
    const [viralRes, tgUsersRes, schedRes, engRes] = await Promise.all([
      supabase.from("viral_content").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("telegram_bot_users").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("content_schedule").select("*, viral_content(token_symbol, content_type)").order("scheduled_at", { ascending: false }).limit(50),
      supabase.from("engagement_actions").select("*, viral_content(token_symbol)").order("created_at", { ascending: false }).limit(50),
    ]);
    if (viralRes.data) setViralContent(viralRes.data);
    if (tgUsersRes.data) setTgBotUsers(tgUsersRes.data);
    if (schedRes.data) setContentSchedules(schedRes.data);
    if (engRes.data) setEngagementActions(engRes.data);
  }, []);

  async function adminUpdate(key: string, value: string, savingKey: string) {
    setSaving(savingKey);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
        body: JSON.stringify({ key, value, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(savingKey);
        setTimeout(() => setSaved(null), 2500);
        await loadData();
      } else {
        console.error("Admin update failed:", data.error);
        alert(`Save failed: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Admin update error:", err);
      alert(`Save error: ${String(err)}`);
    }
    setSaving(null);
  }

  const toggleStatsMode = () => {
    const newMode = statsMode === "fake" ? "live" : "fake";
    setStatsMode(newMode);
    localStorage.setItem("pm_stats_mode", newMode);
    adminUpdate("stats_mode", newMode, "stats_mode");
  };

  const copyText = (t: string) => navigator.clipboard.writeText(t);

  async function testConnection(platform: string) {
    setTestingConnection(platform);
    setConnectionResults(prev => ({ ...prev, [platform]: undefined as any }));
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
        body: JSON.stringify({ platform, password }),
      });
      const data = await res.json();
      setConnectionResults(prev => ({ ...prev, [platform]: data }));
    } catch (err) {
      setConnectionResults(prev => ({ ...prev, [platform]: { success: false, error: String(err) } }));
    }
    setTestingConnection(null);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    if (m < 1440) return `${Math.floor(m / 60)}h ago`;
    return `${Math.floor(m / 1440)}d ago`;
  }

  const RPC_PRESETS = [
    { label: "Ankr (Free)", url: "https://rpc.ankr.com/solana" },
    { label: "Helius", url: "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY" },
    { label: "QuickNode", url: "https://YOUR-ENDPOINT.quiknode.pro/YOUR_KEY/" },
    { label: "GenesysGo", url: "https://ssc-dao.genesysgo.net/" },
  ];

  // Tab order aligned with frontend information architecture:
  // 1) Insights  2) Growth content  3) Users  4) Promotions ops  5) Config
  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    // Insights
    { key: "overview", label: "Overview", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { key: "analytics", label: "Analytics", icon: <Activity className="w-3.5 h-3.5" /> },
    // Growth content
    { key: "viral", label: "Viral Content", icon: <Sparkles className="w-3.5 h-3.5" /> },
    { key: "scheduler", label: "Scheduler", icon: <CalendarClock className="w-3.5 h-3.5" /> },
    { key: "engagement", label: "Engagement", icon: <Vote className="w-3.5 h-3.5" /> },
    // Audience
    { key: "users", label: "Users", icon: <Users className="w-3.5 h-3.5" /> },
    { key: "tg-users", label: "TG Users", icon: <Users className="w-3.5 h-3.5" /> },
    // Promotions ops
    { key: "submissions", label: "Submissions", icon: <Rocket className="w-3.5 h-3.5" /> },
    { key: "campaigns", label: "Campaigns", icon: <Target className="w-3.5 h-3.5" /> },
    { key: "distribution", label: "Distribution", icon: <Globe className="w-3.5 h-3.5" /> },
    // Finance
    { key: "accounts", label: "Accounts", icon: <DollarSign className="w-3.5 h-3.5" /> },
    // Config
    { key: "plans", label: "Plans", icon: <Crown className="w-3.5 h-3.5" /> },
    { key: "integrations", label: "Integrations", icon: <Key className="w-3.5 h-3.5" /> },
    { key: "settings", label: "Settings", icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  // Integration status summary
  const integrationStatus = {
    telegram: telegramEnabled && !!telegramToken,
    discord: discordEnabled && !!discordToken,
    twitter: twitterEnabled && !!twitterConsumerKey && !!twitterAccessToken,
    instagram: instagramEnabled && !!instagramAccessToken,
    reddit: redditEnabled && !!redditClientId,
  };
  const activeIntegrations = Object.values(integrationStatus).filter(Boolean).length;

  // ── Login Screen ──
  if (!authed) return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(var(--background))" }}>
      <div className="w-full max-w-sm">
        <div className="card-glass rounded-2xl p-8" style={{ boxShadow: "0 0 60px hsl(var(--purple) / 0.2)" }}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan)))" }}>
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-lg">Admin Panel</div>
              <div className="text-xs text-muted-foreground">PromoteMyMemes</div>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full bg-surface-2 border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple transition-colors"
                  style={{ color: "hsl(var(--foreground))" }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {authError && <p className="text-xs mt-1.5" style={{ color: "hsl(0 85% 60%)" }}>{authError}</p>}
            </div>
            <button type="submit" className="w-full py-3 rounded-lg font-bold text-sm text-white transition-all active:scale-95" style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))" }}>
              Login
            </button>
          </form>
          <div className="mt-4 text-center">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 justify-center">
              <ArrowLeft className="w-3 h-3" /> Back to site
            </a>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Admin Dashboard ──
  return (
    <div className="min-h-screen" style={{ background: "hsl(var(--background))" }}>
      {/* Header */}
      <div className="sticky top-0 z-40 border-b" style={{ background: "hsl(var(--background) / 0.95)", backdropFilter: "blur(20px)", borderColor: "hsl(var(--border))" }}>
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan)))" }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-black text-lg">Admin Panel</span>
              <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">PromoteMyMemes</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Integration Status */}
            <div className="hidden md:flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg"
              style={{ background: "hsl(var(--surface-2))", color: "hsl(var(--muted-foreground))" }}>
              <span style={{ color: integrationStatus.telegram ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)" }}>TG</span>
              <span style={{ color: integrationStatus.discord ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)" }}>DC</span>
              <span style={{ color: integrationStatus.twitter ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)" }}>X</span>
              <span style={{ color: integrationStatus.instagram ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)" }}>IG</span>
              <span style={{ color: integrationStatus.reddit ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)" }}>RD</span>
            </div>
            {/* Fake/Live Toggle */}
            <button onClick={toggleStatsMode}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: statsMode === "live" ? "hsl(120 70% 50% / 0.15)" : "hsl(45 100% 55% / 0.15)",
                color: statsMode === "live" ? "hsl(120 70% 50%)" : "hsl(45 100% 55%)",
                border: `1px solid ${statsMode === "live" ? "hsl(120 70% 50% / 0.3)" : "hsl(45 100% 55% / 0.3)"}`,
              }}>
              {statsMode === "live"
                ? <><ToggleRight className="w-4 h-4" /> Live Stats</>
                : <><ToggleLeft className="w-4 h-4" /> Demo Stats</>}
            </button>
            <button onClick={loadData} className="p-2 rounded-lg hover:opacity-80" style={{ background: "hsl(var(--surface-2))" }} title="Refresh data">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => setActiveTab("settings")} title="Platform Settings"
              className="p-2 rounded-lg hover:opacity-80 flex items-center gap-1.5 text-xs font-semibold"
              style={{
                background: activeTab === "settings" ? "hsl(var(--purple) / 0.18)" : "hsl(var(--surface-2))",
                color: activeTab === "settings" ? "hsl(var(--purple))" : "hsl(var(--muted-foreground))",
              }}>
              <Settings className="w-4 h-4" />
              <span className="hidden md:inline">Settings</span>
            </button>
            <a href="/" className="p-2 rounded-lg hover:opacity-80 text-xs text-muted-foreground flex items-center gap-1" style={{ background: "hsl(var(--surface-2))" }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Site
            </a>
            <button onClick={() => setAuthed(false)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="container pb-2">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <TabBtn key={t.key} active={activeTab === t.key} onClick={() => setActiveTab(t.key)}
                icon={t.icon} label={t.label} />
            ))}
          </div>
        </div>
      </div>

      <div className="container py-6">
        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Integration alerts */}
            {activeIntegrations === 0 && (
              <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: "hsl(45 100% 55% / 0.08)", border: "1px solid hsl(45 100% 55% / 0.2)" }}>
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: "hsl(45 100% 55%)" }} />
                <div>
                  <div className="text-sm font-bold mb-1" style={{ color: "hsl(45 100% 55%)" }}>No Integrations Configured</div>
                  <p className="text-xs text-muted-foreground">Social distribution is inactive. Go to the <button onClick={() => setActiveTab("integrations")} className="underline font-semibold" style={{ color: "hsl(var(--purple))" }}>Integrations</button> tab to add your Telegram, Discord, and Twitter API credentials.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { icon: <Users className="w-4 h-4" />, label: "Total", value: stats.total, color: "hsl(var(--cyan))" },
                { icon: <Activity className="w-4 h-4" />, label: "Active", value: stats.active, color: "hsl(120 70% 50%)" },
                { icon: <TrendingUp className="w-4 h-4" />, label: "Revenue", value: `${stats.revenue.toFixed(3)} SOL`, color: "hsl(45 100% 55%)" },
                { icon: <Rocket className="w-4 h-4" />, label: "Starter", value: stats.basic, color: "hsl(var(--muted-foreground))" },
                { icon: <Star className="w-4 h-4" />, label: "Pro", value: stats.advanced, color: "hsl(var(--purple))" },
                { icon: <Crown className="w-4 h-4" />, label: "Ultra", value: stats.premium, color: "hsl(45 100% 55%)" },
              ].map((s, i) => (
                <SCard key={i}>
                  <div className="flex items-center gap-1.5 mb-2" style={{ color: s.color }}>{s.icon}</div>
                  <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
                </SCard>
              ))}
            </div>

            {/* Chart */}
            <SCard>
              <h3 className="font-bold text-sm mb-4">📊 7-Day Submissions</h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="day" tick={{ fill: "hsl(210 20% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(210 20% 55%)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(230 22% 9%)", border: "1px solid hsl(230 20% 16%)", borderRadius: 8, color: "#fff" }} />
                    <Bar dataKey="submissions" fill="hsl(270, 80%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SCard>

            {/* Recent Live Feed */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SCard>
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} /> Recent Social Posts
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {socialPosts.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No posts yet</p>
                  ) : socialPosts.slice(0, 8).map(p => (
                    <div key={p.id} className="flex items-start gap-2 px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
                      <div className="flex-shrink-0 mt-0.5">
                        {p.platform.toLowerCase().includes("twitter") ? <Twitter className="w-3 h-3" style={{ color: "hsl(210 100% 60%)" }} /> :
                         p.platform.toLowerCase().includes("telegram") ? <Send className="w-3 h-3" style={{ color: "hsl(200 90% 55%)" }} /> :
                         <MessageSquare className="w-3 h-3" style={{ color: "hsl(235 85% 65%)" }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{p.post_text}</p>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(p.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SCard>

              <SCard>
                <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: "hsl(var(--purple))" }} /> Bot Activity Log
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {botLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No activity yet</p>
                  ) : botLogs.slice(0, 8).map(b => (
                    <div key={b.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: "hsl(var(--cyan))" }}>${b.token_symbol}</span>
                        <span className="text-xs text-muted-foreground">{b.action_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: b.status === "live" ? "hsl(120 70% 50% / 0.12)" : "hsl(var(--muted))", color: b.status === "live" ? "hsl(120 70% 50%)" : "hsl(var(--muted-foreground))" }}>
                          {b.status}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(b.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SCard>
            </div>
          </div>
        )}

        {/* ── SUBMISSIONS TAB ── */}
        {activeTab === "submissions" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Token Submissions ({submissions.length})</h2>
              <button onClick={loadData} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            {submissions.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Rocket className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No submissions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Token", "Package", "Paid", "Status", "Views", "Wallet", "Tx", "Time"].map(h => (
                        <th key={h} className="text-left py-2 pr-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => (
                      <tr key={s.id} className="border-b border-border/40 hover:bg-surface-2 transition-colors">
                        <td className="py-2.5 pr-3">
                          <div className="font-bold text-xs" style={{ color: "hsl(var(--cyan))" }}>{s.token_symbol || "—"}</div>
                          <div className="font-mono text-xs text-muted-foreground truncate max-w-[100px]">{s.token_address.slice(0, 12)}...</div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="text-xs px-1.5 py-0.5 rounded font-bold capitalize" style={{
                            background: s.promotion_type === "premium" ? "hsl(45 100% 55% / 0.15)" : s.promotion_type === "advanced" ? "hsl(var(--purple) / 0.15)" : "hsl(var(--surface-2))",
                            color: s.promotion_type === "premium" ? "hsl(45 100% 55%)" : s.promotion_type === "advanced" ? "hsl(var(--purple))" : "hsl(var(--muted-foreground))"
                          }}>{s.promotion_type}</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="font-bold text-xs" style={{ color: Number(s.price_sol) > 0 ? "hsl(var(--cyan))" : "hsl(var(--muted-foreground))" }}>
                            {Number(s.price_sol) > 0 ? `${s.price_sol} SOL` : "Free"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{
                            background: s.status === "active" ? "hsl(var(--cyan) / 0.12)" : s.status === "completed" ? "hsl(120 70% 50% / 0.12)" : "hsl(var(--muted) / 0.5)",
                            color: s.status === "active" ? "hsl(var(--cyan))" : s.status === "completed" ? "hsl(120 70% 55%)" : "hsl(var(--muted-foreground))"
                          }}>{s.status}</span>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-muted-foreground">{s.views || 0}</td>
                        <td className="py-2.5 pr-3">
                          {s.wallet_address ? (
                            <span className="font-mono text-xs text-muted-foreground">{s.wallet_address.slice(0, 6)}...</span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5 pr-3">
                          {s.tx_signature ? (
                            <a href={`https://solscan.io/tx/${s.tx_signature}`} target="_blank" rel="noreferrer"
                              className="text-xs flex items-center gap-0.5" style={{ color: "hsl(var(--cyan))" }}>
                              View <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── CAMPAIGNS TAB ── */}
        {activeTab === "campaigns" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Campaign Management ({campaigns.length})</h2>
              <button onClick={loadData} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>
            {campaigns.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No campaigns yet</p>
                <p className="text-xs mt-1">Campaigns are auto-created when premium tokens are submitted</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaigns.map(c => {
                  const pct = Math.min(100, Math.round(((c.current_participants || 0) / (c.target_participants || 100)) * 100));
                  return (
                    <SCard key={c.id} className="relative overflow-hidden">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-black text-sm">{c.name}</h3>
                          <span className="text-xs text-muted-foreground">{c.campaign_type}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{
                          background: c.status === "active" ? "hsl(120 70% 50% / 0.12)" : "hsl(var(--muted))",
                          color: c.status === "active" ? "hsl(120 70% 50%)" : "hsl(var(--muted-foreground))"
                        }}>{c.status}</span>
                      </div>
                      {c.token_symbol && (
                        <span className="text-xs font-bold mb-2 inline-block" style={{ color: "hsl(var(--cyan))" }}>${c.token_symbol}</span>
                      )}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{c.current_participants || 0}/{c.target_participants || 100}</span>
                          <span className="font-semibold" style={{ color: "hsl(var(--cyan))" }}>{pct}%</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--surface-3))" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, hsl(var(--purple)), hsl(var(--cyan)))" }} />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</div>
                    </SCard>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <h2 className="text-xl font-black">📊 Platform Analytics (Full)</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Submissions", value: stats.total, color: "hsl(var(--purple))" },
                { label: "Revenue (SOL)", value: stats.revenue.toFixed(3), color: "hsl(var(--cyan))" },
                { label: "Active Promotions", value: stats.active, color: "hsl(120 70% 50%)" },
                { label: "Social Posts", value: socialPosts.length, color: "hsl(210 100% 60%)" },
                { label: "Bot Actions", value: botLogs.length, color: "hsl(var(--purple))" },
                { label: "Campaigns", value: campaigns.length, color: "hsl(45 100% 55%)" },
                { label: "Twitter Posts", value: socialPosts.filter(p => p.platform.toLowerCase().includes("twitter")).length, color: "hsl(210 100% 60%)" },
                { label: "Telegram Posts", value: socialPosts.filter(p => p.platform.toLowerCase().includes("telegram")).length, color: "hsl(200 90% 55%)" },
              ].map(s => (
                <SCard key={s.label}>
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                </SCard>
              ))}
            </div>

            {/* Platform breakdown */}
            <SCard>
              <h3 className="font-bold text-sm mb-4">Platform Distribution</h3>
              <div className="space-y-3">
                {[
                  { name: "Twitter/X", count: socialPosts.filter(p => p.platform.toLowerCase().includes("twitter")).length, color: "hsl(210 100% 60%)", icon: <Twitter className="w-4 h-4" /> },
                  { name: "Telegram", count: socialPosts.filter(p => p.platform.toLowerCase().includes("telegram")).length, color: "hsl(200 90% 55%)", icon: <Send className="w-4 h-4" /> },
                  { name: "Discord", count: socialPosts.filter(p => p.platform.toLowerCase().includes("discord")).length, color: "hsl(235 85% 65%)", icon: <MessageSquare className="w-4 h-4" /> },
                  { name: "Instagram", count: socialPosts.filter(p => p.platform.toLowerCase().includes("instagram")).length, color: "hsl(330 80% 60%)", icon: <Camera className="w-4 h-4" /> },
                  { name: "Reddit", count: socialPosts.filter(p => p.platform.toLowerCase().includes("reddit")).length, color: "hsl(16 100% 50%)", icon: <Hash className="w-4 h-4" /> },
                ].map(p => {
                  const total = Math.max(socialPosts.length, 1);
                  const pct = Math.round((p.count / total) * 100);
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: p.color }}>
                          {p.icon} {p.name}
                        </div>
                        <span className="text-xs text-muted-foreground">{p.count} posts ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--surface-3))" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </SCard>
          </div>
        )}

        {/* ── DISTRIBUTION TAB ── */}
        {activeTab === "distribution" && (
          <div className="space-y-6">
            <h2 className="text-xl font-black">🌐 Distribution Network</h2>
            <p className="text-sm text-muted-foreground">Manage Telegram groups and Discord webhooks for real content distribution.</p>

            {/* Status cards - All 5 platforms */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <SCard>
                <div className="text-center py-3">
                  <Send className="w-6 h-6 mx-auto mb-1.5" style={{ color: "hsl(200 90% 55%)" }} />
                  <h3 className="font-black text-xs mb-1">Telegram</h3>
                  <div className="text-2xl font-black" style={{ color: "hsl(200 90% 55%)" }}>{telegramGroups.filter(g => g.is_active).length}</div>
                  <div className="text-[10px] text-muted-foreground">active groups</div>
                </div>
              </SCard>
              <SCard>
                <div className="text-center py-3">
                  <MessageSquare className="w-6 h-6 mx-auto mb-1.5" style={{ color: "hsl(235 85% 65%)" }} />
                  <h3 className="font-black text-xs mb-1">Discord</h3>
                  <div className="text-2xl font-black" style={{ color: "hsl(235 85% 65%)" }}>{discordWebhooks.filter(w => w.is_active).length}</div>
                  <div className="text-[10px] text-muted-foreground">active webhooks</div>
                </div>
              </SCard>
              <SCard>
                <div className="text-center py-3">
                  <Twitter className="w-6 h-6 mx-auto mb-1.5" style={{ color: "hsl(210 100% 60%)" }} />
                  <h3 className="font-black text-xs mb-1">Twitter/X</h3>
                  <div className="text-2xl font-black" style={{ color: "hsl(210 100% 60%)" }}>{twitterEnabled ? "ON" : "OFF"}</div>
                  <div className="text-[10px] text-muted-foreground">{twitterPostsPerDay} posts/day</div>
                </div>
              </SCard>
              <SCard>
                <div className="text-center py-3">
                  <Camera className="w-6 h-6 mx-auto mb-1.5" style={{ color: "hsl(330 80% 55%)" }} />
                  <h3 className="font-black text-xs mb-1">Instagram</h3>
                  <div className="text-2xl font-black" style={{ color: "hsl(330 80% 55%)" }}>{instagramEnabled ? "ON" : "OFF"}</div>
                  <div className="text-[10px] text-muted-foreground">{instagramPostsPerDay} posts/day</div>
                </div>
              </SCard>
              <SCard>
                <div className="text-center py-3">
                  <Hash className="w-6 h-6 mx-auto mb-1.5" style={{ color: "hsl(16 100% 50%)" }} />
                  <h3 className="font-black text-xs mb-1">Reddit</h3>
                  <div className="text-2xl font-black" style={{ color: "hsl(16 100% 50%)" }}>{redditEnabled ? "ON" : "OFF"}</div>
                  <div className="text-[10px] text-muted-foreground">{redditSubreddits.split(",").length} subreddits</div>
                </div>
              </SCard>
            </div>

            {/* Add Telegram Group */}
            <SCard>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Send className="w-4 h-4" style={{ color: "hsl(200 90% 55%)" }} /> Add Telegram Group
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="text" value={newGroupChatId} onChange={e => setNewGroupChatId(e.target.value)}
                  placeholder="Chat ID (e.g. -1001234567890)"
                  className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }} />
                <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }} />
                <select value={newGroupCategory} onChange={e => setNewGroupCategory(e.target.value)}
                  className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }}>
                  <option value="general">General</option>
                  <option value="meme">Meme</option>
                  <option value="alpha">Alpha</option>
                  <option value="trading">Trading</option>
                </select>
                <button onClick={async () => {
                  if (!newGroupChatId.trim() || !newGroupName.trim()) return;
                  await supabase.from("telegram_groups").insert({
                    chat_id: newGroupChatId.trim(),
                    group_name: newGroupName.trim(),
                    category: newGroupCategory,
                  });
                  setNewGroupChatId(""); setNewGroupName(""); setNewGroupCategory("general");
                  loadData();
                }}
                  disabled={!newGroupChatId.trim() || !newGroupName.trim()}
                  className="py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: "hsl(var(--purple))" }}>
                  Add Group
                </button>
              </div>

              {/* Telegram groups list */}
              {telegramGroups.length > 0 && (
                <div className="mt-4 space-y-2">
                  {telegramGroups.map(g => (
                    <div key={g.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: g.is_active ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)" }} />
                        <div>
                          <span className="text-xs font-bold">{g.group_name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{g.chat_id}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsl(var(--surface-1))" }}>{g.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{g.total_posts} posts</span>
                        <button onClick={async () => {
                          await supabase.from("telegram_groups").update({ is_active: !g.is_active }).eq("id", g.id);
                          loadData();
                        }}
                          className="text-xs px-2 py-1 rounded font-bold"
                          style={{
                            background: g.is_active ? "hsl(120 70% 50% / 0.12)" : "hsl(0 80% 60% / 0.12)",
                            color: g.is_active ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)",
                          }}>
                          {g.is_active ? "Active" : "Disabled"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SCard>

            {/* Add Discord Webhook */}
            <SCard>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" style={{ color: "hsl(235 85% 65%)" }} /> Add Discord Webhook
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input type="text" value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)}
                  placeholder="Webhook URL"
                  className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple md:col-span-2"
                  style={{ color: "hsl(var(--foreground))" }} />
                <input type="text" value={newWebhookServer} onChange={e => setNewWebhookServer(e.target.value)}
                  placeholder="Server name"
                  className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }} />
                <input type="text" value={newWebhookChannel} onChange={e => setNewWebhookChannel(e.target.value)}
                  placeholder="Channel name"
                  className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }} />
                <button onClick={async () => {
                  if (!newWebhookUrl.trim() || !newWebhookServer.trim()) return;
                  await supabase.from("discord_webhooks").insert({
                    webhook_url: newWebhookUrl.trim(),
                    server_name: newWebhookServer.trim(),
                    channel_name: newWebhookChannel.trim() || "general",
                  });
                  setNewWebhookUrl(""); setNewWebhookServer(""); setNewWebhookChannel("");
                  loadData();
                }}
                  disabled={!newWebhookUrl.trim() || !newWebhookServer.trim()}
                  className="py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: "hsl(235 85% 65%)" }}>
                  Add Webhook
                </button>
              </div>

              {discordWebhooks.length > 0 && (
                <div className="mt-4 space-y-2">
                  {discordWebhooks.map(w => (
                    <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: w.is_active ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)" }} />
                        <div>
                          <span className="text-xs font-bold">{w.server_name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">#{w.channel_name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{w.total_posts} posts</span>
                        <button onClick={async () => {
                          await supabase.from("discord_webhooks").update({ is_active: !w.is_active }).eq("id", w.id);
                          loadData();
                        }}
                          className="text-xs px-2 py-1 rounded font-bold"
                          style={{
                            background: w.is_active ? "hsl(120 70% 50% / 0.12)" : "hsl(0 80% 60% / 0.12)",
                            color: w.is_active ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)",
                          }}>
                          {w.is_active ? "Active" : "Disabled"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SCard>

            {/* Message Templates */}
            <SCard>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4" style={{ color: "hsl(var(--purple))" }} /> 📝 Message Templates
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Customize the message template for each platform. Available placeholders:
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["TOKEN_NAME", "TOKEN_SYMBOL", "TOKEN_ADDRESS", "MARKET_CAP", "LIQUIDITY", "VOLUME_24H", "HOLDERS", "AUTO_HYPE_LINE", "TOKEN_IMAGE_URL", "DEXSCREENER_URL", "BUY_LINK"].map(ph => (
                  <code key={ph} className="px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer hover:opacity-80" style={{ background: "hsl(var(--purple) / 0.15)", color: "hsl(var(--purple))" }}
                    onClick={() => navigator.clipboard.writeText(`{{${ph}}}`)}
                    title="Click to copy">{`{{${ph}}}`}</code>
                ))}
              </div>

              {/* Test Token CA Input */}
              <div className="mb-5 p-3 rounded-xl flex items-center gap-3" style={{ background: "hsl(var(--surface-2))", border: "1px solid hsl(var(--cyan) / 0.2)" }}>
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(var(--cyan))" }} />
                <input
                  type="text" value={testTokenCA} onChange={e => setTestTokenCA(e.target.value)}
                  placeholder="Paste Token CA to preview with live data from DexScreener..."
                  className="flex-1 bg-transparent border-none text-xs font-mono focus:outline-none"
                  style={{ color: "hsl(var(--foreground))" }}
                />
                <button onClick={fetchTestTokenData} disabled={fetchingTokenData || !testTokenCA.trim()}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-50 flex items-center gap-1"
                  style={{ background: "hsl(var(--cyan))" }}>
                  {fetchingTokenData ? "Fetching..." : <><Search className="w-3 h-3" /> Fetch Data</>}
                </button>
                {testTokenData && (
                  <button onClick={() => setTestTokenData(null)} className="text-[10px] text-muted-foreground hover:text-foreground px-2">Clear</button>
                )}
              </div>
              {testTokenData && (
                <div className="mb-4 p-3 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-2" style={{ background: "hsl(120 70% 50% / 0.05)", border: "1px solid hsl(120 70% 50% / 0.15)" }}>
                  {[
                    { l: "Name", v: testTokenData.TOKEN_NAME },
                    { l: "Symbol", v: testTokenData.TOKEN_SYMBOL },
                    { l: "MC", v: "$" + testTokenData.MARKET_CAP },
                    { l: "Liquidity", v: "$" + testTokenData.LIQUIDITY },
                    { l: "24h Vol", v: "$" + testTokenData.VOLUME_24H },
                    { l: "Holders", v: testTokenData.HOLDERS },
                  ].map(i => (
                    <div key={i.l}>
                      <div className="text-[10px] text-muted-foreground">{i.l}</div>
                      <div className="text-xs font-bold" style={{ color: "hsl(120 70% 50%)" }}>{i.v}</div>
                    </div>
                  ))}
                </div>
              )}

              {[
                { key: "telegram", label: "Telegram", icon: <Send className="w-4 h-4" />, color: "hsl(200 90% 55%)" },
                { key: "discord", label: "Discord", icon: <MessageSquare className="w-4 h-4" />, color: "hsl(235 85% 65%)" },
                { key: "twitter", label: "Twitter/X", icon: <Twitter className="w-4 h-4" />, color: "hsl(210 100% 60%)" },
                { key: "instagram", label: "Instagram", icon: <Camera className="w-4 h-4" />, color: "hsl(330 80% 55%)" },
                { key: "reddit", label: "Reddit", icon: <Hash className="w-4 h-4" />, color: "hsl(16 100% 50%)" },
              ].map(platform => (
                <div key={platform.key} className="mb-5 p-4 rounded-xl" style={{ background: "hsl(var(--surface-2))", border: `1px solid ${platform.color}20` }}>
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span style={{ color: platform.color }}>{platform.icon}</span>
                      <span className="text-xs font-black">{platform.label} Template</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          setTemplateSending(platform.key);
                          try {
                            const res = await fetch(`${SUPABASE_URL}/functions/v1/send-sample-post`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
                              body: JSON.stringify({
                                platform: platform.key,
                                message: msgTemplates[platform.key],
                                password,
                                token_address: testTokenCA.trim() || undefined,
                              }),
                            });
                            const data = await res.json();
                            if (data.success) {
                              setTemplateSent(platform.key);
                              setTimeout(() => setTemplateSent(null), 3000);
                              alert(`✅ ${data.message}`);
                              loadData();
                            } else {
                              alert(`❌ Send failed: ${data.error}`);
                            }
                          } catch (err) {
                            console.error("Sample send error:", err);
                            alert(`❌ Error: ${String(err)}`);
                          }
                          setTemplateSending(null);
                        }}
                        disabled={templateSending === platform.key}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: templateSent === platform.key ? "hsl(120 70% 40%)" : platform.color }}
                      >
                        {templateSent === platform.key ? <><Check className="w-3 h-3" /> Sent!</> : templateSending === platform.key ? "Sending..." : <><Rocket className="w-3 h-3" /> Send Sample</>}
                      </button>
                      <button
                        onClick={() => adminUpdate(`msg_template_${platform.key}`, msgTemplates[platform.key], `tpl_${platform.key}`)}
                        disabled={saving === `tpl_${platform.key}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                        style={{ background: saved === `tpl_${platform.key}` ? "hsl(120 70% 40%)" : "hsl(var(--purple))" }}
                      >
                        {saved === `tpl_${platform.key}` ? <><Check className="w-3 h-3" /> Saved!</> : saving === `tpl_${platform.key}` ? "Saving..." : <><Save className="w-3 h-3" /> Save</>}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={msgTemplates[platform.key] || ""}
                    onChange={e => setMsgTemplates(prev => ({ ...prev, [platform.key]: e.target.value }))}
                    rows={8}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-purple resize-y"
                    style={{ color: "hsl(var(--foreground))" }}
                    placeholder={`Enter ${platform.label} message template...`}
                  />
                  {/* Live Preview */}
                  <div className="mt-2">
                    <div className="text-[10px] font-bold text-muted-foreground mb-1 flex items-center gap-1">
                      Preview {testTokenData && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "hsl(120 70% 50% / 0.12)", color: "hsl(120 70% 50%)" }}>Live Data: ${testTokenData.TOKEN_SYMBOL}</span>}
                    </div>
                    <div className="p-3 rounded-lg text-xs whitespace-pre-wrap leading-relaxed" style={{ background: "hsl(var(--surface-1))", border: "1px solid hsl(var(--border))" }}>
                      {resolveTemplate(msgTemplates[platform.key] || "", testTokenData)}
                    </div>
                  </div>
                </div>
              ))}
            </SCard>

            {/* Execution Logs */}
            <SCard>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} /> Real Execution Logs
              </h3>
              {executionLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No execution logs yet. Submit a token to trigger real distribution.</p>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {executionLogs.slice(0, 30).map(l => (
                    <div key={l.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg text-xs" style={{ background: "hsl(var(--surface-2))" }}>
                      <div className="flex items-center gap-2">
                        {l.platform === "telegram" ? <Send className="w-3 h-3" style={{ color: "hsl(200 90% 55%)" }} /> :
                         l.platform === "twitter" ? <Twitter className="w-3 h-3" style={{ color: "hsl(210 100% 60%)" }} /> :
                         l.platform === "instagram" ? <Camera className="w-3 h-3" style={{ color: "hsl(330 80% 55%)" }} /> :
                         l.platform === "reddit" ? <Hash className="w-3 h-3" style={{ color: "hsl(16 100% 50%)" }} /> :
                         <MessageSquare className="w-3 h-3" style={{ color: "hsl(235 85% 65%)" }} />}
                        <span className="font-semibold capitalize">{l.action_type}</span>
                        {l.external_url && (
                          <a href={l.external_url} target="_blank" rel="noreferrer" className="flex items-center gap-0.5" style={{ color: "hsl(var(--cyan))" }}>
                            <ExternalLink className="w-2.5 h-2.5" /> Proof
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded-full font-bold"
                          style={{
                            background: l.status === "delivered" ? "hsl(120 70% 50% / 0.12)" : l.status === "failed" ? "hsl(0 80% 60% / 0.12)" : "hsl(45 100% 55% / 0.12)",
                            color: l.status === "delivered" ? "hsl(120 70% 50%)" : l.status === "failed" ? "hsl(0 80% 60%)" : "hsl(45 100% 55%)",
                          }}>
                          {l.status}
                        </span>
                        {l.error_message && <span className="text-[10px] text-red-400 max-w-[150px] truncate" title={l.error_message}>{l.error_message}</span>}
                        <span className="text-[10px] text-muted-foreground">{timeAgo(l.executed_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SCard>
          </div>
        )}

        {/* ── INTEGRATIONS TAB ── */}
        {activeTab === "integrations" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black mb-1">🔌 Integration Configuration</h2>
              <p className="text-sm text-muted-foreground">Manage API credentials and toggle platform integrations. All credentials are stored securely in the database.</p>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <IntegrationToggle
                label="Telegram"
                icon={<Send className="w-4 h-4" />}
                enabled={telegramEnabled}
                onToggle={() => {
                  const next = !telegramEnabled;
                  setTelegramEnabled(next);
                  adminUpdate("telegram_enabled", String(next), "tg_toggle");
                }}
                color="hsl(200 90% 55%)"
                description={telegramToken ? "Token configured" : "No token set"}
              />
              <IntegrationToggle
                label="Discord"
                icon={<MessageSquare className="w-4 h-4" />}
                enabled={discordEnabled}
                onToggle={() => {
                  const next = !discordEnabled;
                  setDiscordEnabled(next);
                  adminUpdate("discord_enabled", String(next), "dc_toggle");
                }}
                color="hsl(235 85% 65%)"
                description={discordToken ? "Token configured" : "No token set"}
              />
              <IntegrationToggle
                label="Twitter/X"
                icon={<Twitter className="w-4 h-4" />}
                enabled={twitterEnabled}
                onToggle={() => {
                  const next = !twitterEnabled;
                  setTwitterEnabled(next);
                  adminUpdate("twitter_enabled", String(next), "tw_toggle");
                }}
                color="hsl(210 100% 60%)"
                description={twitterConsumerKey ? "Keys configured" : "No keys set"}
              />
              <IntegrationToggle
                label="Instagram"
                icon={<Camera className="w-4 h-4" />}
                enabled={instagramEnabled}
                onToggle={() => {
                  const next = !instagramEnabled;
                  setInstagramEnabled(next);
                  adminUpdate("instagram_enabled", String(next), "ig_toggle");
                }}
                color="hsl(330 80% 60%)"
                description={instagramAccessToken ? "Token configured" : "No token set"}
              />
              <IntegrationToggle
                label="Reddit"
                icon={<Hash className="w-4 h-4" />}
                enabled={redditEnabled}
                onToggle={() => {
                  const next = !redditEnabled;
                  setRedditEnabled(next);
                  adminUpdate("reddit_enabled", String(next), "rd_toggle");
                }}
                color="hsl(16 100% 50%)"
                description={redditClientId ? "Keys configured" : "No keys set"}
              />
            </div>

            {/* Telegram Config */}
            <SCard>
              <div className="flex items-center gap-2 mb-4">
                <Send className="w-5 h-5" style={{ color: "hsl(200 90% 55%)" }} />
                <h3 className="font-black">Telegram Bot Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CredentialField
                  label="Bot Token (from @BotFather)"
                  value={telegramToken}
                  onChange={setTelegramToken}
                  placeholder="123456:ABC-DEF1234ghIkl-..."
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("telegram_bot_token", telegramToken.trim(), "tg_token")}
                  savingKey="tg_token"
                />
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-2">Cooldown (minutes between posts per group)</label>
                    <div className="flex gap-2">
                      <input type="number" value={telegramCooldown} onChange={e => setTelegramCooldown(e.target.value)}
                        className="w-24 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-center focus:outline-none focus:border-purple"
                        style={{ color: "hsl(var(--foreground))" }} min="1" max="1440" />
                      <button onClick={() => adminUpdate("telegram_cooldown_minutes", telegramCooldown, "tg_cd")}
                        disabled={saving === "tg_cd"}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: "hsl(var(--purple))" }}>
                        {saved === "tg_cd" ? "✓" : "Save"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-2">Max posts/hour per group</label>
                    <div className="flex gap-2">
                      <input type="number" value={telegramMaxPosts} onChange={e => setTelegramMaxPosts(e.target.value)}
                        className="w-24 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-center focus:outline-none focus:border-purple"
                        style={{ color: "hsl(var(--foreground))" }} min="1" max="60" />
                      <button onClick={() => adminUpdate("telegram_max_posts_per_hour", telegramMaxPosts, "tg_mph")}
                        disabled={saving === "tg_mph"}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: "hsl(var(--purple))" }}>
                        {saved === "tg_mph" ? "✓" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <TestConnectionBtn platform="telegram" color="hsl(200 90% 55%)" testing={testingConnection === "telegram"} result={connectionResults.telegram} onTest={() => testConnection("telegram")} />
            </SCard>

            {/* Discord Config */}
            <SCard>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-5 h-5" style={{ color: "hsl(235 85% 65%)" }} />
                <h3 className="font-black">Discord Bot Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CredentialField
                  label="Bot Token (from Discord Developer Portal)"
                  value={discordToken}
                  onChange={setDiscordToken}
                  placeholder="MTI3NzYzNDUx..."
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("discord_bot_token", discordToken.trim(), "dc_token")}
                  savingKey="dc_token"
                />
                <div className="p-4 rounded-xl text-xs text-muted-foreground" style={{ background: "hsl(var(--surface-2))" }}>
                  <h4 className="font-bold mb-2">Setup Steps:</h4>
                  <ol className="space-y-1.5 list-decimal list-inside">
                    <li>Create a bot at discord.com/developers</li>
                    <li>Enable Message Content Intent</li>
                    <li>Generate invite link with bot + slash command scopes</li>
                    <li>Paste the bot token above</li>
                  </ol>
                </div>
              </div>
              <TestConnectionBtn platform="discord" color="hsl(235 85% 65%)" testing={testingConnection === "discord"} result={connectionResults.discord} onTest={() => testConnection("discord")} />
            </SCard>

            {/* Twitter Config */}
            <SCard>
              <div className="flex items-center gap-2 mb-4">
                <Twitter className="w-5 h-5" style={{ color: "hsl(210 100% 60%)" }} />
                <h3 className="font-black">Twitter/X API Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CredentialField
                  label="API Key (Consumer Key)"
                  value={twitterConsumerKey}
                  onChange={setTwitterConsumerKey}
                  placeholder="xvz1evFS4wEEPTGEFPHBog..."
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("twitter_consumer_key", twitterConsumerKey.trim(), "tw_ck")}
                  savingKey="tw_ck"
                />
                <CredentialField
                  label="API Secret (Consumer Secret)"
                  value={twitterConsumerSecret}
                  onChange={setTwitterConsumerSecret}
                  placeholder="kAcSOqF21Fu85e7zjz7ZN2..."
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("twitter_consumer_secret", twitterConsumerSecret.trim(), "tw_cs")}
                  savingKey="tw_cs"
                />
                <CredentialField
                  label="Access Token"
                  value={twitterAccessToken}
                  onChange={setTwitterAccessToken}
                  placeholder="370773112-GmHxMAgYyLbNE..."
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("twitter_access_token", twitterAccessToken.trim(), "tw_at")}
                  savingKey="tw_at"
                />
                <CredentialField
                  label="Access Token Secret"
                  value={twitterAccessTokenSecret}
                  onChange={setTwitterAccessTokenSecret}
                  placeholder="LswwdoUaIvS8ltyTt5jkRh..."
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("twitter_access_token_secret", twitterAccessTokenSecret.trim(), "tw_ats")}
                  savingKey="tw_ats"
                />
              </div>
              <div className="mt-4 flex items-center gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-2">Posts per day</label>
                  <div className="flex gap-2">
                    <input type="number" value={twitterPostsPerDay} onChange={e => setTwitterPostsPerDay(e.target.value)}
                      className="w-24 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-center focus:outline-none focus:border-purple"
                      style={{ color: "hsl(var(--foreground))" }} min="1" max="100" />
                    <button onClick={() => adminUpdate("twitter_posts_per_day", twitterPostsPerDay, "tw_ppd")}
                      disabled={saving === "tw_ppd"}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: "hsl(var(--purple))" }}>
                      {saved === "tw_ppd" ? "✓" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
              <TestConnectionBtn platform="twitter" color="hsl(210 100% 60%)" testing={testingConnection === "twitter"} result={connectionResults.twitter} onTest={() => testConnection("twitter")} />
            </SCard>

            {/* Instagram Config */}
            <SCard>
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-5 h-5" style={{ color: "hsl(330 80% 60%)" }} />
                <h3 className="font-black">Instagram Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CredentialField
                  label="Page Access Token (from Meta Graph API)"
                  value={instagramAccessToken}
                  onChange={setInstagramAccessToken}
                  placeholder="EAAGm0P..."
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("instagram_access_token", instagramAccessToken.trim(), "ig_token")}
                  savingKey="ig_token"
                />
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-2">Instagram Business Page ID</label>
                    <div className="flex gap-2">
                      <input type="text" value={instagramPageId} onChange={e => setInstagramPageId(e.target.value)}
                        placeholder="17841400123456789"
                        className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-purple"
                        style={{ color: "hsl(var(--foreground))" }} />
                      <button onClick={() => adminUpdate("instagram_page_id", instagramPageId.trim(), "ig_page")}
                        disabled={saving === "ig_page" || !instagramPageId.trim()}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: "hsl(330 80% 60%)" }}>
                        {saved === "ig_page" ? "✓" : "Save"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-2">Posts per day</label>
                    <div className="flex gap-2">
                      <input type="number" value={instagramPostsPerDay} onChange={e => setInstagramPostsPerDay(e.target.value)}
                        className="w-24 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-center focus:outline-none focus:border-purple"
                        style={{ color: "hsl(var(--foreground))" }} min="1" max="25" />
                      <button onClick={() => adminUpdate("instagram_posts_per_day", instagramPostsPerDay, "ig_ppd")}
                        disabled={saving === "ig_ppd"}
                        className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                        style={{ background: "hsl(330 80% 60%)" }}>
                        {saved === "ig_ppd" ? "✓" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl text-xs text-muted-foreground" style={{ background: "hsl(var(--surface-2))" }}>
                <h4 className="font-bold mb-2">📸 Setup Steps:</h4>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>Create a Meta Developer App at developers.facebook.com</li>
                  <li>Add Instagram Graph API product</li>
                  <li>Connect your Instagram Business/Creator account to a Facebook Page</li>
                  <li>Generate a Page Access Token with <code className="text-[10px] px-1 py-0.5 rounded" style={{ background: "hsl(var(--surface-1))" }}>instagram_basic</code>, <code className="text-[10px] px-1 py-0.5 rounded" style={{ background: "hsl(var(--surface-1))" }}>instagram_content_publish</code> permissions</li>
                  <li>Get your Instagram Business Account ID from the API</li>
                  <li>For long-lived tokens, exchange short-lived token via the token exchange endpoint</li>
                </ol>
              </div>
              <TestConnectionBtn platform="instagram" color="hsl(330 80% 60%)" testing={testingConnection === "instagram"} result={connectionResults.instagram} onTest={() => testConnection("instagram")} />
            </SCard>

            {/* Reddit Config */}
            <SCard>
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-5 h-5" style={{ color: "hsl(16 100% 50%)" }} />
                <h3 className="font-black">Reddit API Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <CredentialField
                  label="Client ID (from Reddit App)"
                  value={redditClientId}
                  onChange={setRedditClientId}
                  placeholder="aBcDeFgHiJk..."
                  masked={false}
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("reddit_client_id", redditClientId.trim(), "rd_cid")}
                  savingKey="rd_cid"
                />
                <CredentialField
                  label="Client Secret"
                  value={redditClientSecret}
                  onChange={setRedditClientSecret}
                  placeholder="xYzAbCdEfG..."
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("reddit_client_secret", redditClientSecret.trim(), "rd_cs")}
                  savingKey="rd_cs"
                />
                <CredentialField
                  label="Reddit Username (bot account)"
                  value={redditUsername}
                  onChange={setRedditUsername}
                  placeholder="u/YourBotAccount"
                  masked={false}
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("reddit_username", redditUsername.trim(), "rd_un")}
                  savingKey="rd_un"
                />
                <CredentialField
                  label="Reddit Password (bot account)"
                  value={redditPassword}
                  onChange={setRedditPasswordState}
                  placeholder="••••••••"
                  saving={saving} saved={saved}
                  onSave={() => adminUpdate("reddit_password", redditPassword.trim(), "rd_pw")}
                  savingKey="rd_pw"
                />
              </div>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-2">Target Subreddits (comma-separated)</label>
                  <div className="flex gap-2">
                    <input type="text" value={redditSubreddits} onChange={e => setRedditSubreddits(e.target.value)}
                      placeholder="CryptoMoonShots,SatoshiStreetBets"
                      className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-purple"
                      style={{ color: "hsl(var(--foreground))" }} />
                    <button onClick={() => adminUpdate("reddit_subreddits", redditSubreddits.trim(), "rd_subs")}
                      disabled={saving === "rd_subs" || !redditSubreddits.trim()}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: "hsl(16 100% 50%)" }}>
                      {saved === "rd_subs" ? "✓" : "Save"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-2">Post Delay (minutes between posts, shadowban-safe)</label>
                  <div className="flex gap-2">
                    <input type="number" value={redditPostDelay} onChange={e => setRedditPostDelay(e.target.value)}
                      className="w-24 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-center focus:outline-none focus:border-purple"
                      style={{ color: "hsl(var(--foreground))" }} min="10" max="1440" />
                    <button onClick={() => adminUpdate("reddit_post_delay_minutes", redditPostDelay, "rd_delay")}
                      disabled={saving === "rd_delay"}
                      className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: "hsl(16 100% 50%)" }}>
                      {saved === "rd_delay" ? "✓" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-xl text-xs text-muted-foreground" style={{ background: "hsl(var(--surface-2))" }}>
                <h4 className="font-bold mb-2">🤖 Setup Steps:</h4>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>Go to reddit.com/prefs/apps and create a "script" application</li>
                  <li>Copy the Client ID (under app name) and Client Secret</li>
                  <li>Use a dedicated bot account — do NOT use your personal account</li>
                  <li>The bot account must have enough karma to post in target subreddits</li>
                  <li>Set post delay ≥ 30 min per subreddit to avoid shadowbans</li>
                  <li>Reddit API rate limit: 60 requests/minute per account</li>
                </ol>
                <div className="mt-3 p-2 rounded-lg" style={{ background: "hsl(45 100% 55% / 0.08)", border: "1px solid hsl(45 100% 55% / 0.2)" }}>
                  <span className="font-bold" style={{ color: "hsl(45 100% 55%)" }}>⚠️ Important:</span> Reddit actively detects spam. Use organic-sounding titles, vary content, and respect subreddit rules. Posts that look like ads will be removed.
                </div>
              </div>
              <TestConnectionBtn platform="reddit" color="hsl(16 100% 50%)" testing={testingConnection === "reddit"} result={connectionResults.reddit} onTest={() => testConnection("reddit")} />
            </SCard>
          </div>
        )}

        {/* ── VIRAL CONTENT TAB ── */}
        {activeTab === "viral" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">🔥 Viral Content Engine</h2>
              <button onClick={loadData} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            {/* Generate content */}
            <SCard>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: "hsl(var(--purple))" }} /> Generate Viral Content
              </h3>
              <div className="flex gap-3">
                <input type="text" value={generateCA} onChange={e => setGenerateCA(e.target.value)}
                  placeholder="Enter token contract address (CA)"
                  className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:border-purple"
                  style={{ color: "hsl(var(--foreground))" }} />
                <button onClick={async () => {
                  if (!generateCA.trim()) return;
                  setGenerating(true);
                  try {
                    const res = await fetch(`${SUPABASE_URL}/functions/v1/viral-content-generate`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
                      body: JSON.stringify({ token_address: generateCA.trim(), count: 3 }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      loadData();
                      setGenerateCA("");
                    }
                  } catch (e) { console.error(e); }
                  setGenerating(false);
                }}
                  disabled={generating || !generateCA.trim()}
                  className="px-6 py-2.5 rounded-lg text-xs font-bold text-white disabled:opacity-50 flex items-center gap-2"
                  style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))" }}>
                  {generating ? <><RefreshCw className="w-3 h-3 animate-spin" /> Generating...</> : <><Sparkles className="w-3 h-3" /> Generate 3 Variations</>}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">Generates FOMO, Alpha, and Meme variations. Auto-fetches token data from DexScreener.</p>
            </SCard>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Content", value: viralContent.length, color: "hsl(var(--purple))" },
                { label: "Posted", value: viralContent.filter((c: any) => c.is_posted).length, color: "hsl(120 70% 50%)" },
                { label: "Pending", value: viralContent.filter((c: any) => !c.is_posted).length, color: "hsl(45 100% 55%)" },
                { label: "Meme / FOMO / Alpha", value: `${viralContent.filter((c: any) => c.content_type === "meme").length}/${viralContent.filter((c: any) => c.content_type === "fomo").length}/${viralContent.filter((c: any) => c.content_type === "alpha").length}`, color: "hsl(var(--cyan))" },
              ].map(s => (
                <SCard key={s.label}>
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
                </SCard>
              ))}
            </div>

            {/* Content list */}
            <SCard>
              <h3 className="font-bold text-sm mb-3">Generated Content ({viralContent.length})</h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {viralContent.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No content generated yet. Enter a CA above to generate viral content.</p>
                ) : viralContent.map((c: any) => (
                  <div key={c.id} className="p-3 rounded-xl" style={{ background: "hsl(var(--surface-2))", border: `1px solid ${c.is_posted ? "hsl(120 70% 50% / 0.2)" : "hsl(var(--border))"}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: "hsl(var(--cyan))" }}>${c.token_symbol || "?"}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase" style={{
                          background: c.content_type === "meme" ? "hsl(45 100% 55% / 0.12)" : c.content_type === "fomo" ? "hsl(0 80% 60% / 0.12)" : "hsl(var(--purple) / 0.12)",
                          color: c.content_type === "meme" ? "hsl(45 100% 55%)" : c.content_type === "fomo" ? "hsl(0 80% 60%)" : "hsl(var(--purple))",
                        }}>{c.content_type}</span>
                        {c.is_posted && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "hsl(120 70% 50% / 0.12)", color: "hsl(120 70% 50%)" }}>Posted</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {!c.is_posted && (
                          <button onClick={async () => {
                            setPosting(true);
                            try {
                              await fetch(`${SUPABASE_URL}/functions/v1/telegram-auto-post`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
                                body: JSON.stringify({ mode: "specific", content_id: c.id }),
                              });
                              loadData();
                            } catch (e) { console.error(e); }
                            setPosting(false);
                          }}
                            disabled={posting}
                            className="text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1"
                            style={{ background: "hsl(var(--purple) / 0.12)", color: "hsl(var(--purple))" }}>
                            <Send className="w-2.5 h-2.5" /> Post Now
                          </button>
                        )}
                        <button onClick={() => navigator.clipboard.writeText(c.text)} className="text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1"
                          style={{ background: "hsl(var(--surface-1))", color: "hsl(var(--muted-foreground))" }}>
                          <Copy className="w-2.5 h-2.5" /> Copy
                        </button>
                      </div>
                    </div>
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">{c.text?.substring(0, 400)}{c.text?.length > 400 ? "..." : ""}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span>👁 {c.views}</span>
                      <span>🔗 {c.clicks}</span>
                      <span>🔄 {c.shares}</span>
                      <span>{timeAgo(c.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </SCard>
          </div>
        )}

        {/* ── TELEGRAM USERS TAB ── */}
        {activeTab === "tg-users" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">👥 Telegram Bot Users</h2>
              <button onClick={loadData} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Users", value: tgBotUsers.length, color: "hsl(var(--purple))" },
                { label: "Channel Members", value: tgBotUsers.filter((u: any) => u.joined_channel).length, color: "hsl(120 70% 50%)" },
                { label: "Not Joined", value: tgBotUsers.filter((u: any) => !u.joined_channel).length, color: "hsl(0 80% 60%)" },
                { label: "With Referral", value: tgBotUsers.filter((u: any) => u.referred_by).length, color: "hsl(var(--cyan))" },
              ].map(s => (
                <SCard key={s.label}>
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                </SCard>
              ))}
            </div>

            <SCard>
              <h3 className="font-bold text-sm mb-3">User List</h3>
              {tgBotUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No Telegram users yet. Share your bot link to start growing.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["User", "TG ID", "Channel", "Referral", "Referred By", "Joined"].map(h => (
                          <th key={h} className="text-left py-2 pr-3 text-xs text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tgBotUsers.map((u: any) => (
                        <tr key={u.id} className="border-b border-border/40 hover:bg-surface-2 transition-colors">
                          <td className="py-2 pr-3">
                            <div className="text-xs font-bold">{u.first_name || "—"}</div>
                            <div className="text-[10px] text-muted-foreground">@{u.username || "—"}</div>
                          </td>
                          <td className="py-2 pr-3 text-xs font-mono text-muted-foreground">{u.telegram_id}</td>
                          <td className="py-2 pr-3">
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{
                              background: u.joined_channel ? "hsl(120 70% 50% / 0.12)" : "hsl(0 80% 60% / 0.12)",
                              color: u.joined_channel ? "hsl(120 70% 50%)" : "hsl(0 80% 60%)",
                            }}>{u.joined_channel ? "✓ Joined" : "✗ Not Joined"}</span>
                          </td>
                          <td className="py-2 pr-3 text-xs font-mono" style={{ color: "hsl(var(--cyan))" }}>{u.referral_code || "—"}</td>
                          <td className="py-2 pr-3 text-xs text-muted-foreground">{u.referred_by || "—"}</td>
                          <td className="py-2 text-xs text-muted-foreground">{timeAgo(u.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SCard>
          </div>
        )}

        {/* ── SCHEDULER TAB ── */}
        {activeTab === "scheduler" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">📅 Content Scheduler</h2>
              <button onClick={loadData} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> Refresh
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Scheduled", value: contentSchedules.filter((s: any) => !s.posted).length, color: "hsl(45 100% 55%)" },
                { label: "Posted", value: contentSchedules.filter((s: any) => s.posted).length, color: "hsl(120 70% 50%)" },
                { label: "Failed", value: contentSchedules.filter((s: any) => s.error_message).length, color: "hsl(0 80% 60%)" },
              ].map(s => (
                <SCard key={s.label}>
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                </SCard>
              ))}
            </div>

            <SCard>
              <h3 className="font-bold text-sm mb-3">Schedule Queue</h3>
              {contentSchedules.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No scheduled posts. Content is auto-posted via cron every 15 minutes.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {contentSchedules.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full" style={{ background: s.posted ? "hsl(120 70% 50%)" : s.error_message ? "hsl(0 80% 60%)" : "hsl(45 100% 55%)" }} />
                        <div>
                          <span className="text-xs font-bold">${s.viral_content?.token_symbol || "?"}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{s.viral_content?.content_type}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(s.scheduled_at).toLocaleString()}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{
                          background: s.posted ? "hsl(120 70% 50% / 0.12)" : "hsl(45 100% 55% / 0.12)",
                          color: s.posted ? "hsl(120 70% 50%)" : "hsl(45 100% 55%)",
                        }}>{s.posted ? "Posted" : "Pending"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SCard>

            {/* Automation status */}
            <SCard>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} /> Automation Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: "Telegram Polling", interval: "Every 1 min", icon: <Send className="w-4 h-4" /> },
                  { name: "Auto-Post to Channel", interval: "Every 15 min", icon: <Play className="w-4 h-4" /> },
                  { name: "Engagement (Polls)", interval: "Every 6 hours", icon: <Vote className="w-4 h-4" /> },
                ].map(job => (
                  <div key={job.name} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
                    <div className="flex items-center gap-2">
                      <div style={{ color: "hsl(120 70% 50%)" }}>{job.icon}</div>
                      <div>
                        <div className="text-xs font-bold">{job.name}</div>
                        <div className="text-[10px] text-muted-foreground">{job.interval}</div>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "hsl(120 70% 50% / 0.12)", color: "hsl(120 70% 50%)" }}>Active</span>
                  </div>
                ))}
              </div>
            </SCard>
          </div>
        )}

        {/* ── ENGAGEMENT TAB ── */}
        {activeTab === "engagement" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">💬 Engagement Actions</h2>
              <div className="flex items-center gap-2">
                <button onClick={async () => {
                  try {
                    await fetch(`${SUPABASE_URL}/functions/v1/telegram-engagement`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "apikey": ANON_KEY },
                      body: JSON.stringify({ mode: "auto" }),
                    });
                    loadData();
                  } catch (e) { console.error(e); }
                }}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1"
                  style={{ background: "hsl(var(--purple) / 0.12)", color: "hsl(var(--purple))" }}>
                  <Play className="w-3 h-3" /> Run Engagement Now
                </button>
                <button onClick={loadData} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Total Actions", value: engagementActions.length, color: "hsl(var(--purple))" },
                { label: "Posted", value: engagementActions.filter((a: any) => a.posted).length, color: "hsl(120 70% 50%)" },
                { label: "Pending", value: engagementActions.filter((a: any) => !a.posted).length, color: "hsl(45 100% 55%)" },
              ].map(s => (
                <SCard key={s.label}>
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                </SCard>
              ))}
            </div>

            <SCard>
              <h3 className="font-bold text-sm mb-3">Action Queue</h3>
              {engagementActions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No engagement actions yet. Polls and CTAs are auto-created when content is posted.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {engagementActions.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                          background: a.action_type === "poll" ? "hsl(var(--purple) / 0.12)" : a.action_type === "question" ? "hsl(var(--cyan) / 0.12)" : "hsl(45 100% 55% / 0.12)",
                        }}>
                          {a.action_type === "poll" ? <Vote className="w-4 h-4" style={{ color: "hsl(var(--purple))" }} /> :
                           a.action_type === "question" ? <MessageSquare className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} /> :
                           <Zap className="w-4 h-4" style={{ color: "hsl(45 100% 55%)" }} />}
                        </div>
                        <div>
                          <span className="text-xs font-bold capitalize">{a.action_type}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">${a.viral_content?.token_symbol || "?"}</span>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[250px]">
                            {a.payload?.question || a.payload?.text || "—"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{
                          background: a.posted ? "hsl(120 70% 50% / 0.12)" : "hsl(45 100% 55% / 0.12)",
                          color: a.posted ? "hsl(120 70% 50%)" : "hsl(45 100% 55%)",
                        }}>{a.posted ? "Sent" : "Pending"}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(a.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SCard>
          </div>
        )}

        {activeTab === "plans" && (
          <PackagesEditor password={password} />
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <h2 className="text-xl font-black">⚙️ Platform Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Admin Wallet */}
              <SCard>
                <div className="flex items-center gap-2 mb-5">
                  <Wallet className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} />
                  <h3 className="font-bold">Payment Wallet</h3>
                </div>
                {adminWallet && adminWallet !== "NOT_SET" && (
                  <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: "hsl(var(--cyan) / 0.08)", border: "1px solid hsl(var(--cyan) / 0.2)" }}>
                    <span className="text-xs font-mono truncate flex-1" style={{ color: "hsl(var(--cyan))" }}>{adminWallet}</span>
                    <button onClick={() => copyText(adminWallet)}><Copy className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    <a href={`https://solscan.io/account/${adminWallet}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </a>
                  </div>
                )}
                {(!adminWallet || adminWallet === "NOT_SET") && (
                  <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "hsl(0 85% 60% / 0.08)", border: "1px solid hsl(0 85% 60% / 0.2)", color: "hsl(0 85% 60%)" }}>
                    ⚠️ No wallet set — paid packages won't work.
                  </div>
                )}
                <form onSubmit={e => { e.preventDefault(); adminUpdate("admin_wallet", newWallet.trim(), "wallet"); }} className="space-y-3">
                  <input type="text" value={newWallet} onChange={e => setNewWallet(e.target.value)}
                    placeholder="Enter Solana wallet address..."
                    className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-purple transition-colors"
                    style={{ color: "hsl(var(--foreground))" }} />
                  <button type="submit" disabled={saving === "wallet" || !newWallet.trim()}
                    className="w-full py-2.5 rounded-lg font-bold text-sm text-white transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))" }}>
                    {saved === "wallet" ? <><Check className="w-4 h-4" /> Saved!</> : saving === "wallet" ? "Saving..." : "Update Wallet"}
                  </button>
                </form>
              </SCard>

              <SCard>
                <div className="flex items-center gap-2 mb-5">
                  <Bot className="w-4 h-4" style={{ color: "hsl(var(--purple))" }} />
                  <h3 className="font-bold">Partner Verification Setup</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Partner bot username</label>
                    <input value={partnerBotUsername} onChange={e => setPartnerBotUsername(e.target.value.replace(/^@/, ""))}
                      placeholder="promotememes_bot"
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-purple transition-colors"
                      style={{ color: "hsl(var(--foreground))" }} />
                    <button onClick={() => adminUpdate("partner_bot_username", partnerBotUsername.trim().replace(/^@/, "") || "promotememes_bot", "partner_bot_username")}
                      disabled={saving === "partner_bot_username" || !partnerBotUsername.trim()}
                      className="mt-3 w-full py-2.5 rounded-lg font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))" }}>
                      {saved === "partner_bot_username" ? "Saved!" : saving === "partner_bot_username" ? "Saving..." : "Save bot username"}
                    </button>
                  </div>
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Required main channel</label>
                    <input value={partnerMainChannelUsername} onChange={e => setPartnerMainChannelUsername(e.target.value.replace(/^@/, ""))}
                      placeholder="promotememesai"
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:border-purple transition-colors"
                      style={{ color: "hsl(var(--foreground))" }} />
                    <button onClick={() => adminUpdate("partner_main_channel_username", partnerMainChannelUsername.trim().replace(/^@/, "") || "promotememesai", "partner_main_channel_username")}
                      disabled={saving === "partner_main_channel_username" || !partnerMainChannelUsername.trim()}
                      className="mt-3 w-full py-2.5 rounded-lg font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(var(--cyan) / 0.8))" }}>
                      {saved === "partner_main_channel_username" ? "Saved!" : saving === "partner_main_channel_username" ? "Saving..." : "Save main channel"}
                    </button>
                  </div>
                </div>
              </SCard>

              {/* Solana RPC — multi-preset */}
              <SCard>
                <div className="flex items-center gap-2 mb-3">
                  <Server className="w-4 h-4" style={{ color: "hsl(var(--purple))" }} />
                  <h3 className="font-bold">Solana RPC Endpoints</h3>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  Configure devnet + 3 mainnet endpoints. The app auto-falls-over from active → fallbacks on 403/429.
                  For mainnet stability use Helius / QuickNode / Triton with a Solana-enabled API key.
                </p>
                <RpcMultiPresetEditor onSaveSetting={adminUpdate} />
              </SCard>
            </div>

            {/* Password + Stats Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SCard>
                <div className="flex items-center gap-2 mb-5">
                  <Shield className="w-4 h-4" style={{ color: "hsl(var(--purple))" }} />
                  <h3 className="font-bold">Change Password</h3>
                </div>
                <form onSubmit={e => { e.preventDefault(); adminUpdate("admin_password", newPassword.trim(), "pw"); }} className="space-y-3">
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password (min 6 chars)"
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple transition-colors"
                      style={{ color: "hsl(var(--foreground))" }}
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button type="submit" disabled={saving === "pw" || newPassword.length < 6}
                    className="w-full py-2.5 rounded-lg font-bold text-sm text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, hsl(var(--purple)), hsl(270 60% 45%))" }}>
                    {saved === "pw" ? "Saved!" : "Update Password"}
                  </button>
                </form>
              </SCard>

              <SCard>
                <div className="flex items-center gap-2 mb-5">
                  {statsMode === "live" ? <ToggleRight className="w-4 h-4" style={{ color: "hsl(120 70% 50%)" }} /> : <ToggleLeft className="w-4 h-4" style={{ color: "hsl(45 100% 55%)" }} />}
                  <h3 className="font-bold">Stats Display Mode</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Switch between demo/fake stats and live stats from real database data. This affects all public-facing pages including the landing page, analytics, and dashboard.
                </p>
                <button onClick={toggleStatsMode}
                  className="w-full py-3 rounded-lg font-bold text-sm text-white transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    background: statsMode === "live"
                      ? "linear-gradient(135deg, hsl(120 70% 40%), hsl(120 70% 30%))"
                      : "linear-gradient(135deg, hsl(45 100% 45%), hsl(45 100% 35%))",
                  }}>
                  {statsMode === "live"
                    ? <><ToggleRight className="w-5 h-5" /> Currently: LIVE Stats</>
                    : <><ToggleLeft className="w-5 h-5" /> Currently: DEMO Stats</>}
                </button>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  {statsMode === "live"
                    ? "Showing real data from the database across all pages."
                    : "Showing demo/placeholder data across all public pages."}
                </p>
              </SCard>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black mb-1">👥 Users & Partners</h2>
              <p className="text-sm text-muted-foreground">Manage user roles and verify partner channels.</p>
            </div>
            <SCard><AdminUsersTab password={password} /></SCard>
          </div>
        )}

        {activeTab === "accounts" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-black mb-1">💰 Accounts & Financial Tracking</h2>
              <p className="text-sm text-muted-foreground">
                Multi-account ledger tracking user spend, blockchain costs, PMM revenue, and partner commissions.
                All data is admin-only and immutable.
              </p>
            </div>
            <AccountsTab password={password} />
          </div>
        )}
      </div>
    </div>
  );
}
