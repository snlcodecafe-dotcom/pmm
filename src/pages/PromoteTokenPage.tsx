import { useParams, Link } from "react-router-dom";
import { ArrowRight, Zap, TrendingUp, Users, Shield, CheckCircle2, Share2 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead, { breadcrumbSchema, faqSchema, productSchema } from "@/components/SEOHead";

function slugToName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function slugToSymbol(slug: string): string {
  return slug.replace(/-/g, "").toUpperCase().slice(0, 6);
}

const STEPS = [
  { n: "01", title: "Connect Your Wallet", desc: "Link your Phantom or Solflare wallet — takes 10 seconds, no sign-up needed." },
  { n: "02", title: "Submit Your Token", desc: "Paste your Solana contract address, choose your promotion tier." },
  { n: "03", title: "Watch It Go Live", desc: "Your token hits 147+ Telegram groups, Twitter/X, and Discord instantly." },
];

export default function PromoteTokenPage() {
  const { "token-name": slug = "token" } = useParams<{ "token-name": string }>();
  const tokenName = slugToName(slug);
  const symbol = slugToSymbol(slug);

  const faqs = [
    { question: `How do I promote ${tokenName} fast?`, answer: `The fastest way to promote ${tokenName} is to use an automated multi-channel platform like PromoteMyMemes. Submit your token address, choose a plan, and your promotion goes live across 147+ Telegram groups, Twitter/X, and Discord within minutes.` },
    { question: `How much does it cost to promote ${symbol}?`, answer: `Promotion starts completely free — zero SOL required. Paid plans start at 0.1 SOL for the Advanced package which includes 50+ Telegram groups, Twitter/X posts, and Discord engagement. The Premium plan (0.5 SOL) adds 147 groups and 24h hourly posting.` },
    { question: `Does ${symbol} promotion generate real buyers?`, answer: `Our platform distributes to real active crypto communities with genuine members. While no platform can guarantee buys, multi-channel exposure significantly increases the probability of organic buyers discovering your token.` },
    { question: `How long does ${tokenName} promotion last?`, answer: `Basic promotions run for 10 minutes. Advanced plans provide 3 hours of active promotion, and Premium plans deliver 24 hours of continuous hourly posting across all platforms.` },
    { question: `What channels will ${symbol} be promoted on?`, answer: `Your token will be promoted on Telegram (147+ groups), Twitter/X (automated posts), Discord (89 servers), and listed on our public trending pages which get indexed by Google — giving you organic SEO reach too.` },
  ];

  return (
    <PageLayout>
      <SEOHead
        title={`Promote ${tokenName} — Get Real Buyers for $${symbol} Fast`}
        description={`Promote ${tokenName} ($${symbol}) to 147+ Telegram groups, Twitter/X, and Discord in minutes. Start free or pay 0.1 SOL for Advanced reach. The fastest way to get real buyers for ${symbol}.`}
        canonical={`/promote-${slug}`}
        keywords={`promote ${tokenName.toLowerCase()}, ${symbol} promotion, how to promote ${symbol}, get buyers for ${symbol}, ${symbol} marketing, ${tokenName.toLowerCase()} crypto marketing`}
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Promote", url: "/" },
            { name: `Promote ${symbol}`, url: `/promote-${slug}` },
          ]),
          productSchema({
            name: `Promote ${tokenName}`,
            description: `Automated multi-channel promotion for ${tokenName} ($${symbol}) — Telegram, Twitter/X, Discord.`,
            url: `https://promotemymemes.com/promote-${slug}`,
          }),
          faqSchema(faqs),
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/" className="hover:text-foreground transition-colors">Promote</Link>
          <span>/</span>
          <span className="text-foreground">Promote {symbol}</span>
        </nav>

        {/* Hero */}
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-5 border border-primary/30 bg-primary/10 text-primary">
            <Zap className="h-3 w-3" /> Instant Multi-Channel Promotion
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-5 leading-tight">
            Promote <span className="gradient-text-purple">{tokenName}</span><br />
            to 147+ Groups
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Get real buyers for <strong>${symbol}</strong> fast. Our automated promotion engine distributes your token across Telegram, Twitter/X, and Discord — starting free.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/" className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-black text-base hover:opacity-90 transition-opacity flex items-center gap-2">
              <Zap className="h-5 w-5" /> Promote {symbol} Now — Free
            </Link>
            <button
              onClick={() => navigator.share?.({ title: `Promote ${tokenName}`, url: window.location.href })}
              className="px-5 py-4 rounded-xl border border-border hover:bg-surface-2 transition-colors flex items-center gap-2 text-sm font-semibold"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { label: "Telegram Groups", value: "147+", icon: "✈️" },
            { label: "Discord Servers", value: "89+", icon: "💬" },
            { label: "Tokens Promoted", value: "1,200+", icon: "🚀" },
            { label: "Delivery Time", value: "< 5 min", icon: "⚡" },
          ].map(s => (
            <div key={s.label} className="card-glass rounded-xl p-5 border border-border text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-black text-primary mb-1">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </section>

        {/* How It Works */}
        <section className="mb-16">
          <h2 className="text-2xl font-black text-center mb-8">How to Promote {tokenName} in 3 Steps</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s) => (
              <div key={s.n} className="card-glass rounded-xl p-6 border border-border">
                <div className="text-4xl font-black gradient-text-purple mb-3">{s.n}</div>
                <h3 className="font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why Promote */}
        <section className="mb-16">
          <h2 className="text-2xl font-black mb-6">Why Promote {tokenName} on PromoteMyMemes?</h2>
          <div className="card-glass rounded-xl border border-border p-6 mb-6">
            <p className="text-muted-foreground leading-relaxed mb-4">
              <strong className="text-foreground">{tokenName} (${symbol})</strong> needs real visibility to gain traction. Most Solana memecoins fail not because of poor fundamentals, but because they never reach enough potential buyers. Our platform solves this with instant multi-channel distribution.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you promote <strong className="text-foreground">${symbol}</strong>, your token gets posted across 147+ active Telegram crypto communities, automated Twitter/X posts, and Discord server shills — simultaneously. This multi-channel approach creates the social proof and FOMO that drives organic buying.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Additionally, {tokenName} gets a public SEO page on PromoteMyMemes that gets indexed by Google — giving you long-term organic traffic from people searching for "{tokenName.toLowerCase()} token" and "how to buy ${symbol}".
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: <TrendingUp className="h-5 w-5" />, title: "Multi-Platform Reach", desc: `${symbol} gets simultaneously distributed to Telegram, Twitter/X, and Discord.` },
              { icon: <Users className="h-5 w-5" />, title: "Real Crypto Communities", desc: "147+ active groups with genuine crypto traders and memecoin hunters." },
              { icon: <Shield className="h-5 w-5" />, title: "Risk Scanning Included", desc: `We scan ${symbol} for honeypots, rug risk, and liquidity issues before promotion.` },
              { icon: <CheckCircle2 className="h-5 w-5" />, title: "SEO Token Page", desc: `${tokenName} gets a public page on Google-indexed PromoteMyMemes.` },
            ].map((f, i) => (
              <div key={i} className="card-glass rounded-xl p-4 border border-border flex items-start gap-3">
                <div className="mt-1 text-primary flex-shrink-0">{f.icon}</div>
                <div>
                  <div className="font-semibold text-sm mb-1">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-black mb-6">FAQs — Promoting {tokenName}</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="card-glass rounded-xl border border-border group">
                <summary className="p-5 font-semibold cursor-pointer text-sm list-none flex items-center justify-between">
                  {f.question}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{f.answer}</div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-border mb-12">
          <h2 className="text-2xl font-black mb-3">Start Promoting {tokenName} Right Now</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Get ${symbol} in front of real buyers across 147+ Telegram groups, Twitter/X, and Discord. Start free — upgrade anytime.
          </p>
          <Link to="/" className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
            🚀 Promote {symbol} — Start Free
          </Link>
        </section>

        {/* Internal Links */}
        <section>
          <h2 className="text-xl font-bold mb-4">Related Resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { to: "/", label: "Memecoin Promotion Guide" },
              { to: "/top-promoted-tokens", label: "Trending Memecoins" },
              { to: `/token/${slug}`, label: `${symbol} Token Stats` },
              { to: "/promote-pumpfun-token", label: "Pump.fun Promotion" },
              { to: "/crypto-marketing-tool", label: "Crypto Marketing Tools" },
              { to: "/blog/how-to-promote-memecoin-2026", label: "How to Promote in 2026" },
            ].map(l => (
              <Link key={l.to} to={l.to} className="card-glass rounded-xl p-4 border border-border hover:border-primary/40 transition-colors group flex items-center justify-between">
                <span className="text-sm font-medium group-hover:text-primary transition-colors">{l.label}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </PageLayout>
  );
}
