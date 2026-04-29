
INSERT INTO public.admin_settings (key, value)
VALUES 
  ('solana_rpc_url', 'https://api.mainnet-beta.solana.com'),
  ('solana_rpc_key', '')
ON CONFLICT (key) DO NOTHING;
