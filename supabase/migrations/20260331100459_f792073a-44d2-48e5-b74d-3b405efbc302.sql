
-- Campaign execution logs: tracks REAL API actions
CREATE TABLE public.campaign_execution_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_submission_id uuid REFERENCES public.token_submissions(id) ON DELETE CASCADE,
  platform text NOT NULL,
  action_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  request_payload jsonb,
  response_payload jsonb,
  external_id text,
  external_url text,
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Telegram groups for distribution
CREATE TABLE public.telegram_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL UNIQUE,
  group_name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  last_post_at timestamptz,
  cooldown_minutes integer NOT NULL DEFAULT 60,
  total_posts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Discord webhooks for distribution
CREATE TABLE public.discord_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_url text NOT NULL,
  server_name text NOT NULL,
  channel_name text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  last_post_at timestamptz,
  total_posts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Analytics events: real click/impression tracking
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  token_submission_id uuid REFERENCES public.token_submissions(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  source_platform text,
  source_url text,
  ip_hash text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_exec_logs_submission ON public.campaign_execution_logs(token_submission_id);
CREATE INDEX idx_exec_logs_status ON public.campaign_execution_logs(status);
CREATE INDEX idx_analytics_events_submission ON public.analytics_events(token_submission_id);
CREATE INDEX idx_analytics_events_type ON public.analytics_events(event_type);
CREATE INDEX idx_telegram_groups_active ON public.telegram_groups(is_active);

-- RLS for campaign_execution_logs
ALTER TABLE public.campaign_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view execution logs" ON public.campaign_execution_logs FOR SELECT TO public USING (true);
CREATE POLICY "Service can insert execution logs" ON public.campaign_execution_logs FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service can update execution logs" ON public.campaign_execution_logs FOR UPDATE TO public USING (true);

-- RLS for telegram_groups
ALTER TABLE public.telegram_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view telegram groups" ON public.telegram_groups FOR SELECT TO public USING (true);
CREATE POLICY "Service can manage telegram groups" ON public.telegram_groups FOR ALL TO public USING (true);

-- RLS for discord_webhooks
ALTER TABLE public.discord_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view discord webhooks" ON public.discord_webhooks FOR SELECT TO public USING (true);
CREATE POLICY "Service can manage discord webhooks" ON public.discord_webhooks FOR ALL TO public USING (true);

-- RLS for analytics_events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view analytics events" ON public.analytics_events FOR SELECT TO public USING (true);
CREATE POLICY "Service can insert analytics events" ON public.analytics_events FOR INSERT TO public WITH CHECK (true);

-- Add campaign_status to token_submissions for lifecycle tracking
ALTER TABLE public.token_submissions ADD COLUMN IF NOT EXISTS campaign_status text NOT NULL DEFAULT 'created';

-- Enable realtime for execution logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_execution_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
