import { Link } from "react-router-dom";
import { Rocket, Megaphone, Users, TrendingUp, ArrowRight, CheckCircle2, Zap, Target, BarChart3 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead, { productSchema, faqSchema } from "@/components/SEOHead";

const FAQS = [
  { question: "What is memecoin promotion?", answer: "Memecoin promotion is the process of marketing a meme-based cryptocurrency to drive awareness, holders, volume, and price action. PromoteMyMemes automates this across Telegram, Twitter/X, and Discord with AI-generated viral content." },
  { question: "How do I promote my memecoin effectively?", answer: "Effective memecoin promotion requires three things: viral content, multi-channel distribution, and consistent engagement. Our platform handles all three — generate AI content, broadcast to 147+ Telegram groups, and track real-time engagement automatically." },
  { question: "How much does memecoin promotion cost?", answer: "We offer a free tier that includes homepage listing and limited distribution. Paid plans start at 0.1 SOL and scale up based on reach, duration, and added services like Twitter raids and trending boosts." },
  { question: "How long does it take to see results?", answer: "Most campaigns generate measurable engagement (views, clicks, joins) within the first hour of activation. Holder growth and volume usually follow within 24-48 hours, depending on the package and token fundamentals." },
  { question: "Will my memecoin go viral?", answer: "Going viral depends on token fundamentals, timing, and community resonance. We can't guarantee virality, but we maximize your odds with proven distribution channels, viral content templates, and engagement automation." },
];

const STEPS = [
  { num: "01", icon: <Rocket className="h-5 w-5" />, title: "Submit Your Token", desc: "Paste your contract address and pick a promotion package. Setup takes under 60 seconds." },
  { num: "02", icon: <Zap className="h-5 w-5" />, title: "AI Generates Content", desc: "Our AI writes viral-ready posts tuned for Telegram, Twitter/X, and Discord — with emojis, hashtags, and hooks." },
  { num: "03", icon: <Megaphone className="h-5 w-5" />, title: "Multi-Channel Blast", desc: "Your token is broadcast to 147+ Telegram groups, 89 Discord servers, and Twitter/X simultaneously." },
  { num: "04", icon: <BarChart3 className="h-5 w-5" />, title: "Track & Optimize", desc: "Watch real-time analytics: views, clicks, joins, and holder growth. Re-run or upgrade any time." },
];

const BENEFITS = [
  { icon: <Users className="h-6 w-6" />, title: "Real Holders, Not Bots", desc: "We focus on engagement that converts to real wallets — no fake volume, no wash trading." },
  { icon: <Target className="h-6 w-6" />, title: "Targeted Crypto Audiences", desc: "Our network is built from active memecoin traders on Solana, Ethereum, Base, and BSC." },
  { icon: <TrendingUp className="h-6 w-6" />, title: "Proven Viral Formulas", desc: "Content templates refined across thousands of campaigns. Hooks, narratives, and CTAs that move holders." },
  { icon: <Zap className="h-6 w-6" />, title: "Instant Activation", desc: "No waiting, no onboarding calls. Pay in SOL and your campaign goes live within minutes." },
];

export default function MemecoinPromotion() {
  return (
    <PageLayout>
      <SEOHead
        title="Memecoin Promotion — Automated Marketing for Solana Tokens"
        description="Promote your memecoin to 147+ Telegram groups, Twitter/X and Discord automatically. AI-generated content, real holders, real-time analytics. Start free."
        canonical="/memecoin-promotion"
        keywords="memecoin promotion, promote memecoin, solana memecoin marketing, pump.fun promotion, crypto token promotion, viral memecoin marketing"
        schema={[
          productSchema({ name: "Memecoin Promotion by PromoteMyMemes", description: "Automated memecoin promotion across Telegram, Twitter/X, and Discord with AI viral content.", url: "https://promotemymemes.com/memecoin-promotion" }),
          faqSchema(FAQS),
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
            <Megaphone className="h-3.5 w-3.5" /> Memecoin Promotion Engine
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Promote Your Memecoin<br />
            <span className="gradient-text-purple">Like It's 2021 Again</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Stop shouting into empty Telegram groups. Launch a real <strong className="text-foreground">memecoin promotion campaign</strong> across 147+ groups, Twitter/X, and Discord — powered by AI viral content.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/launch-token" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity glow-purple">
              <Rocket className="h-5 w-5" /> Launch Campaign
            </Link>
            <Link to="/top-promoted-tokens" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-border font-bold text-lg hover:border-primary/40 transition-colors">
              <TrendingUp className="h-5 w-5" /> See Trending
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-4">How Memecoin Promotion Works</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            From submission to viral broadcast in four automated steps.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(s => (
              <div key={s.num} className="card-glass rounded-xl p-6 border border-border relative">
                <div className="text-5xl font-black text-primary/10 absolute top-2 right-4">{s.num}</div>
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">{s.icon}</div>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose PromoteMyMemes</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {BENEFITS.map(b => (
              <div key={b.title} className="card-glass rounded-xl p-8 border border-border flex gap-5">
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">{b.icon}</div>
                <div>
                  <h3 className="text-xl font-bold mb-2">{b.title}</h3>
                  <p className="text-muted-foreground">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What's Included */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">What's in Every Promotion Campaign</h2>
          <div className="card-glass rounded-xl p-8 border border-border max-w-3xl mx-auto">
            <ul className="grid sm:grid-cols-2 gap-4">
              {[
                "Featured listing on PromoteMyMemes",
                "AI-generated viral posts",
                "147+ Telegram group blast",
                "89 Discord server distribution",
                "Twitter/X automated posting",
                "Real-time analytics dashboard",
                "Holder growth tracking",
                "Engagement reports",
                "SEO-optimized token page",
                "Shareable referral links",
              ].map(item => (
                <li key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-secondary flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Memecoin Promotion FAQ</h2>
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

        {/* CTA */}
        <section className="text-center max-w-3xl mx-auto mb-12">
          <div className="card-glass rounded-2xl p-10 border border-primary/30">
            <h2 className="text-3xl font-bold mb-4">Ready to Promote Your Memecoin?</h2>
            <p className="text-muted-foreground mb-6">Launch a campaign in under 60 seconds. No signup hoops, no monthly fees — pay per campaign in SOL.</p>
            <Link to="/launch-token" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity glow-purple">
              <Rocket className="h-5 w-5" /> Start Promotion <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Internal Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Explore More</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { to: "/promote-pumpfun-token", label: "Pump.fun Promotion", desc: "Specialized tools for pump.fun tokens" },
              { to: "/telegram-crypto-promotion", label: "Telegram Promotion", desc: "Reach 147+ Telegram groups instantly" },
              { to: "/top-promoted-tokens", label: "Trending Memecoins", desc: "Discover what's trending right now" },
              { to: "/blog", label: "Marketing Playbooks", desc: "Guides on memecoin growth and SEO" },
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
