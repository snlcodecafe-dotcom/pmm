
-- Telegram bot users
CREATE TABLE public.telegram_bot_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id bigint NOT NULL UNIQUE,
  username text,
  first_name text,
  joined_channel boolean NOT NULL DEFAULT false,
  referral_code text,
  referred_by text,
  segments text[] DEFAULT '{}',
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_bot_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view telegram bot users" ON public.telegram_bot_users FOR SELECT USING (true);
CREATE POLICY "Service can insert telegram bot users" ON public.telegram_bot_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update telegram bot users" ON public.telegram_bot_users FOR UPDATE USING (true);

CREATE INDEX idx_telegram_bot_users_telegram_id ON public.telegram_bot_users (telegram_id);
CREATE INDEX idx_telegram_bot_users_referral ON public.telegram_bot_users (referral_code);

-- Viral content
CREATE TABLE public.viral_content (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token_name text NOT NULL,
  token_address text NOT NULL,
  token_symbol text,
  content_type text NOT NULL CHECK (content_type IN ('meme', 'fomo', 'alpha')),
  text text NOT NULL,
  image_url text,
  mcap text,
  volume text,
  narrative text,
  views integer NOT NULL DEFAULT 0,
  clicks integer NOT NULL DEFAULT 0,
  shares integer NOT NULL DEFAULT 0,
  reactions integer NOT NULL DEFAULT 0,
  is_posted boolean NOT NULL DEFAULT false,
  posted_at timestamptz,
  telegram_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.viral_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view viral content" ON public.viral_content FOR SELECT USING (true);
CREATE POLICY "Service can insert viral content" ON public.viral_content FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update viral content" ON public.viral_content FOR UPDATE USING (true);

CREATE INDEX idx_viral_content_type ON public.viral_content (content_type);
CREATE INDEX idx_viral_content_posted ON public.viral_content (is_posted);
CREATE INDEX idx_viral_content_token ON public.viral_content (token_address);

-- Content schedule
CREATE TABLE public.content_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid REFERENCES public.viral_content(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  posted boolean NOT NULL DEFAULT false,
  posted_at timestamptz,
  channel_id text,
  telegram_message_id bigint,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view content schedule" ON public.content_schedule FOR SELECT USING (true);
CREATE POLICY "Service can insert content schedule" ON public.content_schedule FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update content schedule" ON public.content_schedule FOR UPDATE USING (true);

CREATE INDEX idx_content_schedule_pending ON public.content_schedule (scheduled_at) WHERE posted = false;

-- Engagement actions
CREATE TABLE public.engagement_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id uuid REFERENCES public.viral_content(id) ON DELETE SET NULL,
  action_type text NOT NULL CHECK (action_type IN ('poll', 'question', 'cta')),
  payload jsonb NOT NULL DEFAULT '{}',
  posted boolean NOT NULL DEFAULT false,
  posted_at timestamptz,
  telegram_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.engagement_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view engagement actions" ON public.engagement_actions FOR SELECT USING (true);
CREATE POLICY "Service can insert engagement actions" ON public.engagement_actions FOR INSERT WITH CHECK (true);
CREATE POLICY "Service can update engagement actions" ON public.engagement_actions FOR UPDATE USING (true);

-- Telegram bot state (singleton for polling offset)
CREATE TABLE public.telegram_bot_state (
  id int PRIMARY KEY CHECK (id = 1),
  update_offset bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bot state" ON public.telegram_bot_state FOR SELECT USING (true);
CREATE POLICY "Service can update bot state" ON public.telegram_bot_state FOR UPDATE USING (true);

INSERT INTO public.telegram_bot_state (id, update_offset) VALUES (1, 0);
