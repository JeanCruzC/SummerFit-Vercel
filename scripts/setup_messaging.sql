-- Private Messages Table (Ephemeral)
CREATE TABLE IF NOT EXISTS public.private_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    content text NOT NULL CHECK (length(trim(content)) > 0),
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own messages"
ON public.private_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can view messages sent by or to them"
ON public.private_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can update read status of received messages"
ON public.private_messages FOR UPDATE
USING (auth.uid() = receiver_id);

-- Auto-Delete Logic (Ephemeral - 12 Hours)
-- Attempt to use pg_cron if available.
-- If pg_cron is not available, this block might fail or be ignored.
-- Users on free tier might need to run this query manually or use Edge Functions.

DO $block$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
    ) THEN
        -- Schedule deletion every hour
        PERFORM cron.schedule(
            'delete_old_messages',
            '0 * * * *', -- Every hour
            $$DELETE FROM public.private_messages WHERE created_at < NOW() - INTERVAL '12 hours'$$
        );
    END IF;
END
$block$;

-- Fallback/Manual Function just in case
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void
LANGUAGE sql
AS $$
    DELETE FROM public.private_messages WHERE created_at < NOW() - INTERVAL '12 hours';
$$;
