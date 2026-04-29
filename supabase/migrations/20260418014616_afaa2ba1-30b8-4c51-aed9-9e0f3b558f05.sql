SELECT cron.schedule(
  'check-token-indexing',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://wvonxvptlteqgxhqfopn.supabase.co/functions/v1/check-indexing',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2b254dnB0bHRlcWd4aHFmb3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTkyNjUsImV4cCI6MjA5MTk5NTI2NX0.9JYOlklA5aIusctMIC-7SGaMlIMFT-Z7s7idY_SgOxw"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);