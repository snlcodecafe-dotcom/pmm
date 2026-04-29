ALTER TABLE public.token_launches
  ADD COLUMN IF NOT EXISTS amm_type TEXT,
  ADD COLUMN IF NOT EXISTS pool_address TEXT,
  ADD COLUMN IF NOT EXISTS lp_mint TEXT,
  ADD COLUMN IF NOT EXISTS base_amount_sol NUMERIC,
  ADD COLUMN IF NOT EXISTS quote_amount_tokens NUMERIC,
  ADD COLUMN IF NOT EXISTS lock_provider TEXT,
  ADD COLUMN IF NOT EXISTS lock_address TEXT,
  ADD COLUMN IF NOT EXISTS lock_unlock_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_promo_submission_id UUID,
  ADD COLUMN IF NOT EXISTS last_indexing_check_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_token_launches_indexing
  ON public.token_launches (liquidity_added, indexed_dexscreener, indexed_jupiter)
  WHERE liquidity_added = true;