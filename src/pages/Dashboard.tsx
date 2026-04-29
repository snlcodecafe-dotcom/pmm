import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import PageLayout from "@/components/PageLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSolanaWallet } from "@/hooks/useSolanaWallet";
import { supabase } from "@/integrations/supabase/client";

import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardMainContent } from "@/components/dashboard/DashboardMainContent";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { ONBOARDING_STEPS, shorten, type ActivityItem, type TokenLaunch, type TokenSubmission } from "@/components/dashboard/types";

export default function Dashboard() {
  const { user } = useAuth();
  const { wallet, connect } = useSolanaWallet();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [launches, setLaunches] = useState<TokenLaunch[]>([]);
  const [campaigns, setCampaigns] = useState<TokenSubmission[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const launchQuery = wallet.publicKey
        ? supabase
            .from("token_launches")
            .select("id, token_name, token_symbol, mint_address, network, wallet_address, logo_url, total_supply, decimals, description, website, twitter, telegram, pool_address, lock_unlock_at, base_amount_sol, quote_amount_tokens, token_created, metadata_attached, liquidity_added, liquidity_locked, indexed_dexscreener, indexed_jupiter, promotion_started, created_at")
            .or(`user_id.eq.${user.id},wallet_address.eq.${wallet.publicKey}`)
            .order("created_at", { ascending: false })
            .limit(12)
        : supabase
            .from("token_launches")
            .select("id, token_name, token_symbol, mint_address, network, wallet_address, logo_url, total_supply, decimals, description, website, twitter, telegram, pool_address, lock_unlock_at, base_amount_sol, quote_amount_tokens, token_created, metadata_attached, liquidity_added, liquidity_locked, indexed_dexscreener, indexed_jupiter, promotion_started, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(12);

      const campaignsQuery = supabase
        .from("token_submissions")
        .select("id, token_name, token_symbol, token_address, promotion_type, status, campaign_status, price_sol, views, engagement_score, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      const [{ data: launchData }, { data: campaignData }] = await Promise.all([launchQuery, campaignsQuery]);

      setLaunches((launchData as TokenLaunch[] | null) ?? []);
      setCampaigns((campaignData as TokenSubmission[] | null) ?? []);
      setLoading(false);
    };

    void load();
  }, [user?.id, wallet.publicKey]);

  const hasPortfolio = launches.length > 0 || campaigns.length > 0;
  const totalViews = campaigns.reduce((sum, item) => sum + (item.views ?? 0), 0);
  const totalSpend = campaigns.reduce((sum, item) => sum + Number(item.price_sol ?? 0), 0);
  const liveCampaigns = campaigns.filter((item) => item.campaign_status === "running" || item.status === "active").length;

  const recentActivity = useMemo<ActivityItem[]>(() => {
    const launchActivity = launches.map((item) => ({
      id: `launch-${item.id}`,
      title: `${item.token_symbol} launch created`,
      detail: `${item.network.toUpperCase()} · ${shorten(item.mint_address)}`,
      created_at: item.created_at,
      kind: "launch" as const,
    }));

    const campaignActivity = campaigns.map((item) => ({
      id: `campaign-${item.id}`,
      title: `${item.token_symbol ?? item.token_name ?? "Token"} campaign ${item.status}`,
      detail: `${item.promotion_type} package · ${Number(item.price_sol ?? 0).toFixed(2)} SOL`,
      created_at: item.created_at,
      kind: "campaign" as const,
    }));

    return [...launchActivity, ...campaignActivity]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6);
  }, [campaigns, launches]);

  const activePanel = searchParams.get("tab");

  return (
    <PageLayout showCTABanner={false}>
      <main className="app-page-shell">
        <div className="app-shell-container space-y-6">
          <DashboardHero
            launchesCount={launches.length}
            liveCampaigns={liveCampaigns}
            totalViews={totalViews}
            totalSpend={totalSpend}
            campaignsCount={campaigns.length}
            walletConnected={wallet.connected}
            walletAddress={wallet.publicKey ? shorten(wallet.publicKey) : null}
            onConnectWallet={connect}
          />

          {loading ? (
            <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
              <Card className="app-panel rounded-2xl">
                <CardContent className="h-[420px] animate-pulse p-6" />
              </Card>
              <div className="grid gap-4">
                {[...Array(2)].map((_, index) => (
                  <Card key={index} className="app-panel rounded-2xl">
                    <CardContent className="h-48 animate-pulse p-6" />
                  </Card>
                ))}
              </div>
            </div>
          ) : !hasPortfolio ? (
            <DashboardEmptyState steps={ONBOARDING_STEPS} />
          ) : (
            <div className="space-y-6">
              <DashboardMainContent launches={launches} />
              <DashboardSidebar recentActivity={recentActivity} activePanel={activePanel} />
            </div>
          )}
        </div>
      </main>
    </PageLayout>
  );
}
