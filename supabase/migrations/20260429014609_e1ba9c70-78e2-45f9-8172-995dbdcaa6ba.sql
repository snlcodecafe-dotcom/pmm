-- ==================== ADMIN SETTINGS ====================
CREATE TABLE public.admin_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read settings" ON public.admin_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins write settings" ON public.admin_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Seed essential settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('admin_password', 'change-me-in-admin-panel'),
  ('admin_wallet', 'NOT_SET'),
  ('stats_mode', 'real')
ON CONFLICT (key) DO NOTHING;

-- ==================== TOKEN SUBMISSIONS (promotion) ====================
CREATE TABLE public.token_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  token_address TEXT NOT NULL,
  token_symbol TEXT,
  token_name TEXT,
  promotion_type TEXT NOT NULL DEFAULT 'basic',
  price_sol NUMERIC NOT NULL DEFAULT 0,
  wallet_address TEXT,
  tx_signature TEXT,
  referral_code TEXT,
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  campaign_status TEXT NOT NULL DEFAULT 'queued',
  expires_at TIMESTAMPTZ,
  views INTEGER NOT NULL DEFAULT 0,
  engagement_score NUMERIC NOT NULL DEFAULT 0,
  services_delivered JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_status ON public.token_submissions(status, created_at DESC);
CREATE INDEX idx_submissions_user ON public.token_submissions(user_id);
ALTER TABLE public.token_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads active submissions" ON public.token_submissions FOR SELECT USING (true);
CREATE POLICY "Owner manages submission" ON public.token_submissions FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner inserts submission" ON public.token_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);
CREATE POLICY "Admin deletes submission" ON public.token_submissions FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ==================== TOKEN LAUNCHES ====================
CREATE TABLE public.token_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT,
  mint_address TEXT,
  token_name TEXT,
  token_symbol TEXT,
  decimals INTEGER DEFAULT 9,
  initial_supply NUMERIC,
  network TEXT DEFAULT 'mainnet',
  logo_url TEXT,
  metadata_uri TEXT,
  token_created BOOLEAN NOT NULL DEFAULT false,
  metadata_attached BOOLEAN NOT NULL DEFAULT false,
  liquidity_added BOOLEAN NOT NULL DEFAULT false,
  liquidity_locked BOOLEAN NOT NULL DEFAULT false,
  promotion_started BOOLEAN NOT NULL DEFAULT false,
  current_phase TEXT NOT NULL DEFAULT 'created',
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_launches_user ON public.token_launches(user_id, created_at DESC);
CREATE INDEX idx_launches_mint ON public.token_launches(mint_address);
ALTER TABLE public.token_launches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner views launches" ON public.token_launches FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner inserts launch" ON public.token_launches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates launch" ON public.token_launches FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner deletes launch" ON public.token_launches FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ==================== PARTNER CHANNELS ====================
CREATE TABLE public.partner_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'telegram',
  telegram_channel_name TEXT,
  telegram_channel_id TEXT,
  telegram_channel_link TEXT,
  discord_server_name TEXT,
  discord_invite_link TEXT,
  subscriber_count INTEGER NOT NULL DEFAULT 0,
  tier_percent NUMERIC NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE,
  bot_is_admin BOOLEAN NOT NULL DEFAULT false,
  joined_main_channel BOOLEAN NOT NULL DEFAULT false,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated reads partner channels" ON public.partner_channels FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner inserts partner channel" ON public.partner_channels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner/admin updates partner channel" ON public.partner_channels FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner/admin deletes partner channel" ON public.partner_channels FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- ==================== PARTNER EARNINGS ====================
CREATE TABLE public.partner_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES public.partner_channels(id) ON DELETE SET NULL,
  referral_code TEXT,
  token_submission_id UUID REFERENCES public.token_submissions(id) ON DELETE SET NULL,
  commission_sol NUMERIC NOT NULL DEFAULT 0,
  tier_percent_at_time NUMERIC NOT NULL DEFAULT 0,
  payout_status TEXT NOT NULL DEFAULT 'pending',
  payout_tx_signature TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_earnings_partner ON public.partner_earnings(partner_user_id, created_at DESC);
ALTER TABLE public.partner_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partner views own earnings" ON public.partner_earnings FOR SELECT TO authenticated USING (auth.uid() = partner_user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin manages earnings" ON public.partner_earnings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ==================== REFERRAL CODES ====================
CREATE TABLE public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  uses_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads referral codes" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "Owner manages referral codes" ON public.referral_codes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.increment_referral_count(_code TEXT)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.referral_codes SET uses_count = uses_count + 1 WHERE code = _code;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_referral_count(TEXT) FROM PUBLIC, anon, authenticated;

-- ==================== CAMPAIGNS ====================
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL DEFAULT 'standard',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  token_symbol TEXT,
  token_address TEXT,
  target_participants INTEGER DEFAULT 0,
  current_participants INTEGER DEFAULT 0,
  reward_pool NUMERIC DEFAULT 0,
  start_time TIMESTAMPTZ DEFAULT now(),
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Admin writes campaigns" ON public.campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.campaign_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.token_submissions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL,
  external_url TEXT,
  error_message TEXT,
  request_payload JSONB,
  response_payload JSONB,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.campaign_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads exec logs" ON public.campaign_execution_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin writes exec logs" ON public.campaign_execution_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ==================== SOCIAL POSTS / BOT ACTIVITY ====================
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_submission_id UUID REFERENCES public.token_submissions(id) ON DELETE SET NULL,
  platform TEXT NOT NULL,
  post_text TEXT NOT NULL,
  external_url TEXT,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_social_posts_created ON public.social_posts(created_at DESC);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads social posts" ON public.social_posts FOR SELECT USING (true);
CREATE POLICY "Admin writes social posts" ON public.social_posts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.bot_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_symbol TEXT NOT NULL,
  platform TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_detail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bot_activity_created ON public.bot_activity_log(created_at DESC);
ALTER TABLE public.bot_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads bot activity" ON public.bot_activity_log FOR SELECT USING (true);
CREATE POLICY "Admin writes bot activity" ON public.bot_activity_log FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ==================== TELEGRAM / DISCORD ====================
CREATE TABLE public.telegram_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT NOT NULL UNIQUE,
  name TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  member_count INTEGER DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads tg groups" ON public.telegram_groups FOR SELECT USING (true);
CREATE POLICY "Admin manages tg groups" ON public.telegram_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.telegram_bot_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  first_name TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ,
  is_blocked BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.telegram_bot_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads tg bot users" ON public.telegram_bot_users FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin writes tg bot users" ON public.telegram_bot_users FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.telegram_bot_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages tg bot state" ON public.telegram_bot_state FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.discord_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_name TEXT NOT NULL,
  channel_name TEXT,
  webhook_url TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages discord webhooks" ON public.discord_webhooks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ==================== VIRAL CONTENT / SCHEDULES ====================
CREATE TABLE public.viral_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT,
  token_symbol TEXT,
  content_type TEXT NOT NULL DEFAULT 'post',
  platform TEXT,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_viral_created ON public.viral_content(created_at DESC);
ALTER TABLE public.viral_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads viral content" ON public.viral_content FOR SELECT USING (true);
CREATE POLICY "Admin manages viral content" ON public.viral_content FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.content_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viral_content_id UUID REFERENCES public.viral_content(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  posted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.content_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages schedule" ON public.content_schedule FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Public reads schedule" ON public.content_schedule FOR SELECT USING (true);

CREATE TABLE public.engagement_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viral_content_id UUID REFERENCES public.viral_content(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.engagement_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads engagement" ON public.engagement_actions FOR SELECT USING (true);
CREATE POLICY "Auth inserts engagement" ON public.engagement_actions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages engagement" ON public.engagement_actions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.community_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  reward_sol NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.community_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads missions" ON public.community_missions FOR SELECT USING (true);
CREATE POLICY "Admin manages missions" ON public.community_missions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ==================== FINANCIAL LEDGER ====================
CREATE TABLE public.sol_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_usd NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'coingecko',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sol_price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads sol prices" ON public.sol_price_snapshots FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin writes sol prices" ON public.sol_price_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL,
  scope_token TEXT,
  scope_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  label TEXT,
  balance_sol NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_type, scope_token, scope_user)
);
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages fin accounts" ON public.financial_accounts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_type TEXT NOT NULL,
  source TEXT,
  destination TEXT,
  amount_sol NUMERIC NOT NULL DEFAULT 0,
  amount_usd_at_time NUMERIC,
  sol_usd_at_time NUMERIC,
  token_address TEXT,
  token_symbol TEXT,
  network TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wallet_address TEXT,
  referral_code TEXT,
  source_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  destination_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  related_submission_id UUID REFERENCES public.token_submissions(id) ON DELETE SET NULL,
  related_earning_id UUID REFERENCES public.partner_earnings(id) ON DELETE SET NULL,
  tx_signature TEXT,
  notes TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_fin_tx_occurred ON public.financial_transactions(occurred_at DESC);
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manages fin tx" ON public.financial_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.fin_get_or_create_account(
  _account_type TEXT, _scope_token TEXT, _scope_user UUID, _label TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id UUID;
BEGIN
  SELECT id INTO _id FROM public.financial_accounts
   WHERE account_type = _account_type
     AND COALESCE(scope_token,'') = COALESCE(_scope_token,'')
     AND COALESCE(scope_user::text,'') = COALESCE(_scope_user::text,'')
   LIMIT 1;
  IF _id IS NULL THEN
    INSERT INTO public.financial_accounts (account_type, scope_token, scope_user, label)
    VALUES (_account_type, _scope_token, _scope_user, _label)
    RETURNING id INTO _id;
  END IF;
  RETURN _id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fin_get_or_create_account(TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ==================== USER WALLETS ====================
CREATE TABLE public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, wallet_address)
);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads wallets" ON public.user_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner manages wallets" ON public.user_wallets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.wallet_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, wallet_address)
);
ALTER TABLE public.wallet_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages wallet labels" ON public.wallet_labels FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.wallet_claim_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  nonce TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_claim_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads own nonces" ON public.wallet_claim_nonces FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts nonces" ON public.wallet_claim_nonces FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ==================== ANALYTICS / METADATA ====================
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  page_path TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_analytics_created ON public.analytics_events(created_at DESC);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone inserts analytics" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin reads analytics" ON public.analytics_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT,
  uri TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads metadata" ON public.metadata FOR SELECT USING (true);
CREATE POLICY "Auth inserts metadata" ON public.metadata FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manages metadata" ON public.metadata FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ==================== HELPER: increment_views_if_exists ====================
CREATE OR REPLACE FUNCTION public.increment_views_if_exists(_submission_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.token_submissions SET views = COALESCE(views,0) + 1 WHERE id = _submission_id;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_views_if_exists(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_views_if_exists(UUID) TO anon, authenticated;

-- ==================== TRIGGERS for updated_at ====================
CREATE TRIGGER token_submissions_updated BEFORE UPDATE ON public.token_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER token_launches_updated BEFORE UPDATE ON public.token_launches FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER partner_channels_updated BEFORE UPDATE ON public.partner_channels FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==================== STORAGE BUCKET: token-logos ====================
INSERT INTO storage.buckets (id, name, public) VALUES ('token-logos', 'token-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Token logos public read" ON storage.objects FOR SELECT USING (bucket_id = 'token-logos');
CREATE POLICY "Authenticated upload token logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'token-logos');
CREATE POLICY "Owner updates own token logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'token-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owner deletes own token logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'token-logos' AND auth.uid()::text = (storage.foldername(name))[1]);