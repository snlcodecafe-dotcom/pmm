import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Crown, Plus, Trash2, ExternalLink, Loader2, AlertCircle, CheckCircle2, RefreshCw, Copy, Check, Bot, Info } from "lucide-react";

type Channel = {
  id: string;
  telegram_channel_id: string | null;
  telegram_channel_name: string | null;
  telegram_channel_link: string | null;
  discord_server_name: string | null;
  discord_invite_link: string | null;
  subscriber_count: number;
  tier_percent: number;
  verification_status: string;
  referral_code: string | null;
  bot_is_admin: boolean;
  rejection_reason?: string | null;
};

const emptyForm = {
  telegram_channel_name: "",
  telegram_channel_id: "",
  telegram_channel_link: "",
  discord_server_name: "",
  discord_invite_link: "",
};

export default function PartnerChannelsManager() {
  const { user } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState("promotememes_bot");

  const helperText = useMemo(() => [
    `Add @${botUsername} as admin before verification.`,
    "Use Telegram username or a private channel id.",
    "Use a Discord webhook URL here if you want Discord delivery.",
  ], [botUsername]);

  useEffect(() => { if (user) void load(); }, [user]);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("admin_settings").select("value").eq("key", "partner_bot_username").maybeSingle();
      const value = data?.value?.replace(/^@/, "").trim();
      if (value) setBotUsername(value);
    })();
  }, []);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("partner_channels").select("*").eq("user_id", user.id).order("subscriber_count", { ascending: false });
    setChannels((data as Channel[]) ?? []);
    setLoading(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null); setInfo(null);
    try {
      const { data, error: invErr } = await supabase.functions.invoke("verify-partner-channel", { body: form });
      const body = data as { ok?: boolean; error?: string; tier_percent?: number; subscriber_count?: number } | null;
      const bodyErr = body?.error;
      if (bodyErr) throw new Error(bodyErr);
      if (invErr) throw new Error(invErr.message || "Verification failed");
      if (!body?.ok) throw new Error("Verification failed");
      setInfo(`Channel verified — tier ${body.tier_percent}% (${body.subscriber_count?.toLocaleString() || 0} subs)`);
      setForm(emptyForm); setAdding(false);
      await load();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function refresh(c: Channel) {
    setRefreshingId(c.id); setError(null); setInfo(null);
    try {
      const { data, error: invErr } = await supabase.functions.invoke("verify-partner-channel", {
        body: {
          telegram_channel_id: c.telegram_channel_id,
          telegram_channel_name: c.telegram_channel_name,
          telegram_channel_link: c.telegram_channel_link,
          discord_server_name: c.discord_server_name,
          discord_invite_link: c.discord_invite_link,
        },
      });
      const body = data as { ok?: boolean; error?: string; subscriber_count?: number; tier_percent?: number } | null;
      const bodyErr = body?.error;
      if (bodyErr) throw new Error(bodyErr);
      if (invErr) throw new Error(invErr.message || "Refresh failed");
      if (!body?.ok) throw new Error("Refresh failed");
      setInfo(`Refreshed — ${body.subscriber_count?.toLocaleString() || 0} subs, tier ${body.tier_percent}%`);
      await load();
    } catch (e: any) {
      setError(e.message || "Refresh failed");
    } finally {
      setRefreshingId(null);
    }
  }

  async function remove(c: Channel) {
    if (!confirm(`Remove "${c.telegram_channel_name || c.telegram_channel_id}"? Past earnings stay intact.`)) return;
    const { error: delErr } = await supabase.from("partner_channels").delete().eq("id", c.id);
    if (delErr) { setError(delErr.message); return; }
    setInfo("Channel removed.");
    await load();
  }

  function copyRef(code: string) {
    const link = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  return (
    <section className="rounded-xl border p-5 space-y-4" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-bold text-sm flex items-center gap-2">
          <Crown className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} /> Partner channels
        </h2>
        {!adding && (
          <button onClick={() => { setAdding(true); setError(null); setInfo(null); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))" }}>
            <Plus className="w-3.5 h-3.5" /> Add channel
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-xs p-2 rounded" style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))" }}>
          <AlertCircle className="w-3.5 h-3.5 mt-0.5" /> {error}
        </div>
      )}
      {info && (
        <div className="flex items-start gap-2 text-xs p-2 rounded" style={{ background: "hsl(var(--cyan) / 0.1)", color: "hsl(var(--cyan))" }}>
          <CheckCircle2 className="w-3.5 h-3.5 mt-0.5" /> {info}
        </div>
      )}

      {adding && (
        <form onSubmit={submit} className="rounded-lg border p-3 space-y-3" style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))" }}>
          <div className="rounded-lg border p-3 space-y-2" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
            <div className="flex items-start gap-2 text-[11px] font-semibold">
              <Bot className="w-3.5 h-3.5 mt-0.5" style={{ color: "hsl(var(--purple))" }} />
              <span>Add @{botUsername} as admin (Post Messages + View Members), then submit.</span>
            </div>
            {helperText.map((item) => (
              <div key={item} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <Info className="w-3 h-3 mt-0.5" /> <span>{item}</span>
              </div>
            ))}
          </div>
          <Field label="Telegram Channel Name *" value={form.telegram_channel_name} onChange={v => setForm({ ...form, telegram_channel_name: v })} placeholder="My Crypto Hub" required />
          <Field label="Telegram Channel ID / @username *" value={form.telegram_channel_id} onChange={v => setForm({ ...form, telegram_channel_id: v })} placeholder="@mychannel or -1001234567890" required />
          <Field label="Telegram Channel Link" value={form.telegram_channel_link} onChange={v => setForm({ ...form, telegram_channel_link: v })} placeholder="https://t.me/mychannel" />
          <Field label="Discord Server Name" value={form.discord_server_name} onChange={v => setForm({ ...form, discord_server_name: v })} placeholder="(optional)" />
          <Field label="Discord Webhook URL" value={form.discord_invite_link} onChange={v => setForm({ ...form, discord_invite_link: v })} placeholder="https://discord.com/api/webhooks/..." />
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={submitting}
              className="flex-1 py-2 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))" }}>
              {submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying…</> : "Verify & add"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setForm(emptyForm); setError(null); }}
              className="px-3 py-2 rounded-lg text-xs font-bold border" style={{ borderColor: "hsl(var(--border))" }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-xs text-muted-foreground">Loading channels…</div>
        ) : channels.length === 0 ? (
          <p className="text-xs text-muted-foreground">No partner channels yet. Add one to start earning commissions on every promotion that uses your referral link.</p>
        ) : channels.map(c => (
          <div key={c.id} className="rounded-lg border p-3 space-y-2" style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))" }}>
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">{c.telegram_channel_name || c.telegram_channel_id}</div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">{c.telegram_channel_id}</div>
                {c.discord_server_name && <div className="text-[10px] text-muted-foreground truncate">Discord: {c.discord_server_name}</div>}
                {c.rejection_reason && <div className="text-[10px] text-destructive">{c.rejection_reason}</div>}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{
                background: c.verification_status === "verified" ? "hsl(var(--cyan) / 0.15)" : "hsl(var(--muted) / 0.4)",
                color: c.verification_status === "verified" ? "hsl(var(--cyan))" : "hsl(var(--muted-foreground))",
              }}>{c.verification_status.toUpperCase()}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="SUBS" value={c.subscriber_count.toLocaleString()} />
              <Stat label="TIER" value={`${c.tier_percent}%`} highlight />
              <Stat label="REF" value={c.referral_code || "—"} mono />
            </div>

            <div className="flex flex-wrap gap-2">
              {c.referral_code && (
                <button onClick={() => copyRef(c.referral_code!)} className="text-[11px] font-bold px-2 py-1 rounded flex items-center gap-1"
                  style={{ background: "hsl(var(--purple) / 0.15)", color: "hsl(var(--purple))" }}>
                  {copiedCode === c.referral_code ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy link</>}
                </button>
              )}
              {c.telegram_channel_link && (
                <a href={c.telegram_channel_link} target="_blank" rel="noreferrer" className="text-[11px] font-bold px-2 py-1 rounded flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <ExternalLink className="w-3 h-3" /> Open
                </a>
              )}
              <button onClick={() => refresh(c)} disabled={refreshingId === c.id}
                className="text-[11px] font-bold px-2 py-1 rounded flex items-center gap-1 text-muted-foreground hover:text-foreground disabled:opacity-50">
                {refreshingId === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Refresh
              </button>
              <button onClick={() => remove(c)} className="text-[11px] font-bold px-2 py-1 rounded flex items-center gap-1 ml-auto"
                style={{ color: "hsl(var(--destructive))" }}>
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        You can add multiple channels. Each gets its own referral code; tier is calculated per channel from its live subscriber count.
      </p>
    </section>
  );
}

function Stat({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="rounded p-2" style={{ background: "hsl(var(--surface-1))" }}>
      <div className="text-[9px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold ${mono ? "font-mono" : ""}`} style={highlight ? { color: "hsl(var(--cyan))" } : {}}>{value}</div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-[11px] font-bold mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-3 py-2 rounded-lg border text-xs"
        style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
    </div>
  );
}
