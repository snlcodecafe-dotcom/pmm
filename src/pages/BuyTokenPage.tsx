import { useParams, Link } from "react-router-dom";
import { ArrowRight, Zap, ExternalLink } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead, { breadcrumbSchema, faqSchema } from "@/components/SEOHead";

function slugToName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function slugToSymbol(slug: string): string {
  return slug.replace(/-/g, "").toUpperCase().slice(0, 6);
}

export default function BuyTokenPage() {
  const { "token-name": slug = "token" } = useParams<{ "token-name": string }>();
  const tokenName = slugToName(slug);
  const symbol = slugToSymbol(slug);

  const faqs = [
    { question: `How do I buy ${tokenName}?`, answer: `To buy ${tokenName} ($${symbol}), you need a Solana wallet (Phantom or Solflare), SOL for the purchase, and the contract address. Connect to a DEX like Raydium or Jupiter, paste the ${symbol} contract address, and swap SOL for ${symbol}.` },
    { question: `Is ${symbol} safe to buy?`, answer: `Always DYOR (Do Your Own Research) before buying any memecoin. Check if the liquidity is locked, the contract is renounced, and the top holders don't hold an excessive percentage. Use our free risk scanner on the token's PromoteMyMemes page.` },
    { question: `Where can I find the ${tokenName} contract address?`, answer: `The ${tokenName} contract address can be found on the token's official Telegram or Twitter page, pump.fun listing, or by searching CoinGecko/DexScreener. Always verify the address from multiple official sources.` },
    { question: `What is the best time to buy ${symbol}?`, answer: `Memecoin timing is highly speculative. Many traders look for early entry during initial promotion campaigns, like when ${symbol} is being distributed across Telegram and Twitter/X. Always set a stop-loss and only invest what you can afford to lose.` },
  ];

  return (
    <PageLayout>
      <SEOHead
        title={`How to Buy ${tokenName} ($${symbol}) — Complete Guide`}
        description={`Step-by-step guide to buy ${tokenName} ($${symbol}) on Solana. Find the contract address, use Raydium or Jupiter DEX, and discover active promotion campaigns for ${symbol}.`}
        canonical={`/buy-${slug}`}
        keywords={`buy ${tokenName.toLowerCase()}, how to buy ${symbol}, ${symbol} contract address, ${tokenName.toLowerCase()} price, ${symbol} Solana DEX`}
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Tokens", url: "/recently-added-tokens" },
            { name: `Buy ${symbol}`, url: `/buy-${slug}` },
          ]),
          faqSchema(faqs),
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/recently-added-tokens" className="hover:text-foreground transition-colors">Tokens</Link>
          <span>/</span>
          <span className="text-foreground">Buy {symbol}</span>
        </nav>

        {/* Hero */}
        <section className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            How to Buy <span className="gradient-text-purple">{tokenName}</span> (${symbol})
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-6">
            Complete step-by-step guide to buying {tokenName} on Solana. Find the contract address, use the right DEX, and discover active promotion campaigns.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link to={`/token/${slug}`} className="px-5 py-2.5 rounded-lg border border-border hover:bg-surface-2 transition-colors text-sm font-semibold flex items-center gap-2">
              <ExternalLink className="h-4 w-4" /> View {symbol} Stats
            </Link>
            <Link to={`/promote-${slug}`} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2">
              <Zap className="h-4 w-4" /> Promote {symbol}
            </Link>
          </div>
        </section>

        {/* Steps to Buy */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Step-by-Step: Buy {tokenName} on Solana</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: "Get a Solana Wallet", desc: `Download Phantom (phantom.app) or Solflare wallet. Create a new wallet and securely save your seed phrase. You'll need this to buy ${symbol} and any Solana token.` },
              { step: 2, title: "Buy SOL", desc: "Fund your wallet with SOL from Coinbase, Binance, or any major exchange. SOL is needed as the gas fee and to swap for tokens. Start with at least $20-50 in SOL." },
              { step: 3, title: `Find the ${symbol} Contract Address`, desc: `Look up the official ${tokenName} contract address from verified sources — official Telegram channel, Twitter/X account, or pump.fun listing. NEVER buy from unverified contract addresses.` },
              { step: 4, title: `Swap SOL for ${symbol} on Jupiter or Raydium`, desc: `Go to jup.ag (Jupiter) or raydium.io, connect your wallet, and paste the ${symbol} contract address in the token search. Set slippage to 5-10% for volatile memecoins and confirm the swap.` },
              { step: 5, title: "Verify the Purchase", desc: `Check your wallet for the ${symbol} tokens. If they don't appear automatically, click "Add Token" and paste the contract address. You can view your transaction on Solscan.io.` },
            ].map((s) => (
              <div key={s.step} className="card-glass rounded-xl p-5 border border-border flex gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary text-sm flex-shrink-0">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-bold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Risk Warning */}
        <section className="mb-12 p-5 rounded-xl border border-secondary/30 bg-secondary/5">
          <h2 className="text-lg font-bold mb-2 text-secondary">⚠️ Risk Disclaimer</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {tokenName} (${symbol}) is a speculative memecoin. Memecoins are extremely volatile and can lose 90%+ of their value rapidly. Only invest money you can afford to lose entirely. Always verify the contract address from official sources. Check for honeypots, locked liquidity, and renounced contracts before buying.
          </p>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">FAQs — Buying {tokenName}</h2>
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

        {/* CTA Promote */}
        <section className="text-center py-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-border mb-12">
          <h2 className="text-2xl font-bold mb-3">Are You the {tokenName} Dev?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Promote ${symbol} to 147+ Telegram groups, Twitter/X, and Discord to drive real buyers fast.
          </p>
          <Link to={`/promote-${slug}`} className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
            🚀 Promote {symbol} Now
          </Link>
        </section>

        {/* Internal Links */}
        <section>
          <h2 className="text-xl font-bold mb-4">Explore More</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { to: `/token/${slug}`, label: `${symbol} Token Page` },
              { to: `/promote-${slug}`, label: `Promote ${symbol}` },
              { to: "/top-promoted-tokens", label: "Trending Memecoins" },
              { to: "/recently-added-tokens", label: "New Token Launches" },
              { to: "/blog/how-to-promote-memecoin-2026", label: "Memecoin Promotion Guide" },
              { to: "/", label: "Promotion Services" },
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
