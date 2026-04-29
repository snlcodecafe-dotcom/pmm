
-- Admin settings table (stores admin wallet and config)
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read admin settings" ON public.admin_settings FOR SELECT USING (true);
CREATE POLICY "Only service role can modify admin settings" ON public.admin_settings FOR ALL USING (false);

-- Insert default admin wallet placeholder
INSERT INTO public.admin_settings (key, value) VALUES ('admin_wallet', 'NOT_SET');
INSERT INTO public.admin_settings (key, value) VALUES ('admin_password', 'admin123');

-- Token submissions table
CREATE TABLE public.token_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_address TEXT NOT NULL,
  token_name TEXT,
  token_symbol TEXT,
  promotion_type TEXT NOT NULL CHECK (promotion_type IN ('basic','advanced','premium')),
  price_sol NUMERIC(10,4) NOT NULL DEFAULT 0,
  wallet_address TEXT,
  tx_signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','failed')),
  services_delivered JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  views INTEGER DEFAULT 0,
  engagement_score INTEGER DEFAULT 0
);
ALTER TABLE public.token_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active token submissions" ON public.token_submissions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert token submissions" ON public.token_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own submission" ON public.token_submissions FOR UPDATE USING (true);

-- Bot activity log
CREATE TABLE public.bot_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_submission_id UUID REFERENCES public.token_submissions(id) ON DELETE CASCADE,
  token_symbol TEXT NOT NULL,
  platform TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_detail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.bot_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view bot activity" ON public.bot_activity_log FOR SELECT USING (true);
CREATE POLICY "Service can insert bot activity" ON public.bot_activity_log FOR INSERT WITH CHECK (true);

-- Social posts table
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_submission_id UUID REFERENCES public.token_submissions(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('twitter','telegram','discord')),
  post_text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  reactions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view social posts" ON public.social_posts FOR SELECT USING (true);
CREATE POLICY "Service can insert social posts" ON public.social_posts FOR INSERT WITH CHECK (true);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
