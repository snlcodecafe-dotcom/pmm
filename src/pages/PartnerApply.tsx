import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Crown, TrendingUp, Users, Zap, DollarSign, CheckCircle2,
  Link2, BarChart3, Wallet, Shield, Clock, Sparkles, MessageSquare, Send,
} from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead from "@/components/SEOHead";
import { PARTNER_TIERS } from "@/lib/partnerTiers";

export default function PartnerApply() {
  const nav = useNavigate();

  const HOW_STEPS = [
    {
      icon: Users,
      title: "Connect your channel",
      desc: "Add our verification bot as admin to your Telegram channel (or paste your Discord invite). Takes 30 seconds.",
      color: "hsl(var(--cyan))",
    },
    {
      icon: Zap,
      title: "Get auto-tiered",
      desc: "We pull your live subscriber count via the Telegram Bot API and lock in your commission % automatically. No manual review.",
      color: "hsl(var(--purple))",
    },
    {
      icon: Link2,
      title: "Share your referral link",
      desc: "You get a unique referral code + landing URL. Drop it in pinned messages, bios, or content posts.",
      color: "hsl(45 100% 55%)",
    },
    {
      icon: DollarSign,
      title: "Earn SOL on every promo",
      desc: "Anyone who buys a promotion via your link pays you % directly. Tracked on-chain. Paid in SOL — no holds, no minimums.",
      color: "hsl(120 70% 55%)",
    },
  ];

  const EARNING_EXAMPLES = [
    { tier: "Pro (5K subs)", pct: 3, promos: 30, avg: 0.3, monthly: 0.27 },
    { tier: "Elite (10K subs)", pct: 5, promos: 50, avg: 0.4, monthly: 1.0 },
    { tier: "Whale (20K subs)", pct: 7, promos: 80, avg: 0.5, monthly: 2.8 },
    { tier: "Legend (30K+ subs)", pct: 10, promos: 120, avg: 0.6, monthly: 7.2 },
  ];

  const WHY_PARTNER = [
    { icon: Shield, title: "No exclusivity", desc: "Promote anything else you want. We're additive, not a replacement." },
    { icon: Clock, title: "Passive income", desc: "Drop one link in your pinned post — earn forever from anyone who clicks and pays." },
    { icon: Wallet, title: "Paid in SOL", desc: "Direct on-chain payouts. No invoicing, no Stripe holds, no 30-day waits." },
    { icon: BarChart3, title: "Live dashboard", desc: "See clicks, conversions, and SOL earned in real-time at /partner/dashboard." },
    { icon: Sparkles, title: "Auto-upgrades", desc: "As your channel grows, your tier % goes up automatically. Re-check anytime." },
    { icon: MessageSquare, title: "Co-promo support", desc: "We help with copy templates, banners, and channel optimization tips." },
  ];

  const FAQ = [
    {
      q: "How is my subscriber count verified?",
      a: "We use the official Telegram Bot API to read your channel's live member count. The bot only needs admin permission to read; it cannot post or moderate.",
    },
    {
      q: "When do I get paid?",
      a: "Commissions accrue per campaign. Payouts in SOL are sent on-chain to your connected Phantom/Backpack wallet — typically within 24h of campaign completion.",
    },
    {
      q: "Can I refer Discord servers too?",
      a: "Yes — you can submit a Discord server invite alongside (or instead of) Telegram. Tier is calculated on combined verified audience.",
    },
    {
      q: "Is there a minimum payout?",
      a: "No. Even 0.01 SOL gets paid out. We don't believe in withholding tiny balances to inflate retention.",
    },
    {
      q: "What if my channel grows from 5K to 20K subs?",
      a: "Hit 'Re-check tier' on your dashboard — your % auto-upgrades from 3% (Pro) to 7% (Whale) instantly. Future promos use the new rate.",
    },
    {
      q: "Can my audience trust the products I promote?",
      a: "Every promotion goes through our risk scanner (honeypot, LP lock, top holder %). You're sharing real on-chain campaigns, not random shitcoins.",
    },
  ];

  return (
    <PageLayout>
      <SEOHead
        title="Earn SOL as a Promotion Partner — Up to 10% Commission"
        description="Telegram and Discord channel owners earn up to 10% on every paid promotion. Auto-tiered by subscriber count, paid in SOL on-chain. No quotas, no contracts."
        canonical="/partner/apply"
        keywords="telegram crypto partner program, earn sol referrals, crypto promotion affiliate, solana partner program"
      />
      <main className="app-page-shell">
        <div className="app-shell-container">
        {/* ── Hero ── */}
        <div className="text-center mb-12">
          <div className="app-eyebrow mb-4">
            <Crown className="w-3 h-3" /> PARTNER PROGRAM · OPEN
          </div>
          <h1 className="app-headline mb-4">
            Turn your audience into passive SOL income
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Already running a Telegram or Discord crypto channel? Earn <strong className="text-foreground">up to 10%</strong> on every paid promotion that flows through your referral link. Auto-tiered, on-chain payouts, zero exclusivity.
          </p>
          <button onClick={() => nav("/partner/apply/channel")}
            className="app-gradient-action inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold transition-all hover:opacity-90 active:scale-95"
            style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))", boxShadow: "0 0 40px hsl(var(--cyan) / 0.35)" }}>
            <Crown className="w-5 h-5" /> Apply as Partner — it's free <ArrowRight className="w-4 h-4" />
          </button>
          <div className="text-xs text-muted-foreground mt-3">No application review · Auto-approved on subscriber verification</div>
        </div>

        {/* ── Tier Grid ── */}
        <div className="mb-14">
          <h2 className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Commission Tiers</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {PARTNER_TIERS.map((t, i) => (
              <div key={t.label} className="app-panel rounded-xl p-4 text-center transition-all hover:-translate-y-1" style={{ borderColor: i === PARTNER_TIERS.length - 1 ? "hsl(var(--cyan) / 0.5)" : undefined, boxShadow: i === PARTNER_TIERS.length - 1 ? "0 0 30px hsl(var(--cyan) / 0.2)" : undefined }}>
                <div className="text-[10px] font-bold text-muted-foreground mb-1">TIER {i + 1}</div>
                <div className="font-bold mb-1 text-sm">{t.label}</div>
                <div className="text-2xl font-black" style={{ color: "hsl(var(--cyan))" }}>{t.percent}%</div>
                <div className="text-[10px] text-muted-foreground mt-1">{t.min.toLocaleString()}+ subs</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── How It Works ── */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2">How it works</h2>
            <p className="text-sm text-muted-foreground">From application to first SOL payout in under 5 minutes.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_STEPS.map((s, i) => (
               <div key={i} className="app-panel relative rounded-2xl p-5">
                <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white" style={{ background: s.color }}>{i + 1}</div>
                <s.icon className="w-6 h-6 mb-3" style={{ color: s.color }} />
                <div className="font-black text-sm mb-1.5">{s.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Earning Examples ── */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2">What you can actually earn</h2>
            <p className="text-sm text-muted-foreground">Real math, no hype. Based on average promo prices on the platform.</p>
          </div>
           <div className="app-panel overflow-hidden rounded-2xl">
            <div className="grid grid-cols-5 gap-3 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b" style={{ borderColor: "hsl(var(--border) / 0.5)" }}>
              <div className="col-span-2">Channel size</div>
              <div className="text-center">Promos/mo</div>
              <div className="text-center">Avg price</div>
              <div className="text-right">Your monthly $</div>
            </div>
            {EARNING_EXAMPLES.map((e, i) => (
              <div key={i} className="grid grid-cols-5 gap-3 px-5 py-4 text-sm border-b last:border-0 hover:bg-surface-2 transition-colors" style={{ borderColor: "hsl(var(--border) / 0.3)" }}>
                <div className="col-span-2">
                  <div className="font-bold">{e.tier}</div>
                  <div className="text-[11px] text-muted-foreground">{e.pct}% commission</div>
                </div>
                <div className="text-center font-mono text-muted-foreground">{e.promos}</div>
                <div className="text-center font-mono text-muted-foreground">{e.avg} SOL</div>
                <div className="text-right font-black tabular-nums" style={{ color: "hsl(var(--cyan))" }}>
                  {e.monthly.toFixed(2)} SOL
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Conservative estimates. Top partners earn <strong className="text-foreground">10+ SOL/mo</strong> by featuring our promo card in pinned messages and weekly content.
          </p>
        </section>

        {/* ── Why Partner ── */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2">Why partner with us</h2>
            <p className="text-sm text-muted-foreground">Built for crypto creators who hate the usual affiliate program BS.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {WHY_PARTNER.map((w, i) => (
               <div key={i} className="app-panel rounded-2xl p-5">
                <w.icon className="w-5 h-5 mb-3" style={{ color: "hsl(var(--cyan))" }} />
                <div className="font-bold text-sm mb-1">{w.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{w.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How to use your existing channel ── */}
        <section className="mb-16 rounded-3xl p-8 border" style={{ background: "linear-gradient(135deg, hsl(var(--purple) / 0.08), hsl(var(--cyan) / 0.05))", borderColor: "hsl(var(--purple) / 0.2)" }}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black mb-2">Already have a channel? Here's how to maximize it.</h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">3 proven plays our top partners use to earn passively without spamming their audience.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { n: "01", title: "Pin the promo card", desc: 'Drop a single pinned message: "Promote your token here → [your link]". Earns daily on autopilot.' },
              { n: "02", title: "Weekly featured slot", desc: 'Run a "Token of the Week" or "Promo Spotlight" post. Tokens pay you to be featured via your link.' },
              { n: "03", title: "Bot integration", desc: "Add a /promote command to your channel bot that auto-DMs your referral link to anyone who asks." },
            ].map((p) => (
               <div key={p.n} className="app-panel rounded-2xl p-5">
                <div className="text-3xl font-black mb-2" style={{ color: "hsl(var(--purple) / 0.4)" }}>{p.n}</div>
                <div className="font-bold text-sm mb-1.5">{p.title}</div>
                <div className="text-xs text-muted-foreground leading-relaxed">{p.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black mb-2">Frequently asked</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {FAQ.map((f, i) => (
              <div key={i} className="app-panel rounded-2xl p-5">
                <div className="font-bold text-sm mb-2 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "hsl(var(--cyan))" }} />
                  {f.q}
                </div>
                <div className="text-xs text-muted-foreground leading-relaxed pl-6">{f.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Final CTA ── */}
         <section className="app-panel relative overflow-hidden rounded-3xl border-cyan p-10 text-center">
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(ellipse at center, hsl(var(--cyan) / 0.15), transparent 70%)" }} />
          <div className="relative z-10">
            <Send className="w-10 h-10 mx-auto mb-4" style={{ color: "hsl(var(--cyan))" }} />
            <h2 className="text-3xl font-black mb-3">Ready to start earning?</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto mb-6">
              Connect your channel in under 60 seconds. No interview, no quota — just verified subs and your % locked in.
            </p>
            <button onClick={() => nav("/partner/apply/channel")}
              className="app-gradient-action inline-flex items-center gap-2 rounded-2xl px-10 py-4 text-base font-semibold transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg, hsl(var(--cyan)), hsl(var(--purple)))", boxShadow: "0 0 40px hsl(var(--cyan) / 0.35)" }}>
              <Crown className="w-5 h-5" /> Apply as Partner <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>
        </div>
      </main>
    </PageLayout>
  );
}
