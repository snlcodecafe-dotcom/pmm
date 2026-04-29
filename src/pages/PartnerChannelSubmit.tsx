import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle, Send, Bot, Info, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/PageLayout";
import { tierForSubscribers, progressToNext } from "@/lib/partnerTiers";

export default function PartnerChannelSubmit() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [step, setStep] = useState<"prep" | "form" | "success">("prep");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [botUsername, setBotUsername] = useState("promotememes_bot");
  const [mainChannelUsername, setMainChannelUsername] = useState("promotememesai");

  const [form, setForm] = useState({
    telegram_channel_name: "",
    telegram_channel_id: "",
    telegram_channel_link: "",
    discord_server_name: "",
    discord_invite_link: "",
  });

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("admin_settings")
        .select("key, value")
        .in("key", ["partner_bot_username", "partner_main_channel_username"]);

      const settings = Object.fromEntries((data ?? []).map((item) => [item.key, item.value]));
      const nextBot = String(settings.partner_bot_username || "promotememes_bot").replace(/^@/, "").trim();
      const nextChannel = String(settings.partner_main_channel_username || "promotememesai").replace(/^@/, "").trim();
      if (nextBot) setBotUsername(nextBot);
      if (nextChannel) setMainChannelUsername(nextChannel);
    })();
  }, []);

  const troubleshootingTips = useMemo(() => [
    `Make sure @${botUsername} is added as an admin in the exact Telegram channel you're submitting.`,
    "Use the real @username or the full Telegram channel id (for private channels use the -100... id).",
    "If the bot cannot read members or admins, re-open channel admin permissions and enable View Members + Post Messages.",
    "For Discord, paste the channel webhook URL, not a discord.gg invite link.",
  ], [botUsername]);

  if (loading) return <PageLayout><div className="p-10 text-center">Loading...</div></PageLayout>;
  if (!user) { nav("/auth?next=/partner/apply/channel"); return null; }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    try {
      const { data, error: invErr } = await supabase.functions.invoke("verify-partner-channel", { body: form });
      const body = data as { ok?: boolean; error?: string; channel?: unknown; tier_percent?: number; subscriber_count?: number } | null;
      const bodyErr = body?.error;
      if (bodyErr) throw new Error(bodyErr);
      if (invErr) throw new Error(invErr.message || "Verification failed");
      if (!body?.ok) throw new Error("Verification failed");
      setResult(body);
      setStep("success");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "success" && result) {
    const subs = result.subscriber_count || 0;
    const prog = progressToNext(subs);
    const channel = result.channel;
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="rounded-2xl border-2 p-6 text-center" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--cyan) / 0.5)" }}>
            <CheckCircle2 className="w-14 h-14 mx-auto mb-3" style={{ color: "hsl(var(--cyan))" }} />
            <h2 className="text-2xl font-black mb-1">{result.tier_percent > 0 ? "You're a verified Partner!" : "Channel registered"}</h2>
            <p className="text-sm text-muted-foreground mb-5">
              {result.tier_percent > 0
                ? "Channel verified and tier locked in."
                : `Your channel has ${subs.toLocaleString()} subscribers. You need 1,000+ to start earning commissions — keep growing and your tier will unlock automatically.`}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-lg p-3" style={{ background: "hsl(var(--surface-2))" }}>
                <div className="text-[10px] text-muted-foreground">SUBSCRIBERS</div>
                <div className="text-xl font-bold">{subs.toLocaleString()}</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "hsl(var(--surface-2))" }}>
                <div className="text-[10px] text-muted-foreground">YOUR TIER</div>
                <div className="text-xl font-bold" style={{ color: "hsl(var(--cyan))" }}>{result.tier_percent}%</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: "hsl(var(--surface-2))" }}>
                <div className="text-[10px] text-muted-foreground">REFERRAL</div>
                <div className="text-sm font-mono font-bold">{channel?.referral_code}</div>
              </div>
            </div>

            {prog.next && (
              <div className="text-left mb-5">
                <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                  <span>Progress to {prog.next.label} ({prog.next.percent}%)</span>
                  <span>{prog.pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--surface-2))" }}>
                  <div className="h-full transition-all" style={{ width: `${prog.pct}%`, background: "linear-gradient(90deg, hsl(var(--cyan)), hsl(var(--purple)))" }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{(prog.next.min - subs).toLocaleString()} subs to next tier</div>
              </div>
            )}

            <button onClick={() => nav("/partner/dashboard")} className="px-5 py-2.5 rounded-xl font-bold text-white text-sm" style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))" }}>
              Go to Partner Dashboard
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (step === "prep") {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-black mb-2">Before you submit</h1>
          <p className="text-sm text-muted-foreground mb-6">Three quick requirements so we can verify your channel live via Telegram.</p>

          <div className="space-y-3 mb-6">
            <div className="rounded-xl border p-4 flex gap-3" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
              <Bot className="w-5 h-5 mt-0.5" style={{ color: "hsl(var(--purple))" }} />
              <div>
                 <div className="font-bold text-sm mb-1">1. Add our bot as admin</div>
                 <div className="text-xs text-muted-foreground">Open your Telegram channel → Manage → Administrators → Add @{botUsername}. Grant “Post Messages” + “View Members”.</div>
              </div>
            </div>
            <div className="rounded-xl border p-4 flex gap-3" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
              <Send className="w-5 h-5 mt-0.5" style={{ color: "hsl(var(--cyan))" }} />
              <div>
                 <div className="font-bold text-sm mb-1">2. Join @{mainChannelUsername}</div>
                <div className="text-xs text-muted-foreground">All partners must be subscribed to our main channel.</div>
              </div>
            </div>
            <div className="rounded-xl border p-4 flex gap-3" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
              <CheckCircle2 className="w-5 h-5 mt-0.5" style={{ color: "hsl(var(--purple))" }} />
              <div>
                 <div className="font-bold text-sm mb-1">3. Channel must have ≥ 1,000 subscribers</div>
                 <div className="text-xs text-muted-foreground">We pull the live count during verification. Below 1k can still be saved, but it won’t earn until it grows.</div>
              </div>
            </div>
          </div>

          <button onClick={() => setStep("form")} className="w-full py-3 rounded-xl font-bold text-white" style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))" }}>
            I'm ready — submit channel
          </button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-black mb-2">Submit your channel</h1>
        <p className="text-sm text-muted-foreground mb-6">Telegram is required. Discord is optional, and should use a Discord webhook URL if you want delivery there too.</p>

        {error && (
          <div className="rounded-lg border p-3 mb-4 flex gap-2 text-sm" style={{ background: "hsl(var(--destructive) / 0.1)", borderColor: "hsl(var(--destructive) / 0.3)", color: "hsl(var(--destructive))" }}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
          </div>
        )}

        <div className="rounded-xl border p-4 mb-4 space-y-3" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 mt-0.5" style={{ color: "hsl(var(--cyan))" }} />
            <div>
              <div className="text-sm font-bold">Submit checklist</div>
              <div className="text-xs text-muted-foreground mt-1">Use these exact requirements before pressing verify.</div>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>• Telegram channel username or channel id is required.</li>
            <li>• Add @{botUsername} as channel admin before submitting.</li>
            <li>• Discord field accepts a webhook URL, not an invite link.</li>
          </ul>
        </div>

        <div className="rounded-xl border p-4 mb-6" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
          <div className="flex items-start gap-3 mb-3">
            <ShieldAlert className="w-4 h-4 mt-0.5" style={{ color: "hsl(var(--purple))" }} />
            <div>
              <div className="text-sm font-bold">If submission fails</div>
              <div className="text-xs text-muted-foreground mt-1">Try these fixes first — they solve the most common verification issues.</div>
            </div>
          </div>
          <div className="space-y-2">
            {troubleshootingTips.map((tip) => (
              <div key={tip} className="text-xs text-muted-foreground">• {tip}</div>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <Field label="Telegram Channel Name" required value={form.telegram_channel_name} onChange={v => setForm({ ...form, telegram_channel_name: v })} placeholder="My Crypto Hub" />
          <Field label="Telegram Channel ID / @username" required value={form.telegram_channel_id} onChange={v => setForm({ ...form, telegram_channel_id: v })} placeholder="@mychannel or -1001234567890" />
          <Field label="Telegram Channel Link" value={form.telegram_channel_link} onChange={v => setForm({ ...form, telegram_channel_link: v })} placeholder="https://t.me/mychannel" />
          <div className="border-t pt-4" style={{ borderColor: "hsl(var(--border))" }}>
            <div className="text-xs font-bold text-muted-foreground mb-3">DISCORD (OPTIONAL)</div>
            <Field label="Discord Server Name" value={form.discord_server_name} onChange={v => setForm({ ...form, discord_server_name: v })} placeholder="My Server" />
            <div className="h-3" />
            <Field label="Discord Webhook URL" value={form.discord_invite_link} onChange={v => setForm({ ...form, discord_invite_link: v })} placeholder="https://discord.com/api/webhooks/..." />
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))" }}>
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying live via Telegram...</> : "Verify & submit"}
          </button>
        </form>
      </div>
    </PageLayout>
  );
}

function Field({ label, value, onChange, placeholder, required }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5">{label}{required && <span style={{ color: "hsl(var(--destructive))" }}> *</span>}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="w-full px-3 py-2 rounded-lg border text-sm bg-transparent"
        style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }} />
    </div>
  );
}
