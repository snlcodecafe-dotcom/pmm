
-- ============ ENUM ============
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  bio text,
  primary_wallet text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER WALLETS ============
CREATE TABLE public.user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(wallet_address)
);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wallet links viewable by everyone"
  ON public.user_wallets FOR SELECT USING (true);
CREATE POLICY "Users link own wallet"
  ON public.user_wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlink own wallet"
  ON public.user_wallets FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users update own wallet link"
  ON public.user_wallets FOR UPDATE USING (auth.uid() = user_id);

CREATE INDEX idx_user_wallets_user ON public.user_wallets(user_id);
CREATE INDEX idx_user_wallets_addr ON public.user_wallets(wallet_address);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Roles viewable by everyone"
  ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ WALLET CLAIM NONCES ============
CREATE TABLE public.wallet_claim_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  nonce text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_claim_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own nonces"
  ON public.wallet_claim_nonces FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own nonces"
  ON public.wallet_claim_nonces FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own nonces"
  ON public.wallet_claim_nonces FOR UPDATE USING (auth.uid() = user_id);

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ADD user_id TO EXISTING TABLES ============
ALTER TABLE public.token_launches ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.token_submissions ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX idx_token_launches_user ON public.token_launches(user_id);
CREATE INDEX idx_token_submissions_user ON public.token_submissions(user_id);

-- Tighten update policies: owner OR admin only (drops the previous "anyone can update")
DROP POLICY IF EXISTS "Anyone can update own launch" ON public.token_launches;
CREATE POLICY "Owner or admin updates launch"
  ON public.token_launches FOR UPDATE
  USING (
    user_id IS NULL  -- legacy rows still updatable until claimed
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

DROP POLICY IF EXISTS "Anyone can update own submission" ON public.token_submissions;
CREATE POLICY "Owner or admin updates submission"
  ON public.token_submissions FOR UPDATE
  USING (
    user_id IS NULL
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============ ADMIN SETTINGS — RPC PRESETS ============
INSERT INTO public.admin_settings (key, value) VALUES
  ('solana_rpc_devnet', 'https://api.devnet.solana.com'),
  ('solana_rpc_mainnet_primary', 'https://rpc.ankr.com/solana'),
  ('solana_rpc_mainnet_fallback_1', 'https://solana-mainnet.g.alchemy.com/v2/demo'),
  ('solana_rpc_mainnet_fallback_2', 'https://api.mainnet-beta.solana.com'),
  ('solana_rpc_active_preset', 'primary')
ON CONFLICT (key) DO NOTHING;

-- Allow admins (role-based) to write admin_settings via RLS
DROP POLICY IF EXISTS "Only service role can modify admin settings" ON public.admin_settings;
CREATE POLICY "Admins manage admin settings"
  ON public.admin_settings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
