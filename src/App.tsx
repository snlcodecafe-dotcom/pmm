import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SolanaWalletProvider } from "@/components/SolanaWalletProvider";
import { RefCapture } from "@/components/RefCapture";
import { RequireAuth } from "@/components/RequireAuth";
import ScrollToTop from "@/components/ScrollToTop";
import MainNav from "@/components/MainNav";
import Index from "./pages/Index.tsx";
import Admin from "./pages/Admin.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import CryptoMarketingTool from "./pages/CryptoMarketingTool.tsx";
import PromotePumpFun from "./pages/PromotePumpFun.tsx";
import TelegramPromotion from "./pages/TelegramPromotion.tsx";
import Blog from "./pages/Blog.tsx";
import BlogPost from "./pages/BlogPost.tsx";
import TokenPage from "./pages/TokenPage.tsx";
import TopPromotedTokens from "./pages/TopPromotedTokens.tsx";
import RecentlyAddedTokens from "./pages/RecentlyAddedTokens.tsx";
import PromoteTokenPage from "./pages/PromoteTokenPage.tsx";
import BuyTokenPage from "./pages/BuyTokenPage.tsx";
import TopCategoryMemecoins from "./pages/TopCategoryMemecoins.tsx";
import CampaignEngine from "./pages/CampaignEngine.tsx";
import AIPromo from "./pages/AIPromo.tsx";
import Community from "./pages/Community.tsx";
import LaunchToken from "./pages/LaunchToken.tsx";
import MyTokenDetail from "./pages/MyTokenDetail.tsx";
import AuditToken from "./pages/AuditToken.tsx";
import TokenMetadataUpload from "./pages/TokenMetadataUpload.tsx";
import TokenLiquidityPool from "./pages/TokenLiquidityPool.tsx";
import TokenIndexerSubmit from "./pages/TokenIndexerSubmit.tsx";

import ViralLoop from "./pages/ViralLoop.tsx";
import AdminLaunches from "./pages/AdminLaunches.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Profile from "./pages/Profile.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import PartnerApply from "./pages/PartnerApply.tsx";
import PartnerChannelSubmit from "./pages/PartnerChannelSubmit.tsx";
import PartnerDashboard from "./pages/PartnerDashboard.tsx";
import MemecoinPromotion from "./pages/MemecoinPromotion.tsx";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RefCapture />
            <ScrollToTop />
            <MainNav />
            <Routes>
              {/* Public Core */}
              <Route path="/" element={<Index />} />
              <Route path="/launch-token" element={<RequireAuth><LaunchToken /></RequireAuth>} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/launches" element={<AdminLaunches />} />

              {/* Auth */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Auth-required (Growth Engine + tools) */}
              <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
              <Route path="/my-tokens" element={<Navigate to="/dashboard" replace />} />
              <Route path="/my-tokens/:launchId" element={<RequireAuth><MyTokenDetail /></RequireAuth>} />
              <Route path="/audit-token" element={<RequireAuth><AuditToken /></RequireAuth>} />
              <Route path="/audit-token/:address" element={<RequireAuth><AuditToken /></RequireAuth>} />
              <Route path="/token-tools/metadata" element={<RequireAuth><TokenMetadataUpload /></RequireAuth>} />
              <Route path="/token-tools/liquidity" element={<RequireAuth><TokenLiquidityPool /></RequireAuth>} />
              <Route path="/token-tools/indexers" element={<RequireAuth><TokenIndexerSubmit /></RequireAuth>} />
              <Route path="/token-tools/revoke" element={<Navigate to="/launch-token?step=6" replace />} />
              <Route path="/campaign-engine" element={<RequireAuth><CampaignEngine /></RequireAuth>} />
              <Route path="/ai-promo" element={<RequireAuth><AIPromo /></RequireAuth>} />
              <Route path="/community" element={<RequireAuth><Community /></RequireAuth>} />
              <Route path="/viral-loop" element={<RequireAuth><ViralLoop /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
              <Route path="/partner/dashboard" element={<RequireAuth><PartnerDashboard /></RequireAuth>} />
              <Route path="/partner/apply/channel" element={<RequireAuth><PartnerChannelSubmit /></RequireAuth>} />

              {/* Partner public landing */}
              <Route path="/partner/apply" element={<PartnerApply />} />

              {/* SEO Landing Pages */}
              <Route path="/crypto-marketing-tool" element={<CryptoMarketingTool />} />
              <Route path="/promote-pumpfun-token" element={<PromotePumpFun />} />
              <Route path="/telegram-crypto-promotion" element={<TelegramPromotion />} />
              <Route path="/memecoin-promotion" element={<MemecoinPromotion />} />

              {/* Blog */}
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:slug" element={<BlogPost />} />

              {/* Dynamic SEO Pages — Token specific */}
              <Route path="/token/:token-name" element={<TokenPage />} />
              <Route path="/promote-:token-name" element={<PromoteTokenPage />} />
              <Route path="/buy-:token-name" element={<BuyTokenPage />} />

              {/* Discovery Hubs */}
              <Route path="/top-promoted-tokens" element={<TopPromotedTokens />} />
              <Route path="/recently-added-tokens" element={<RecentlyAddedTokens />} />

              {/* Programmatic Category Pages */}
              <Route path="/top-solana-memecoins" element={<TopCategoryMemecoins />} />
              <Route path="/top-pumpfun-memecoins" element={<TopCategoryMemecoins />} />
              <Route path="/top-trending-memecoins" element={<TopCategoryMemecoins />} />
              <Route path="/top-new-memecoins" element={<TopCategoryMemecoins />} />
              <Route path="/top-:category-memecoins" element={<TopCategoryMemecoins />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </SolanaWalletProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
