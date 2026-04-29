
-- ==============================================
-- Accounts & Financial Tracking Module
-- ==============================================

-- 1. Account types enum
DO $$ BEGIN
  CREATE TYPE public.financial_account_type AS ENUM (
    'launch',           -- per-token launch account
    'pmm_revenue',      -- platform earnings
    'user_escrow',      -- user wallet/escrow
    'partner_commission', -- partner referral payouts
    'trading_fee_pool'  -- swap fee accumulator (v2)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_tx_type AS ENUM (
    'launch_fee',
    'liquidity',
    'gas_fee',
    'promotion_fee',
    'trading_fee',
    'partner_commission',
    'partner_payout',
    'refund',
    'adjustment'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.financial_party AS ENUM (
    'user',
    'system',
    'pmm',
    'blockchain',
    'liquidity_pool',
    'partner',
    'pool'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Accounts table
CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type public.financial_account_type NOT NULL,
  -- For 'launch' accounts, the token's mint address; for partner accounts, partner user_id; null for global
  scope_token_address TEXT,
  scope_user_id UUID,
  scope_label TEXT,
  balance_sol NUMERIC NOT NULL DEFAULT 0,
  total_in_sol NUMERIC NOT NULL DEFAULT 0,
  total_out_sol NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_type, scope_token_address, scope_user_id)
);

CREATE INDEX IF NOT EXISTS idx_fin_accounts_type ON public.financial_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_fin_accounts_token ON public.financial_accounts(scope_token_address);
CREATE INDEX IF NOT EXISTS idx_fin_accounts_user ON public.financial_accounts(scope_user_id);

-- 3. Transactions ledger (immutable - no updates/deletes via policy)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_type public.financial_tx_type NOT NULL,
  source public.financial_party NOT NULL,
  destination public.financial_party NOT NULL,
  amount_sol NUMERIC NOT NULL,
  sol_usd_at_time NUMERIC, -- snapshot price
  amount_usd_at_time NUMERIC, -- amount_sol * snapshot price
  -- References
  token_address TEXT,
  token_symbol TEXT,
  user_id UUID,
  wallet_address TEXT,
  partner_user_id UUID,
  referral_code TEXT,
  -- Optional account links
  source_account_id UUID REFERENCES public.financial_accounts(id),
  destination_account_id UUID REFERENCES public.financial_accounts(id),
  -- Source records
  related_launch_id UUID,
  related_submission_id UUID,
  related_earning_id UUID,
  tx_signature TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_tx_type ON public.financial_transactions(tx_type);
CREATE INDEX IF NOT EXISTS idx_fin_tx_token ON public.financial_transactions(token_address);
CREATE INDEX IF NOT EXISTS idx_fin_tx_user ON public.financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_partner ON public.financial_transactions(partner_user_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_occurred ON public.financial_transactions(occurred_at DESC);

-- 4. SOL/USD price snapshots
CREATE TABLE IF NOT EXISTS public.sol_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_usd NUMERIC NOT NULL,
  source TEXT NOT NULL DEFAULT 'coingecko',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sol_price_fetched ON public.sol_price_snapshots(fetched_at DESC);

-- 5. Enable RLS
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sol_price_snapshots ENABLE ROW LEVEL SECURITY;

-- 6. Policies — admins only for SELECT/UPDATE/DELETE; service role bypasses RLS
DROP POLICY IF EXISTS "Admins read accounts" ON public.financial_accounts;
CREATE POLICY "Admins read accounts" ON public.financial_accounts
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins manage accounts" ON public.financial_accounts;
CREATE POLICY "Admins manage accounts" ON public.financial_accounts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins read transactions" ON public.financial_transactions;
CREATE POLICY "Admins read transactions" ON public.financial_transactions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));
DROP POLICY IF EXISTS "Admins insert transactions" ON public.financial_transactions;
CREATE POLICY "Admins insert transactions" ON public.financial_transactions
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
-- No update/delete policies => immutable ledger for non-service callers

DROP POLICY IF EXISTS "Admins read sol prices" ON public.sol_price_snapshots;
CREATE POLICY "Admins read sol prices" ON public.sol_price_snapshots
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 7. Trigger to maintain account balances when transactions are inserted
CREATE OR REPLACE FUNCTION public.apply_financial_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.source_account_id IS NOT NULL THEN
    UPDATE public.financial_accounts
      SET balance_sol = balance_sol - NEW.amount_sol,
          total_out_sol = total_out_sol + NEW.amount_sol,
          updated_at = now()
      WHERE id = NEW.source_account_id;
  END IF;
  IF NEW.destination_account_id IS NOT NULL THEN
    UPDATE public.financial_accounts
      SET balance_sol = balance_sol + NEW.amount_sol,
          total_in_sol = total_in_sol + NEW.amount_sol,
          updated_at = now()
      WHERE id = NEW.destination_account_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_fin_tx ON public.financial_transactions;
CREATE TRIGGER trg_apply_fin_tx
  AFTER INSERT ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_financial_transaction();

-- 8. Helper: get_or_create account
CREATE OR REPLACE FUNCTION public.fin_get_or_create_account(
  _account_type public.financial_account_type,
  _scope_token TEXT DEFAULT NULL,
  _scope_user UUID DEFAULT NULL,
  _label TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acct_id UUID;
BEGIN
  SELECT id INTO acct_id FROM public.financial_accounts
   WHERE account_type = _account_type
     AND scope_token_address IS NOT DISTINCT FROM _scope_token
     AND scope_user_id IS NOT DISTINCT FROM _scope_user
   LIMIT 1;

  IF acct_id IS NULL THEN
    INSERT INTO public.financial_accounts (account_type, scope_token_address, scope_user_id, scope_label)
    VALUES (_account_type, _scope_token, _scope_user, _label)
    RETURNING id INTO acct_id;
  END IF;
  RETURN acct_id;
END;
$$;

-- 9. Seed global accounts (PMM revenue, trading fee pool)
INSERT INTO public.financial_accounts (account_type, scope_label)
SELECT 'pmm_revenue', 'PMM Revenue (Global)'
WHERE NOT EXISTS (SELECT 1 FROM public.financial_accounts WHERE account_type = 'pmm_revenue' AND scope_token_address IS NULL AND scope_user_id IS NULL);

INSERT INTO public.financial_accounts (account_type, scope_label)
SELECT 'trading_fee_pool', 'Trading Fee Pool (Global)'
WHERE NOT EXISTS (SELECT 1 FROM public.financial_accounts WHERE account_type = 'trading_fee_pool' AND scope_token_address IS NULL AND scope_user_id IS NULL);

-- 10. updated_at trigger on accounts
DROP TRIGGER IF EXISTS trg_fin_accounts_updated ON public.financial_accounts;
CREATE TRIGGER trg_fin_accounts_updated
  BEFORE UPDATE ON public.financial_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
