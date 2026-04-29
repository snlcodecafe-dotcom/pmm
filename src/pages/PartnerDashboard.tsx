import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, ExternalLink, TrendingUp, Users, Coins, Crown, Check, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PageLayout from "@/components/PageLayout";
import { progressToNext } from "@/lib/partnerTiers";

type Channel = {
  id: string;
  telegram_channel_name: string | null;
  telegram_channel_id: string | null;
  telegram_channel_link: string | null;
  discord_server_name: string | null;
  subscriber_count: number;
  tier_percent: number;
  referral_code: string | null;
  verification_status: string;
};

export default function PartnerDashboard() {
  const nav = useNavigate();
  const { user, loading } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/auth?next=/partner/dashboard"); return; }
    void load();
  }, [user, loading]);

  async function load() {
    const { data: ch } = await supabase.from("partner_channels").select("*").eq("user_id", user!.id).order("subscriber_count", { ascending: false });
    setChannels((ch as Channel[]) ?? []);
    const { data: e } = await supabase.from("partner_earnings").select("*, token_submissions(token_symbol, token_address)").eq("partner_user_id", user!.id).order("created_at", { ascending: false }).limit(50);
    setEarnings(e || []);
  }

  if (loading) return <PageLayout><div className="p-10 text-center">Loading...</div></PageLayout>;

  if (channels.length === 0) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <h2 className="text-xl font-bold mb-3">No partner channels yet</h2>
          <p className="text-sm text-muted-foreground mb-5">Add your first Telegram channel to start earning commissions.</p>
          <button onClick={() => nav("/partner/apply")} className="px-5 py-2.5 rounded-xl font-bold text-white" style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))" }}>
            Apply as Partner
          </button>
        </div>
      </PageLayout>
    );
  }

  // Aggregate stats — headline tier is the highest channel
  const top = channels[0];
  const totalSubs = channels.reduce((s, c) => s + (c.subscriber_count || 0), 0);
  const prog = progressToNext(top.subscriber_count);
  const totalEarned = earnings.reduce((s, e) => s + Number(e.commission_sol || 0), 0);
  const pendingEarned = earnings.filter(e => e.payout_status === "pending").reduce((s, e) => s + Number(e.commission_sol || 0), 0);

  function copyLink(code: string) {
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${code}`);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  return (
    <PageLayout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5" style={{ color: "hsl(var(--cyan))" }} />
            <h1 className="text-2xl font-black">Partner Dashboard</h1>
          </div>
          <button onClick={() => nav("/profile")} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border" style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--purple))" }}>
            <Settings className="w-3.5 h-3.5" /> Manage channels
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="TOP TIER" value={`${top.tier_percent}%`} sub={prog.current?.label || "Starter"} />
          <Stat label="TOTAL SUBS" value={totalSubs.toLocaleString()} icon={<Users className="w-4 h-4" />} sub={`${channels.length} channel${channels.length === 1 ? "" : "s"}`} />
          <Stat label="TOTAL EARNED" value={`${totalEarned.toFixed(3)} SOL`} icon={<Coins className="w-4 h-4" />} />
          <Stat label="PENDING PAYOUT" value={`${pendingEarned.toFixed(3)} SOL`} />
        </div>

        {prog.next && (
          <div className="rounded-xl border p-4" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
            <div className="flex justify-between text-xs mb-2">
              <span className="font-bold">Top channel progress to {prog.next.label} ({prog.next.percent}%)</span>
              <span className="text-muted-foreground">{(prog.next.min - top.subscriber_count).toLocaleString()} subs to go</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "hsl(var(--surface-2))" }}>
              <div className="h-full" style={{ width: `${prog.pct}%`, background: "linear-gradient(90deg, hsl(var(--cyan)), hsl(var(--purple)))" }} />
            </div>
          </div>
        )}

        <div className="rounded-xl border p-4" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4" style={{ color: "hsl(var(--cyan))" }} />
            <h3 className="font-bold">Your channels &amp; referral links</h3>
          </div>
          <div className="space-y-2">
            {channels.map(c => {
              const link = `${window.location.origin}/?ref=${c.referral_code}`;
              return (
                <div key={c.id} className="rounded-lg border p-3 space-y-2" style={{ background: "hsl(var(--surface-2))", borderColor: "hsl(var(--border))" }}>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate flex items-center gap-2">
                        {c.telegram_channel_name || c.telegram_channel_id}
                        {c.telegram_channel_link && <a href={c.telegram_channel_link} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-3 h-3" /></a>}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{c.subscriber_count.toLocaleString()} subs · tier <span style={{ color: "hsl(var(--cyan))" }} className="font-bold">{c.tier_percent}%</span></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input readOnly value={link} className="flex-1 min-w-0 px-2 py-1.5 rounded border text-[11px] font-mono" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }} />
                    <button onClick={() => copyLink(c.referral_code!)} className="px-3 py-1.5 rounded text-[11px] font-bold flex items-center gap-1 shrink-0" style={{ background: "hsl(var(--purple) / 0.2)", color: "hsl(var(--purple))" }}>
                      {copiedCode === c.referral_code ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border p-4" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
          <h3 className="font-bold mb-3 text-sm">Recent earnings</h3>
          {earnings.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-6">No earnings yet. Share your links to start earning.</div>
          ) : (
            <div className="space-y-2">
              {earnings.map(e => (
                <div key={e.id} className="flex justify-between items-center p-2 rounded-lg" style={{ background: "hsl(var(--surface-2))" }}>
                  <div>
                    <div className="text-sm font-bold">{e.token_submissions?.token_symbol || "—"}</div>
                    <div className="text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleDateString()} · ref {e.referral_code}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm" style={{ color: "hsl(var(--cyan))" }}>+{Number(e.commission_sol).toFixed(4)} SOL</div>
                    <div className="text-[10px] text-muted-foreground">{e.payout_status}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

function Stat({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3" style={{ background: "hsl(var(--surface-1))", borderColor: "hsl(var(--border))" }}>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">{icon} {label}</div>
      <div className="text-xl font-black">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
