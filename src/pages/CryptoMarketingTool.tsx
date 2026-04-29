import { Link } from "react-router-dom";
import { Zap, Bot, BarChart3, Globe, ArrowRight, CheckCircle2 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead, { productSchema, faqSchema } from "@/components/SEOHead";

const FAQS = [
  { question: "What is a crypto marketing tool?", answer: "A crypto marketing tool automates the promotion of cryptocurrency tokens across social media platforms. PromoteMyMemes uses AI and bots to distribute your token information to Telegram groups, Twitter/X, and Discord simultaneously." },
  { question: "Why do I need a crypto marketing tool?", answer: "Manual crypto marketing is slow and doesn't scale. A crypto marketing tool like PromoteMyMemes allows you to reach hundreds of communities simultaneously, generate AI-powered content, and track results — all in one platform." },
  { question: "What makes PromoteMyMemes different from other crypto marketing tools?", answer: "PromoteMyMemes is specifically built for memecoin promotion with Solana integration, AI content generation, 147+ active Telegram groups, real-time analytics, and community mission systems. It's the most comprehensive tool available." },
  { question: "Is PromoteMyMemes free to use?", answer: "Yes! We offer a free tier that includes homepage listing, AI post generation, and distribution to 3 Telegram groups. Paid plans start at 0.1 SOL for extended reach and features." },
];

const TOOLS = [
  {
    icon: <Bot className="h-6 w-6" />,
    title: "AI Content Generator",
    desc: "Generate platform-optimized marketing content for Telegram, Twitter/X, and Discord. Our AI understands memecoin culture and creates engaging, shareable posts.",
    features: ["Platform-specific tone", "Emoji optimization", "Hashtag research", "Multiple variations"],
  },
  {
    icon: <Globe className="h-6 w-6" />,
    title: "Multi-Channel Distribution",
    desc: "Distribute your token promotion to 147+ Telegram groups, 89 Discord servers, and automated Twitter/X posts simultaneously with a single click.",
    features: ["147+ Telegram groups", "89 Discord servers", "Twitter/X automation", "Scheduled posting"],
  },
  {
    icon: <BarChart3 className="h-6 w-6" />,
    title: "Real-Time Analytics",
    desc: "Track every aspect of your promotion campaign. Monitor views, engagement, holder growth, and platform-specific metrics in real time.",
    features: ["Live metrics dashboard", "Engagement tracking", "Holder analytics", "Bot activity log"],
  },
  {
    icon: <Zap className="h-6 w-6" />,
    title: "Viral Sharing Tools",
    desc: "Create shareable token pages, referral campaigns, and community leaderboards that generate organic viral sharing.",
    features: ["Shareable token pages", "Referral system", "Leaderboards", "Social sharing cards"],
  },
];

export default function CryptoMarketingTool() {
  return (
    <PageLayout>
      <SEOHead
        title="Crypto Marketing Tool — Promote Any Token Automatically"
        description="The most powerful crypto marketing tool for memecoin promotion. AI-generated content, 147+ Telegram groups, Discord, Twitter/X — all automated. Free to start."
        canonical="/crypto-marketing-tool"
        keywords="crypto marketing tool, cryptocurrency marketing software, token promotion tool, crypto promotion automation, memecoin marketing platform"
        schema={[
          productSchema({ name: "PromoteMyMemes Crypto Marketing Tool", description: "Automated crypto marketing tool for memecoin promotion across Telegram, Twitter/X, and Discord.", url: "https://promotemymemes.com/crypto-marketing-tool" }),
          faqSchema(FAQS),
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-sm mb-6">
            <Bot className="h-3.5 w-3.5" /> AI-Powered Crypto Marketing
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            The Ultimate<br />
            <span className="gradient-text-purple">Crypto Marketing Tool</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Stop manually spamming Telegram groups. Let our automated crypto marketing tool do the heavy lifting — <strong className="text-foreground">AI content, multi-channel distribution, and real-time analytics</strong> in one platform.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity glow-purple">
            <Zap className="h-5 w-5" /> Try the Tool Free
          </Link>
        </section>

        {/* Tools Grid */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-4">Everything in One Crypto Marketing Tool</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Built by crypto traders for crypto traders. Every feature is designed to drive real results for memecoin promotion.
          </p>
          <div className="grid md:grid-cols-2 gap-8">
            {TOOLS.map(t => (
              <div key={t.title} className="card-glass rounded-xl p-8 border border-border">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-5">{t.icon}</div>
                <h3 className="text-xl font-bold mb-3">{t.title}</h3>
                <p className="text-muted-foreground mb-5">{t.desc}</p>
                <ul className="space-y-2">
                  {t.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-secondary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">PromoteMyMemes vs Manual Marketing</h2>
          <div className="card-glass rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-3 bg-surface-2 p-4 text-sm font-semibold">
              <div>Feature</div>
              <div className="text-center text-muted-foreground">Manual</div>
              <div className="text-center gradient-text-purple">PromoteMyMemes</div>
            </div>
            {[
              ["Time to reach 100+ groups", "4-8 hours", "Under 10 minutes"],
              ["Content creation", "Manual writing", "AI-generated"],
              ["Platform coverage", "1-2 platforms", "Telegram + Twitter + Discord"],
              ["Analytics", "None", "Real-time dashboard"],
              ["Consistency", "Inconsistent", "Automated 24/7"],
              ["Cost", "Hours of your time", "Free or 0.1 SOL"],
            ].map(([feat, manual, ours]) => (
              <div key={feat as string} className="grid grid-cols-3 p-4 border-t border-border items-center">
                <div className="text-sm font-medium">{feat}</div>
                <div className="text-center text-sm text-muted-foreground">{manual}</div>
                <div className="text-center text-sm text-secondary font-medium">{ours}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Crypto Marketing Tool FAQ</h2>
          <div className="space-y-4">
            {FAQS.map(f => (
              <details key={f.question} className="card-glass rounded-xl border border-border group">
                <summary className="p-5 font-semibold cursor-pointer flex items-center justify-between list-none">
                  {f.question}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                </summary>
                <p className="px-5 pb-5 text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Internal Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Explore Our Platform</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { to: "/", label: "Memecoin Promotion", desc: "Multi-channel promotion for your memecoin" },
              { to: "/promote-pumpfun-token", label: "Pump.fun Promotion", desc: "Specialized tools for pump.fun tokens" },
              { to: "/telegram-crypto-promotion", label: "Telegram Promotion", desc: "Reach 147+ Telegram groups instantly" },
              { to: "/top-promoted-tokens", label: "Trending Memecoins", desc: "Discover what's trending right now" },
            ].map(l => (
              <Link key={l.to} to={l.to} className="card-glass rounded-xl p-5 border border-border hover:border-primary/40 transition-colors group flex items-center justify-between">
                <div>
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{l.label}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{l.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </PageLayout>
  );
}
