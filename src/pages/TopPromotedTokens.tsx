import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trophy, Eye, ArrowRight } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";
import { useStatsMode } from "@/hooks/useStatsMode";
import { FAKE_STATS } from "@/lib/planConfig";

type TokenRow = { id: string; token_symbol: string | null; token_name: string | null; views: number | null; engagement_score: number | null; created_at: string; promotion_type: string; price_sol: number };

const DEMO_TOKENS: TokenRow[] = FAKE_STATS.trendingTokens.map((t, i) => ({
  id: `demo-${i}`,
  token_symbol: t.symbol,
  token_name: t.name,
  views: parseInt(t.volume.replace(/[^0-9]/g, "")) * 10,
  engagement_score: t.holders,
  created_at: new Date().toISOString(),
  promotion_type: t.hot ? "premium" : i % 2 === 0 ? "advanced" : "basic",
  price_sol: t.hot ? 0.5 : i % 2 === 0 ? 0.1 : 0,
}));

export default function TopPromotedTokens() {
  const { mode, loading: modeLoading } = useStatsMode();
  const [liveTokens, setLiveTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mode === "fake") {
      setLoading(false);
      return;
    }
    async function load() {
      const { data } = await supabase
        .from("token_submissions")
        .select("id, token_symbol, token_name, views, engagement_score, created_at, promotion_type, price_sol")
        .order("engagement_score", { ascending: false })
        .limit(50);
      setLiveTokens(data || []);
      setLoading(false);
    }
    load();
  }, [mode]);

  const tokens = mode === "fake" ? DEMO_TOKENS : liveTokens;

  const tierColor = (promotion_type: string) => {
    if (promotion_type === "premium") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
    if (promotion_type === "advanced") return "text-primary bg-primary/10 border-primary/20";
    return "text-muted-foreground bg-surface-2 border-border";
  };

  const rankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <PageLayout>
      <SEOHead
        title="Top Promoted Memecoins — Leaderboard 2026"
        description="See the top promoted memecoins on PromoteMyMemes. Leaderboard ranked by engagement, views, and promotion score."
        canonical="/top-promoted-tokens"
        keywords="top promoted memecoins, best memecoins leaderboard, most promoted crypto tokens, memecoin rankings, solana token leaderboard"
        schema={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Top Promoted Memecoins Leaderboard",
          description: "Leaderboard of top promoted Solana memecoins on PromoteMyMemes",
          url: "https://promotemymemes.com/top-promoted-tokens",
        }}
      />

      <main className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <section className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm mb-6">
            <Trophy className="h-3.5 w-3.5" /> {mode === "fake" ? "Demo Leaderboard" : "Live Leaderboard"}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Top Promoted<br />
            <span className="gradient-text-purple">Memecoins Leaderboard</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            The most promoted and highest-engagement memecoins on PromoteMyMemes. Ranked by total views, engagement score, and community growth.
          </p>
        </section>

        {/* Top 3 Podium */}
        {tokens.length >= 3 && (
          <section className="mb-12">
            <div className="grid md:grid-cols-3 gap-4">
              {[1, 0, 2].map((actualIdx, displayIdx) => {
                const t = tokens[actualIdx];
                const heights = ["pt-8", "", "pt-12"];
                const glows = ["border-border", "border-yellow-500/40 glow-purple", "border-border"];
                return (
                  <div key={t.id} className={`card-glass rounded-xl border p-6 text-center ${glows[displayIdx]} ${heights[displayIdx]}`}>
                    <div className="text-4xl mb-3">{displayIdx === 1 ? "🥇" : displayIdx === 0 ? "🥈" : "🥉"}</div>
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mx-auto mb-3">
                      {(t.token_symbol || "?").charAt(0)}
                    </div>
                    <h3 className="font-bold text-lg">{t.token_symbol || "Unknown"}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{t.token_name || t.promotion_type}</p>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium uppercase ${tierColor(t.promotion_type)}`}>
                      {t.promotion_type}
                    </span>
                    <div className="mt-4 text-sm">
                      <span className="text-muted-foreground">Score: </span>
                      <span className="font-bold gradient-text-purple">{t.engagement_score || 0}</span>
                    </div>
                    <Link to={`/token/${(t.token_symbol || "").toLowerCase()}`} className="block mt-4 text-xs text-primary hover:underline">
                      View Token →
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Full Leaderboard */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">{tokens.length > 0 ? "Full Rankings" : "Leaderboard Loading..."}</h2>
          {loading || modeLoading ? (
            <div className="text-center py-20">
              <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
            </div>
          ) : (
            <div className="card-glass rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-6 bg-surface-2 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div>Rank</div>
                <div className="col-span-2">Token</div>
                <div className="text-center">Tier</div>
                <div className="text-center">Views</div>
                <div className="text-center">Score</div>
              </div>
              {tokens.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground">No tokens in the leaderboard yet.</p>
                  <Link to="/" className="text-primary hover:underline mt-2 block">Be the first to promote your token →</Link>
                </div>
              ) : (
                tokens.map((t, i) => (
                  <div key={t.id} className="grid grid-cols-6 px-4 py-4 border-t border-border items-center hover:bg-surface-2 transition-colors">
                    <div className="font-mono text-sm font-bold">{rankBadge(i + 1)}</div>
                    <div className="col-span-2">
                      <Link to={`/token/${(t.token_symbol || "").toLowerCase()}`} className="flex items-center gap-3 group">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {(t.token_symbol || "?").charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold group-hover:text-primary transition-colors text-sm">{t.token_symbol || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{t.token_name}</p>
                        </div>
                      </Link>
                    </div>
                    <div className="text-center">
                      <span className={`text-xs px-2 py-0.5 rounded border font-medium uppercase ${tierColor(t.promotion_type)}`}>
                        {t.promotion_type}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-sm flex items-center justify-center gap-1">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        {(t.views || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-center font-bold gradient-text-purple text-sm">
                      {t.engagement_score || 0}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>

        {/* Internal Links */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Get Your Token on the Leaderboard</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { to: "/", label: "Start Promotion", desc: "Begin multi-channel memecoin promotion" },
              { to: "/top-promoted-tokens", label: "Trending Now", desc: "See what memecoins are trending today" },
              { to: "/recently-added-tokens", label: "Recently Added", desc: "Browse newly promoted tokens" },
            ].map(l => (
              <Link key={l.to} to={l.to} className="card-glass rounded-xl p-5 border border-border hover:border-primary/40 transition-colors group">
                <h3 className="font-semibold group-hover:text-primary transition-colors">{l.label}</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-3">{l.desc}</p>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl border border-border">
          <h2 className="text-2xl font-bold mb-3">Claim Your Spot on the Leaderboard</h2>
          <p className="text-muted-foreground mb-6">Promote your token to climb the rankings and get maximum visibility.</p>
          <Link to="/" className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">
            🚀 Promote Your Token
          </Link>
        </section>
      </main>
    </PageLayout>
  );
}
