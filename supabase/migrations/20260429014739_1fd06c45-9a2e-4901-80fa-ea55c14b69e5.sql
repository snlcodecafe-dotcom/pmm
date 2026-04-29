-- referral_codes: support wallet-only inserts
ALTER TABLE public.referral_codes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.referral_codes ADD COLUMN wallet_address TEXT;
CREATE INDEX idx_referral_codes_wallet ON public.referral_codes(wallet_address);

-- token_launches: tx signatures
ALTER TABLE public.token_launches
  ADD COLUMN create_tx_signature TEXT,
  ADD COLUMN metadata_tx_signature TEXT;

-- Re-revoke execute on SECURITY DEFINER helpers from anon/authenticated to satisfy linter.
-- These are only intended to be called from edge functions using the service role.
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_views_if_exists(UUID) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_referral_count(TEXT) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fin_get_or_create_account(TEXT, TEXT, UUID, TEXT) FROM anon, authenticated, PUBLIC;