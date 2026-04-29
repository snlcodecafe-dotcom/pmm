import { Link } from "react-router-dom";
import { Zap, CheckCircle2, ArrowRight, TrendingUp, Clock, Shield } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead, { productSchema, faqSchema } from "@/components/SEOHead";

const FAQS = [
  { question: "What is pump.fun?", answer: "Pump.fun is a Solana-based token launchpad that lets anyone create and launch a memecoin in minutes. It's become the dominant platform for memecoin launches in 2025-2026, with thousands of new tokens launching daily." },
  { question: "How do I promote my pump.fun token?", answer: "The most effective way to promote your pump.fun token is through multi-channel automated promotion. PromoteMyMemes distributes your token to 147+ Telegram groups, Twitter/X, and Discord simultaneously. Submit your contract address to start in under 2 minutes." },
  { question: "What's the best time to launch and promote a pump.fun token?", answer: "Launch between 12pm-6pm UTC for maximum visibility. This is when the most active crypto traders are online across all time zones. Avoid weekends for initial launches — weekday afternoons UTC tend to perform best." },
  { question: "How do I avoid getting rugged on pump.fun?", answer: "As a creator, build trust by locking liquidity (even though pump.fun handles initial liquidity), renouncing upgrade authority if applicable, maintaining consistent community communication, and never selling your dev allocation rapidly." },
  { question: "Can I promote multiple pump.fun tokens?", answer: "Yes! PromoteMyMemes allows you to promote multiple tokens. Each submission is tracked independently with its own analytics dashboard." },
];

export default function PromotePumpFun() {
  return (
    <PageLayout>
      <SEOHead
        title="Promote Your Pump.fun Token — Get Buyers Fast"
        description="Promoting your pump.fun token has never been easier. Reach 147+ Telegram groups, Twitter/X, and Discord in minutes. AI-generated content. Real buyers. Free to start."
        canonical="/promote-pumpfun-token"
        keywords="pump.fun promotion, promote pumpfun token, pumpfun marketing, solana memecoin launch, get buyers pumpfun"
        schema={[
          productSchema({ name: "PromoteMyMemes — Pump.fun Promotion", description: "The fastest way to promote your pump.fun token. Multi-channel distribution to Telegram, Twitter/X, and Discord.", url: "https://promotemymemes.com/promote-pumpfun-token" }),
          faqSchema(FAQS),
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-6">
            <TrendingUp className="h-3.5 w-3.5" /> Pump.fun Promotion Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Promote Your<br />
            <span className="gradient-text-purple">Pump.fun Token</span><br />
            to Thousands Instantly
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Your pump.fun token just launched. Now what? Our automated promotion engine reaches <strong className="text-foreground">real buyers</strong> across every major crypto community in minutes — not days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/" className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity glow-purple">
              🚀 Promote Now — Free
            </Link>
            <Link to="/blog/how-to-get-buyers-pumpfun-tokens" className="px-8 py-4 rounded-xl border border-border hover:bg-surface-2 transition-colors font-semibold">
              Read Pump.fun Guide
            </Link>
          </div>
        </section>

        {/* Why Speed Matters */}
        <section className="mb-20">
          <div className="card-glass rounded-2xl border border-border p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-4 text-center">Why Pump.fun Tokens Need <span className="gradient-text-purple">Instant Promotion</span></h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
              The first 60 minutes after launch are critical. Tokens that gain momentum quickly survive; those that don't get abandoned. Speed is everything.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: <Clock className="h-8 w-8" />, title: "First Hour is Everything", desc: "85% of successful pump.fun tokens see their biggest holder growth in the first 60 minutes. Miss this window and recovery is hard." },
                { icon: <TrendingUp className="h-8 w-8" />, title: "Social Proof Compounds", desc: "Early buyers create social proof. Social proof attracts more buyers. More buyers = higher MC = more organic discovery on Dexscreener." },
                { icon: <Shield className="h-8 w-8" />, title: "Community is Moat", desc: "Tokens that build strong Telegram communities survive dips. PromoteMyMemes doesn't just get buyers — it builds community." },
              ].map(c => (
                <div key={c.title} className="text-center">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">{c.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{c.title}</h3>
                  <p className="text-muted-foreground text-sm">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How to Promote */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">How to Promote Your Pump.fun Token in 3 Steps</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              { step: "1", title: "Copy Your Pump.fun Contract Address", desc: "Open your pump.fun token page and copy your contract address. That's all you need to start." },
              { step: "2", title: "Submit to PromoteMyMemes", desc: "Paste your CA into our platform, add your token symbol, and choose your promotion package. Free plan available — no wallet needed." },
              { step: "3", title: "Watch Real Buyers Discover Your Token", desc: "Our AI generates posts, our bots distribute them to 147+ Telegram groups, Discord servers, and Twitter/X. Track everything live in your dashboard." },
            ].map(s => (
              <div key={s.step} className="card-glass rounded-xl border border-border p-6 flex gap-5 items-start">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">{s.step}</div>
                <div>
                  <h3 className="font-bold text-lg mb-1">{s.title}</h3>
                  <p className="text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/" className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
              Start Your Pump.fun Promotion
            </Link>
          </div>
        </section>

        {/* Packages */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Pump.fun Promotion Packages</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Basic", price: "Free", highlight: false, features: ["Homepage listing", "3 Telegram groups", "AI post generation", "Basic analytics"] },
              { name: "Advanced", price: "0.1 SOL", highlight: true, features: ["50+ Telegram groups", "Twitter/X auto-post", "Discord distribution", "3-hour promotion", "Real-time analytics", "Engagement bots"] },
              { name: "Premium", price: "0.5 SOL", highlight: false, features: ["147+ Telegram groups", "89 Discord servers", "Hourly Twitter posts (24h)", "10K+ bot interactions", "Priority AI content", "Full analytics report"] },
            ].map(p => (
              <div key={p.name} className={`rounded-xl border p-8 ${p.highlight ? "border-primary bg-primary/5 glow-purple" : "border-border card-glass"}`}>
                {p.highlight && <div className="text-center mb-4"><span className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-full font-semibold">MOST POPULAR</span></div>}
                <h3 className="text-2xl font-bold mb-1">{p.name}</h3>
                <p className="text-3xl font-bold gradient-text-purple mb-6">{p.price}</p>
                <ul className="space-y-3 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-secondary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/" className={`block text-center py-3 rounded-lg font-semibold transition-opacity hover:opacity-90 ${p.highlight ? "bg-primary text-primary-foreground" : "border border-border hover:bg-surface-2"}`}>
                  {p.price === "Free" ? "Start Free" : `Promote for ${p.price}`}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Pump.fun Promotion FAQ</h2>
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

        {/* Internal links */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Related Resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link to="/blog/how-to-get-buyers-pumpfun-tokens" className="card-glass rounded-xl p-5 border border-border hover:border-primary/40 group transition-colors">
              <p className="text-xs text-primary mb-2">BLOG</p>
              <h3 className="font-semibold group-hover:text-primary transition-colors">How to Get Buyers for Pump.fun Tokens</h3>
              <ArrowRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
            <Link to="/top-promoted-tokens" className="card-glass rounded-xl p-5 border border-border hover:border-primary/40 group transition-colors">
              <p className="text-xs text-secondary mb-2">DISCOVER</p>
              <h3 className="font-semibold group-hover:text-primary transition-colors">Trending Memecoins Right Now</h3>
              <ArrowRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
            <Link to="/" className="card-glass rounded-xl p-5 border border-border hover:border-primary/40 group transition-colors">
              <p className="text-xs text-primary mb-2">PLATFORM</p>
              <h3 className="font-semibold group-hover:text-primary transition-colors">Full Memecoin Promotion Guide</h3>
              <ArrowRight className="h-4 w-4 mt-3 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        </section>
      </main>
    </PageLayout>
  );
}
