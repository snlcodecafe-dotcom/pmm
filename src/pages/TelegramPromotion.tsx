import { Link } from "react-router-dom";
import { Send, Zap, ArrowRight, Users, CheckCircle2 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead, { productSchema, faqSchema } from "@/components/SEOHead";

const FAQS = [
  { question: "What is Telegram crypto promotion?", answer: "Telegram crypto promotion involves distributing your token information to active cryptocurrency groups on Telegram. It's one of the most effective ways to reach interested buyers quickly since Telegram hosts thousands of active crypto trading communities." },
  { question: "How many Telegram groups does PromoteMyMemes post to?", answer: "Our Premium plan distributes to 147+ active Telegram groups. Our Advanced plan reaches 50+ groups. These are real, active communities — not dead groups." },
  { question: "How long does Telegram promotion take to start?", answer: "Our automated bots begin posting to Telegram groups within minutes of your submission. You can watch the distribution happen in real-time on your dashboard." },
  { question: "Will my token get banned from Telegram groups?", answer: "We only post to groups that welcome crypto promotion. Our accounts are established within these communities and follow group-specific rules for each distribution." },
  { question: "What does a good Telegram promotion message look like?", answer: "Our AI generates platform-optimized Telegram posts that include your token symbol, contract address, key stats (holders, liquidity), why the token is interesting, and a call-to-action. These are written in the natural style of crypto Telegram groups." },
];

export default function TelegramPromotion() {
  return (
    <PageLayout>
      <SEOHead
        title="Telegram Crypto Promotion — Reach 147+ Groups Instantly"
        description="Promote your crypto token to 147+ active Telegram groups simultaneously. AI-generated posts, automated distribution, real buyer reach. Free to try. Solana-native."
        canonical="/telegram-crypto-promotion"
        keywords="telegram crypto promotion, crypto telegram marketing, promote token telegram, telegram memecoin promotion, telegram crypto groups"
        schema={[
          productSchema({ name: "PromoteMyMemes — Telegram Crypto Promotion", description: "Automated Telegram crypto promotion tool. Reach 147+ active groups simultaneously with AI-generated content.", url: "https://promotemymemes.com/telegram-crypto-promotion" }),
          faqSchema(FAQS),
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 py-16">
        {/* Hero */}
        <section className="text-center max-w-4xl mx-auto mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-6">
            <Send className="h-3.5 w-3.5" /> Telegram Promotion
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Telegram Crypto Promotion<br />
            <span className="gradient-text-purple">at Scale</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Reach <strong className="text-foreground">147+ active Telegram crypto groups</strong> simultaneously with AI-generated posts crafted specifically for memecoin audiences. Start in under 2 minutes.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity glow-purple">
            <Send className="h-5 w-5" /> Start Telegram Promotion Free
          </Link>
        </section>

        {/* Key Numbers */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {[
            { value: "147+", label: "Active Groups (Premium)" },
            { value: "50+", label: "Groups (Advanced)" },
            { value: "~2min", label: "To Start Distributing" },
            { value: "1M+", label: "Telegram Reach" },
          ].map(s => (
            <div key={s.label} className="card-glass rounded-xl p-6 text-center border border-border">
              <div className="text-3xl font-bold gradient-text-purple mb-1">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </section>

        {/* Why Telegram */}
        <section className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-4">Why Telegram is #1 for Crypto Promotion</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
            Despite new platforms emerging, Telegram remains the dominant crypto community platform — especially for memecoins and early-stage tokens.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "Highest Engagement Rate", desc: "Crypto Telegram groups have 5-10x higher message read rates than email newsletters. Members actively monitor these groups for new opportunities." },
              { title: "Self-Selecting Audience", desc: "People join crypto Telegram groups specifically because they want to discover and buy new tokens. It's the most targeted audience available." },
              { title: "Instant Reach", desc: "Unlike SEO or content marketing, Telegram promotion delivers instant reach. Your message can reach 100,000+ potential buyers within minutes." },
              { title: "No Algorithm Throttling", desc: "Unlike Twitter/X and other social platforms, Telegram doesn't throttle organic reach. Your message is delivered to all group members immediately." },
            ].map(c => (
              <div key={c.title} className="card-glass rounded-xl p-6 border border-border flex gap-4">
                <CheckCircle2 className="h-6 w-6 text-secondary flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold mb-2">{c.title}</h3>
                  <p className="text-muted-foreground text-sm">{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Content */}
        <section className="mb-20">
          <div className="card-glass rounded-2xl border border-border p-8 md:p-12">
            <h2 className="text-3xl font-bold mb-4">AI-Powered Telegram Content</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl">
              Our AI analyzes your token and generates authentic-sounding Telegram posts that match the style and culture of memecoin communities. No robotic templates — real, engaging content.
            </p>
            <div className="bg-surface-2 rounded-xl p-6 border border-border mb-8">
              <p className="text-xs text-muted-foreground mb-2">Example AI-Generated Telegram Post:</p>
              <p className="font-mono text-sm leading-relaxed">
                🚀 <span className="text-secondary">$BONK</span> is absolutely flying right now!<br /><br />
                📊 Already 847 holders in 2 hours<br />
                💧 LP locked 12 months ✅<br />
                📜 Contract renounced ✅<br />
                🔥 Volume pumping<br /><br />
                Don't miss early — this one has legs 👇<br />
                CA: <span className="text-primary">HFz8...kR4f</span>
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {["Memecoin-native tone", "Emoji optimization", "Custom per-platform"].map(f => (
                <div key={f} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-secondary" />{f}</div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Telegram Crypto Promotion FAQ</h2>
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
        <section className="text-center py-16 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-border">
          <h2 className="text-3xl font-bold mb-4">Ready to Reach 147+ Telegram Groups?</h2>
          <p className="text-muted-foreground mb-8">Submit your token and our bots will start posting to active crypto groups within minutes.</p>
          <Link to="/" className="px-10 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity glow-purple">
            Start Telegram Promotion — Free
          </Link>
        </section>
      </main>
    </PageLayout>
  );
}
