import { useParams, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { TrendingUp, ExternalLink, Users, Eye, Zap, ArrowRight, Share2 } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead, { breadcrumbSchema } from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";

type TokenData = {
  id: string;
  token_address: string;
  token_symbol: string | null;
  token_name: string | null;
  promotion_type: string;
  status: string;
  created_at: string;
  views: number | null;
  engagement_score: number | null;
};

function slugToSymbol(slug: string): string {
  return slug.toUpperCase().replace(/-/g, "");
}

export default function TokenPage() {
  const { "token-name": tokenSlug } = useParams<{ "token-name": string }>();
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const symbol = slugToSymbol(tokenSlug || "");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("token_submissions")
        .select("*")
        .ilike("token_symbol", symbol)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      setToken(data);
      setLoading(false);

      // Track view
      if (data?.id) {
        fetch(
          `https://xlezhsxenfwirqsxeaev.supabase.co/functions/v1/track-view`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsZXpoc3hlbmZ3aXJxc3hlYWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDExNTAsImV4cCI6MjA4OTU3NzE1MH0.j4T4tuOUcRADRPQFFikIDKQ6bPrRtsm3Fk6KlcK8fFQ",
            },
            body: JSON.stringify({ tokenId: data.id }),
          }
        ).catch(() => {}); // fire-and-forget
      }
    }
    load();
  }, [symbol]);

  const displayName = token?.token_name || `${symbol} Token`;
  const displaySymbol = token?.token_symbol || symbol;

  return (
    <PageLayout>
      <SEOHead
        title={`${displaySymbol} Memecoin — Promotion Stats & Info`}
        description={`Discover ${displaySymbol} on PromoteMyMemes. View live promotion stats, engagement metrics, and how to buy ${displaySymbol}. ${displayName} is currently being promoted across 147+ Telegram groups.`}
        canonical={`/token/${tokenSlug}`}
        keywords={`${displaySymbol} memecoin, ${displaySymbol} token, ${displaySymbol} price, how to buy ${displaySymbol}, ${displaySymbol} Solana`}
        schema={[
          breadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "Tokens", url: "/recently-added-tokens" },
            { name: displaySymbol, url: `/token/${tokenSlug}` },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "Thing",
            name: displayName,
            description: `${displayName} (${displaySymbol}) is a Solana memecoin being promoted on PromoteMyMemes.`,
            url: `https://promotemymemes.com/token/${tokenSlug}`,
          },
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link to="/recently-added-tokens" className="hover:text-foreground transition-colors">Tokens</Link>
          <span>/</span>
          <span className="text-foreground">{displaySymbol}</span>
        </nav>

        {loading ? (
          <div className="text-center py-32">
            <div className="h-12 w-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading token data...</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <section className="mb-12">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
                      {displaySymbol.charAt(0)}
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold">{displayName}</h1>
                      <p className="text-muted-foreground">{displaySymbol} · Solana</p>
                    </div>
                  </div>
                  {token && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-medium border border-secondary/20">
                        {token.promotion_type.toUpperCase()} PROMOTION
                      </span>
                      <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
                        ACTIVE
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigator.share?.({ title: displayName, url: window.location.href })}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-surface-2 transition-colors text-sm"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                  <Link to="/" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity">
                    <Zap className="h-4 w-4" /> Promote This Token
                  </Link>
                </div>
              </div>
            </section>

            {/* Stats */}
            {token ? (
              <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {[
                  { label: "Total Views", value: (token.views || 0).toLocaleString(), icon: <Eye className="h-5 w-5" /> },
                  { label: "Engagement Score", value: token.engagement_score || 0, icon: <TrendingUp className="h-5 w-5" /> },
                  { label: "Promotion Type", value: token.promotion_type, icon: <Zap className="h-5 w-5" /> },
                  { label: "Listed", value: new Date(token.created_at).toLocaleDateString(), icon: <Users className="h-5 w-5" /> },
                ].map(s => (
                  <div key={s.label} className="card-glass rounded-xl p-5 border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      {s.icon}
                      <span className="text-xs">{s.label}</span>
                    </div>
                    <p className="text-xl font-bold capitalize">{s.value}</p>
                  </div>
                ))}
              </section>
            ) : (
              <section className="card-glass rounded-xl border border-border p-8 mb-12 text-center">
                <h2 className="text-xl font-bold mb-3">Token Not Currently Being Promoted</h2>
                <p className="text-muted-foreground mb-6">
                  <strong>{displaySymbol}</strong> isn't in our active promotion database. Want to add it?
                </p>
                <Link to="/" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
                  Promote {displaySymbol} Now
                </Link>
              </section>
            )}

            {/* Why Trending */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Why {displaySymbol} is Getting Attention</h2>
              <div className="card-glass rounded-xl border border-border p-6">
                <p className="text-muted-foreground leading-relaxed mb-4">
                  <strong className="text-foreground">{displayName} ({displaySymbol})</strong> is a Solana-based memecoin currently being promoted on PromoteMyMemes.
                  {token ? " This token is actively being distributed across our network of Telegram groups, Discord servers, and Twitter/X." : " Submit this token to start promotion and reach real buyers across 147+ Telegram groups."}
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Memecoins like {displaySymbol} gain traction through community engagement, social media presence, and multi-channel promotion.
                  The key to success is combining automated distribution tools with authentic community building.
                </p>
              </div>
            </section>

            {/* CTA */}
            <section className="text-center py-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-border mb-12">
              <h2 className="text-2xl font-bold mb-3">Promote {displaySymbol} to 147+ Telegram Groups</h2>
              <p className="text-muted-foreground mb-6">
                Get {displaySymbol} in front of real buyers across Telegram, Twitter/X, and Discord simultaneously.
              </p>
              <Link to="/" className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
                🚀 Start Promoting {displaySymbol}
              </Link>
            </section>

            {/* Internal Links */}
            <section>
              <h2 className="text-xl font-bold mb-4">Explore More</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { to: "/top-promoted-tokens", label: "Trending Memecoins" },
                  { to: "/top-promoted-tokens", label: "Top Promoted Tokens" },
                  { to: "/", label: "Promotion Services" },
                ].map(l => (
                  <Link key={l.to} to={l.to} className="card-glass rounded-xl p-4 border border-border hover:border-primary/40 transition-colors group flex items-center justify-between">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{l.label}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </PageLayout>
  );
}
