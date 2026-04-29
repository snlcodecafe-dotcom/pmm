-- Allow users to delete their own partner channels
CREATE POLICY "Users delete own partner channel"
ON public.partner_channels
FOR DELETE
USING (auth.uid() = user_id);

-- Prevent duplicate telegram channels per user
CREATE UNIQUE INDEX IF NOT EXISTS partner_channels_user_tg_unique
ON public.partner_channels (user_id, telegram_channel_id)
WHERE telegram_channel_id IS NOT NULL;