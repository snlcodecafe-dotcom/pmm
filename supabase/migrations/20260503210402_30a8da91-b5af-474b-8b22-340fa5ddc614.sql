
-- Automation settings (singleton row id=1)
CREATE TABLE public.automation_settings (
  id INT PRIMARY KEY CHECK (id = 1),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  posts_per_day INT NOT NULL DEFAULT 6 CHECK (posts_per_day BETWEEN 1 AND 50),
  start_time TIME NOT NULL DEFAULT '09:00',
  end_time TIME NOT NULL DEFAULT '23:00',
  platforms TEXT[] NOT NULL DEFAULT ARRAY['telegram']::TEXT[],
  default_image_url TEXT DEFAULT 'https://placehold.co/1080x1080/png?text=PromoteMyMemes',
  last_generated_for DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.automation_settings (id) VALUES (1);

ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage automation_settings"
  ON public.automation_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Generated posts
CREATE TABLE public.generated_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  image_url TEXT,
  platform TEXT NOT NULL,
  scheduled_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | posted | failed | cancelled
  error_message TEXT,
  external_ref TEXT,
  posted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_generated_posts_unique_hash_platform ON public.generated_posts (platform, content_hash);
CREATE INDEX idx_generated_posts_status_time ON public.generated_posts (status, scheduled_time);

ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage generated_posts"
  ON public.generated_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
