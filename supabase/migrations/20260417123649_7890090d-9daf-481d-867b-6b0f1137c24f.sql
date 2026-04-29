-- Token launches table
CREATE TABLE public.token_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL CHECK (network IN ('devnet','mainnet')),
  mint_address TEXT NOT NULL,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  decimals INTEGER NOT NULL DEFAULT 9,
  total_supply NUMERIC NOT NULL,
  description TEXT,
  logo_url TEXT,
  metadata_uri TEXT,
  website TEXT,
  twitter TEXT,
  telegram TEXT,
  -- per-phase status
  token_created BOOLEAN NOT NULL DEFAULT false,
  metadata_attached BOOLEAN NOT NULL DEFAULT false,
  liquidity_added BOOLEAN NOT NULL DEFAULT false,
  liquidity_locked BOOLEAN NOT NULL DEFAULT false,
  indexed_dexscreener BOOLEAN NOT NULL DEFAULT false,
  indexed_jupiter BOOLEAN NOT NULL DEFAULT false,
  promotion_started BOOLEAN NOT NULL DEFAULT false,
  -- tx signatures
  create_tx_signature TEXT,
  metadata_tx_signature TEXT,
  -- moderation
  flagged BOOLEAN NOT NULL DEFAULT false,
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (network, mint_address)
);

CREATE INDEX idx_token_launches_wallet ON public.token_launches (wallet_address);
CREATE INDEX idx_token_launches_created ON public.token_launches (created_at DESC);

ALTER TABLE public.token_launches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view token launches"
  ON public.token_launches FOR SELECT USING (true);

CREATE POLICY "Anyone can insert token launches"
  ON public.token_launches FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update own launch"
  ON public.token_launches FOR UPDATE USING (true);

CREATE TRIGGER update_token_launches_updated_at
  BEFORE UPDATE ON public.token_launches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for token logos (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('token-logos', 'token-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read token logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'token-logos');

CREATE POLICY "Anyone can upload token logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'token-logos');