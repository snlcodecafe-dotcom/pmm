CREATE TABLE IF NOT EXISTS public.platform_credentials (
  platform text PRIMARY KEY,
  credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage platform_credentials"
ON public.platform_credentials
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_credentials (platform, credentials, is_enabled) VALUES
  ('telegram', '{"bot_token":"","channel_id":""}'::jsonb, false),
  ('twitter', '{"consumer_key":"","consumer_secret":"","access_token":"","access_token_secret":""}'::jsonb, false),
  ('instagram', '{"access_token":"","user_id":""}'::jsonb, false)
ON CONFLICT (platform) DO NOTHING;