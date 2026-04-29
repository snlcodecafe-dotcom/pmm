import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Copy, Gift, Loader2, Megaphone, Rocket, Share2, Trophy, Users, Wallet } from "lucide-react";
import PageLayout from "@/components/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ShareCard = {
  symbol: string;
  status: "LIVE" | "READY";
  launchDate?: string;
};

type ReferralStats = {
  code: string | null;
  referrals: number;
  points: number;
  rank: string;
};

const EMPTY_SHARE_CARDS: ShareCard[] = [
  { symbol: "$PMM", status: "LIVE" },
  { symbol: "$ADEV", status: "READY" },
  { symbol: "$ASNIPER", status: "LIVE" },
];

const LOOP_STEPS = [
  {
    title: "Create your invite link",
    description: "Use your referral code to bring new buyers and community members into your funnel.",
    icon: Gift,
  },
  {
    title: "Share active tokens",
    description: "Push ready-made token cards to X or Telegram when launches are live or about to go live.",
    icon: Share2,
  },
  {
    title: "Earn points and momentum",
    description: "Each successful invite increases your referral score and improves your leaderboard position.",
    icon: Trophy,
  },
] as const;

function getRank(points: number) {
  if (points >= 10000) return "Legend";
  if (points >= 5000) return "Pro";
  if (points >= 1500) return "Rising";
  if (points > 0) return "Starter";
  return "Unranked";
}

export default function ViralLoop() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [stats, setStats] = useState<ReferralStats>({ code: null, referrals: 0, points: 0, rank: "Unranked" });
  const [shareCards, setShareCards] = useState<ShareCard[]>(EMPTY_SHARE_CARDS);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const launchPromise = supabase
          .from("token_launches")
          .select("token_symbol, promotion_started, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(4);

        const effectiveWallet = profile?.primary_wallet?.trim() || null;

        const referralPromise = effectiveWallet
          ? supabase
              .from("referral_codes")
              .select("code, uses_count, total_points_earned")
              .eq("wallet_address", effectiveWallet)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null });

        const [referralRes, launchRes] = await Promise.all([referralPromise, launchPromise]);

        if (referralRes.data) {
          const points = referralRes.data.total_points_earned ?? 0;
          setStats({
            code: referralRes.data.code ?? null,
            referrals: referralRes.data.uses_count ?? 0,
            points,
            rank: getRank(points),
          });
        } else if (effectiveWallet) {
          const generatedCode = `${effectiveWallet.slice(0, 4).toUpperCase()}${effectiveWallet.slice(-4).toUpperCase()}`;
          setStats({ code: generatedCode, referrals: 0, points: 0, rank: "Unranked" });
        } else {
          setStats({ code: null, referrals: 0, points: 0, rank: "Unranked" });
        }

        if (launchRes.data?.length) {
          setShareCards(
            launchRes.data.map((item) => ({
              symbol: `$${item.token_symbol}`,
              status: item.promotion_started ? "LIVE" : "READY",
              launchDate: item.created_at,
            })),
          );
        } else {
          setShareCards(EMPTY_SHARE_CARDS);
        }
      } catch {
        toast.error("Could not load your viral loop data");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [profile?.primary_wallet, user?.id]);

  const inviteLink = useMemo(() => {
    if (typeof window === "undefined") return stats.code ?? "";
    return stats.code ? `${window.location.origin}/auth?ref=${stats.code}` : "";
  }, [stats.code]);

  const tokenCount = shareCards.filter((card) => card.symbol).length;
  const hasInviteReady = Boolean(stats.code);

  const handleCopy = async () => {
    if (!inviteLink) {
      toast.error("Add a primary wallet in your profile to activate your invite link");
      return;
    }

    try {
      setCopying(true);
      await navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy invite link");
    } finally {
      setCopying(false);
    }
  };

  const handleShare = (platform: "x" | "telegram", tokenSymbol?: string) => {
    if (!inviteLink || !stats.code) {
      toast.error("Activate your referral code first from your profile wallet");
      return;
    }

    const text = tokenSymbol
      ? `Watching ${tokenSymbol} on PromoteMyMemes. Join using my invite code ${stats.code}`
      : `Join my growth loop on PromoteMyMemes with invite code ${stats.code}`;

    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(inviteLink);
    const url = platform === "x"
      ? `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
      : `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <PageLayout showCTABanner={false}>
      <main className="app-page-shell">
        <div className="app-shell-container space-y-6">
          <section className="app-hero">
            <div className="app-hero-grid items-start">
              <div className="space-y-5">
                <div className="space-y-3">
                  <span className="app-eyebrow">Referral Growth Engine</span>
                  <div className="space-y-2">
                    <h1 className="app-headline max-w-2xl">Turn every launch into a repeatable referral loop.</h1>
                    <p className="app-section-copy max-w-2xl text-sm sm:text-base">
                      Share invite links, push your active tokens faster, and keep track of referrals without leaving the dashboard flow.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Referrals", value: String(stats.referrals), tone: "text-primary" },
                    { label: "Points", value: String(stats.points), tone: "text-secondary" },
                    { label: "Rank", value: stats.rank, tone: "text-foreground" },
                  ].map((item) => (
                    <div key={item.label} className="app-muted-card p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{item.label}</div>
                      <div className={cn("mt-2 text-2xl font-bold sm:text-[28px]", item.tone)}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="app-panel rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Gift className="h-4 w-4 text-primary" />
                    Your invite setup
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90">Referral code</div>
                    <div className="mt-2 text-3xl font-black tracking-[0.16em] text-foreground sm:text-4xl">
                      {stats.code ?? "Activate wallet"}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {hasInviteReady
                        ? "Use this code everywhere you drive buyers or community traffic."
                        : "Add a primary wallet in your profile to unlock your personal invite link."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-background/50 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                      <Wallet className="h-3.5 w-3.5" /> Invite link
                    </div>
                    <div className="break-all text-sm text-foreground">{inviteLink || "No active link yet"}</div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button onClick={handleCopy} disabled={copying || !hasInviteReady} className="app-gradient-action h-11 rounded-xl text-sm font-semibold">
                      {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                      Copy link
                    </Button>
                    <Button variant="outline" onClick={() => handleShare("x")} disabled={!hasInviteReady} className="h-11 rounded-xl border-border bg-background/50 text-sm font-semibold hover:bg-accent/30 hover:text-foreground">
                      <Share2 className="h-4 w-4" />
                      Share to X
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.06fr_0.94fr]">
            <Card className="app-panel rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Megaphone className="h-4 w-4 text-secondary" />
                  Share-ready token cards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(loading ? EMPTY_SHARE_CARDS : shareCards).map((token) => (
                  <div key={`${token.symbol}-${token.launchDate ?? token.status}`} className="flex flex-col gap-3 rounded-xl border border-border bg-background/45 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-lg font-semibold">
                        <Rocket className="h-4 w-4 text-primary" />
                        <span className="truncate">{token.symbol}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className={cn(
                          "rounded-full px-2.5 py-1 font-semibold",
                          token.status === "LIVE" ? "bg-primary/10 text-primary" : "bg-secondary/15 text-secondary",
                        )}>
                          {token.status}
                        </span>
                        <span>{token.launchDate ? new Date(token.launchDate).toLocaleDateString() : "Recent launch"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 self-start sm:self-center">
                      <Button type="button" variant="outline" onClick={() => handleShare("x", token.symbol)} disabled={!hasInviteReady} className="h-9 rounded-xl border-border bg-background/50 px-3 text-xs font-semibold hover:bg-accent/30 hover:text-foreground">
                        X
                      </Button>
                      <Button type="button" variant="outline" onClick={() => handleShare("telegram", token.symbol)} disabled={!hasInviteReady} className="h-9 rounded-xl border-border bg-background/50 px-3 text-xs font-semibold hover:bg-accent/30 hover:text-foreground">
                        Telegram
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="rounded-xl border border-dashed border-border bg-background/35 p-4 text-sm text-muted-foreground">
                  Use these cards when a token is ready or already live so your outreach stays consistent with your launch timeline.
                </div>
              </CardContent>
            </Card>

            <Card className="app-panel rounded-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-4 w-4 text-primary" />
                  How the loop works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {LOOP_STEPS.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.title} className="flex gap-3 rounded-xl border border-border bg-background/45 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span>{step.title}</span>
                          <span className="text-xs text-muted-foreground">0{index + 1}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}

                <div className="rounded-xl border border-border bg-secondary/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Next best action</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {hasInviteReady
                          ? `You have ${tokenCount} token ${tokenCount === 1 ? "card" : "cards"} ready to share.`
                          : "Complete your profile wallet setup so referrals can be tracked correctly."}
                      </p>
                    </div>
                    <div className="rounded-full bg-background/70 p-2 text-secondary">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </PageLayout>
  );
}