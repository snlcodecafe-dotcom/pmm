-- Add role + onboarding to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS primary_role text CHECK (primary_role IN ('token_owner','partner')),
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Partner channels
CREATE TABLE IF NOT EXISTS public.partner_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  telegram_channel_name text,
  telegram_channel_id text,
  telegram_channel_link text,
  discord_server_name text,
  discord_invite_link text,
  subscriber_count integer NOT NULL DEFAULT 0,
  tier_percent numeric NOT NULL DEFAULT 0,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected')),
  bot_is_admin boolean NOT NULL DEFAULT false,
  joined_main_channel boolean NOT NULL DEFAULT false,
  referral_code text UNIQUE,
  rejection_reason text,
  verified_at timestamptz,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_channels_user ON public.partner_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_channels_status ON public.partner_channels(verification_status);
CREATE INDEX IF NOT EXISTS idx_partner_channels_referral ON public.partner_channels(referral_code);

ALTER TABLE public.partner_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified partner channels viewable by all" ON public.partner_channels FOR SELECT USING (verification_status = 'verified' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own partner channel" ON public.partner_channels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin updates channel" ON public.partner_channels FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin deletes channel" ON public.partner_channels FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER partner_channels_updated_at BEFORE UPDATE ON public.partner_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Partner earnings
CREATE TABLE IF NOT EXISTS public.partner_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid NOT NULL,
  channel_id uuid REFERENCES public.partner_channels(id) ON DELETE SET NULL,
  referral_code text NOT NULL,
  token_submission_id uuid REFERENCES public.token_submissions(id) ON DELETE SET NULL,
  commission_sol numeric NOT NULL DEFAULT 0,
  tier_percent_at_time numeric NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending','paid','cancelled')),
  paid_at timestamptz,
  payout_tx_signature text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_earnings_partner ON public.partner_earnings(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_earnings_status ON public.partner_earnings(payout_status);

ALTER TABLE public.partner_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin views earnings" ON public.partner_earnings FOR SELECT USING (auth.uid() = partner_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Service inserts earnings" ON public.partner_earnings FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin updates earnings" ON public.partner_earnings FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Tier calculator function
CREATE OR REPLACE FUNCTION public.calculate_partner_tier(subs integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN subs >= 30000 THEN 10
    WHEN subs >= 20000 THEN 7
    WHEN subs >= 10000 THEN 5
    WHEN subs >= 5000 THEN 3
    WHEN subs >= 3000 THEN 2
    WHEN subs >= 1000 THEN 1
    ELSE 0
  END
$$;

-- Add referral_code column to token_submissions for attribution
ALTER TABLE public.token_submissions
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE INDEX IF NOT EXISTS idx_token_submissions_referral ON public.token_submissions(referral_code);