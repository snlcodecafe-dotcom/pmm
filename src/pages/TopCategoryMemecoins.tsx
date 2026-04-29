import { useParams, Link } from "react-router-dom";
import { ArrowRight, TrendingUp, Zap } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead, { breadcrumbSchema, faqSchema } from "@/components/SEOHead";

const CATEGORY_DATA: Record<string, {
  title: string; description: string; keywords: string;
  tokens: { name: string; symbol: string; desc: string; emoji: string }[];
  faqs: { question: string; answer: string }[];
}> = {
  solana: {
    title: "Top Solana Memecoins",
    description: "The best memecoins on the Solana blockchain right now — fastest, cheapest, most viral.",
    keywords: "top solana memecoins, best solana memecoins 2026, solana memecoin list, new solana tokens",
    tokens: [
      { name: "BONK", symbol: "$BONK", desc: "The OG Solana dog coin — community-driven and wildly viral.", emoji: "🐕" },
      { name: "WIF", symbol: "$WIF", desc: "Dogwifhat — the hat-wearing dog that took Solana by storm.", emoji: "🎩" },
      { name: "POPCAT", symbol: "$POPCAT", desc: "The internet's favorite popping cat meme, now on Solana.", emoji: "🐱" },
      { name: "MYRO", symbol: "$MYRO", desc: "Raj Gokal's dog — Solana co-founder's memecoin tribute.", emoji: "🐶" },
    ],
    faqs: [
      { question: "What are the best Solana memecoins to buy in 2026?", answer: "Top Solana memecoins include established tokens like BONK, WIF, and POPCAT, as well as new launches on Pump.fun. Always research before investing — check liquidity, holder distribution, and team credibility." },
      { question: "How do I find new Solana memecoins early?", answer: "Use PromoteMyMemes' Recently Added Tokens page, monitor Pump.fun for new launches, follow crypto influencers on Twitter/X, and join active Telegram groups. Early entry carries high risk — always DYOR." },
    ],
  },
  pumpfun: {
    title: "Top Pump.fun Memecoins",
    description: "The hottest memecoins launched on Pump.fun — discover the next 100x gem before it pumps.",
    keywords: "top pump.fun memecoins, best pumpfun tokens, pump.fun token list, new pumpfun launches",
    tokens: [
      { name: "RETARDIO", symbol: "$RETARDIO", desc: "One of Pump.fun's most viral launches — pure community energy.", emoji: "🧠" },
      { name: "SIGMA", symbol: "$SIGMA", desc: "The sigma meme went crypto — massive community built overnight.", emoji: "💪" },
      { name: "GME", symbol: "$GME", desc: "GameStop meme energy brought to Solana via Pump.fun.", emoji: "🎮" },
      { name: "GOAT", symbol: "$GOAT", desc: "AI-generated memecoin legend — the token that started the AI agent meta.", emoji: "🐐" },
    ],
    faqs: [
      { question: "How do I find the best Pump.fun tokens?", answer: "Monitor Pump.fun's trending page, follow crypto alpha groups on Telegram, use PromoteMyMemes to track promoted tokens, and watch DexScreener for volume spikes on new launches." },
      { question: "Are Pump.fun tokens safe to buy?", answer: "Pump.fun tokens are extremely high-risk. Most fail, some are scams. Always check for liquidity locks, renounced contracts, holder concentration, and social proof before buying any Pump.fun token." },
    ],
  },
  trending: {
    title: "Top Trending Memecoins",
    description: "The most hyped and trending memecoins right now — real-time data from across Telegram, Twitter/X, and Solana.",
    keywords: "trending memecoins, best memecoins right now, top trending crypto tokens, viral memecoins 2026",
    tokens: [
      { name: "AI16Z", symbol: "$AI16Z", desc: "The AI agent investing DAO — Marc Andreessen-inspired meta token.", emoji: "🤖" },
      { name: "FARTCOIN", symbol: "$FARTCOIN", desc: "The irreverent gas-themed coin that refuses to die.", emoji: "💨" },
      { name: "MOODENG", symbol: "$MOODENG", desc: "The viral pygmy hippo turned billion-dollar Solana token.", emoji: "🦛" },
      { name: "PNUT", symbol: "$PNUT", desc: "Peanut the Squirrel memecoin — viral narrative turned crypto.", emoji: "🐿️" },
    ],
    faqs: [
      { question: "What makes a memecoin trend?", answer: "Memecoins trend through viral social media posts, celebrity mentions, coordinated Telegram campaigns, exchange listings, and narrative momentum. Platforms like PromoteMyMemes help tokens build this momentum through automated multi-channel distribution." },
      { question: "How can I spot a trending memecoin early?", answer: "Watch for unusual volume spikes on DexScreener, monitor Pump.fun trending page, follow crypto influencers, check our Trending Memecoins page, and join active Telegram alpha groups. Fast-moving memecoins can 10x within hours of trending." },
    ],
  },
  new: {
    title: "Top New Memecoins",
    description: "Brand new memecoins just launched in 2026 — find the next 100x gem before it gets discovered.",
    keywords: "new memecoins 2026, best new crypto tokens, new solana launches, just launched memecoins",
    tokens: [
      { name: "TRUMP", symbol: "$TRUMP", desc: "Political meme energy fueling Solana's biggest launches.", emoji: "🎪" },
      { name: "MELANIA", symbol: "$MELANIA", desc: "First Lady enters crypto — one of 2026's most viral launches.", emoji: "👑" },
      { name: "LAIKA", symbol: "$LAIKA", desc: "Space dog tribute — riding the cosmic meme meta.", emoji: "🚀" },
      { name: "HARAMBE", symbol: "$HARAMBE", desc: "Eternal meme legend makes its Solana debut.", emoji: "🦍" },
    ],
    faqs: [
      { question: "Where can I find new memecoins before they pump?", answer: "Check PromoteMyMemes' Recently Added Tokens page for the newest listings, monitor Pump.fun for fresh launches, follow DexScreener's newest pairs, and join telegram alpha groups that share early calls." },
      { question: "How risky are new memecoins?", answer: "New memecoins are the highest-risk crypto investments. The vast majority (95%+) fail or are abandoned. However, early entry in successful ones can yield 10x-1000x returns. Only invest what you can afford to lose entirely." },
    ],
  },
};

function slugToCategory(slug: string): string {
  return slug.toLowerCase().replace(/-memecoins$/, "");
}

export default function TopCategoryMemecoins() {
  const { category = "solana-memecoins" } = useParams<{ category: string }>();
  const categoryKey = slugToCategory(category);
  const data = CATEGORY_DATA[categoryKey] || CATEGORY_DATA.trending;
  const urlSlug = `top-${categoryKey}-memecoins`;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: data.title,
    description: data.description,
    url: `https://promotemymemes.com/${urlSlug}`,
    numberOfItems: data.tokens.length,
    itemListElement: data.tokens.map((t, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${t.name} (${t.symbol})`,
      description: t.desc,
    })),
  };

  return (
    <PageLayout>
      <SEOHead
        title={`${data.title} 2026 — Best Performers`}
        description={`${data.description} Discover the top performing memecoins, how to buy them, and how to promote your token to the same audience.`}
        canonical={`/${urlSlug}`}
        keywords={data.keywords}
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Trending", url: "/top-promoted-tokens" },
            { name: data.title, url: `/${urlSlug}` },
          ]),
          itemListSchema,
          faqSchema(data.faqs),
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/top-promoted-tokens" className="hover:text-foreground transition-colors">Trending</Link>
          <span>/</span>
          <span className="text-foreground">{data.title}</span>
        </nav>

        {/* Header */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold text-primary uppercase tracking-wider">Updated Daily</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">{data.title} <span className="gradient-text-purple">2026</span></h1>
          <p className="text-lg text-muted-foreground max-w-2xl">{data.description}</p>
        </section>

        {/* Token List */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Featured {data.title}</h2>
          <div className="space-y-4">
            {data.tokens.map((t, i) => (
              <div key={t.symbol} className="card-glass rounded-xl p-5 border border-border flex items-center gap-5 hover:border-primary/40 transition-colors">
                <div className="text-3xl w-12 h-12 flex items-center justify-center bg-primary/5 rounded-xl flex-shrink-0">{t.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-lg">#{i + 1}</span>
                    <span className="font-bold">{t.name}</span>
                    <span className="text-sm text-primary font-mono">{t.symbol}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t.desc}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Link to={`/promote-${t.name.toLowerCase()}`} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center gap-1">
                    <Zap className="h-3 w-3" /> Promote
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SEO Content */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">About {data.title}</h2>
          <div className="card-glass rounded-xl border border-border p-6">
            <p className="text-muted-foreground leading-relaxed mb-4">
              {data.description} The memecoin market moves fast — tokens can gain 100x in hours when the right combination of narrative, community, and promotion aligns.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-4">
              The tokens listed here represent active promotions on PromoteMyMemes and manually curated picks from our team. Each listing includes community sentiment analysis, volume data, and social media momentum tracking.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Want your token on this list? <Link to="/" className="text-primary hover:underline">Submit it for promotion</Link> — tokens with active promotion campaigns are prioritized for trending status.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {data.faqs.map((f, i) => (
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
          <h2 className="text-2xl font-bold mb-3">Get Your Token on This List</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Promoted tokens get featured in our trending pages, SEO token pages, and distributed to 147+ Telegram groups.
          </p>
          <Link to="/" className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
            🚀 Promote Your Token Now
          </Link>
        </section>

        {/* Internal Links */}
        <section>
          <h2 className="text-xl font-bold mb-4">More Trending Pages</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { to: "/top-solana-memecoins", label: "Top Solana Memecoins" },
              { to: "/top-pumpfun-memecoins", label: "Top Pump.fun Memecoins" },
              { to: "/top-trending-memecoins", label: "Top Trending Memecoins" },
              { to: "/top-new-memecoins", label: "Top New Memecoins" },
              { to: "/top-promoted-tokens", label: "Trending Right Now" },
              { to: "/recently-added-tokens", label: "Recently Added Tokens" },
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
