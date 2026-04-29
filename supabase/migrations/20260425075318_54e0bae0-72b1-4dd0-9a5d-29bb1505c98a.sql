ALTER TABLE public.token_launches
  ADD COLUMN IF NOT EXISTS indexing_alert_contact text,
  ADD COLUMN IF NOT EXISTS indexing_alert_sent boolean NOT NULL DEFAULT false;