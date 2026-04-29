
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  token_address TEXT,
  token_symbol TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  target_participants INTEGER DEFAULT 100,
  current_participants INTEGER DEFAULT 0,
  description TEXT,
  reward_pool NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view campaigns" ON public.campaigns FOR SELECT USING (true);
CREATE POLICY "Service can insert campaigns" ON public.campaigns FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update campaigns" ON public.campaigns FOR UPDATE USING (true);

CREATE TABLE public.community_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  mission_type TEXT NOT NULL,
  reward_points INTEGER NOT NULL DEFAULT 100,
  token_address TEXT,
  token_symbol TEXT,
  required_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  completions_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.community_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view missions" ON public.community_missions FOR SELECT USING (true);
CREATE POLICY "Service can insert missions" ON public.community_missions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update missions" ON public.community_missions FOR UPDATE USING (true);

CREATE TABLE public.mission_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mission_id UUID REFERENCES public.community_missions(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  proof_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(mission_id, wallet_address)
);
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view completions" ON public.mission_completions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert completion" ON public.mission_completions FOR INSERT WITH CHECK (true);

CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  uses_count INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view referral codes" ON public.referral_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert referral code" ON public.referral_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update referral code" ON public.referral_codes FOR UPDATE USING (true);

CREATE TABLE public.wallet_labels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  total_volume_sol NUMERIC DEFAULT 0,
  tokens_tracked INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view wallet labels" ON public.wallet_labels FOR SELECT USING (true);
CREATE POLICY "Service can insert wallet labels" ON public.wallet_labels FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update wallet labels" ON public.wallet_labels FOR UPDATE USING (true);

CREATE TABLE public.token_risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL UNIQUE,
  risk_level TEXT NOT NULL DEFAULT 'unknown',
  honeypot_detected BOOLEAN DEFAULT false,
  liquidity_locked BOOLEAN DEFAULT false,
  contract_renounced BOOLEAN DEFAULT false,
  top_holder_pct NUMERIC DEFAULT 0,
  liquidity_sol NUMERIC DEFAULT 0,
  risk_notes TEXT[],
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.token_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view risk scores" ON public.token_risk_scores FOR SELECT USING (true);
CREATE POLICY "Service can insert risk scores" ON public.token_risk_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update risk scores" ON public.token_risk_scores FOR UPDATE USING (true);
