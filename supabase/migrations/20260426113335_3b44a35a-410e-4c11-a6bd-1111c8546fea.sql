
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS network TEXT;

CREATE INDEX IF NOT EXISTS idx_fin_tx_network_time
  ON public.financial_transactions (network, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_fin_tx_token
  ON public.financial_transactions (token_address);

-- Extend the tx_type enum with the missing flow types
DO $$ BEGIN
  ALTER TYPE financial_tx_type ADD VALUE IF NOT EXISTS 'mint_creation';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE financial_tx_type ADD VALUE IF NOT EXISTS 'metadata_pin';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE financial_tx_type ADD VALUE IF NOT EXISTS 'lp_lock';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE financial_tx_type ADD VALUE IF NOT EXISTS 'authority_revoke';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE financial_tx_type ADD VALUE IF NOT EXISTS 'indexer_submission';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Default admin-configurable launch fee
INSERT INTO public.admin_settings (key, value)
VALUES ('launch_fee_sol', '0')
ON CONFLICT (key) DO NOTHING;
