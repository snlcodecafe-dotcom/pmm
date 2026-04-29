CREATE OR REPLACE FUNCTION public.calculate_partner_tier(subs integer)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN subs >= 30000 THEN 10
    WHEN subs >= 20000 THEN 7
    WHEN subs >= 10000 THEN 5
    WHEN subs >= 5000 THEN 3
    WHEN subs >= 3000 THEN 2
    WHEN subs >= 1000 THEN 1
    ELSE 0
  END
$$;