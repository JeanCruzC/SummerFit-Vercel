-- Fix Activity Feed Foreign Key Relationship
-- Dropping the constraint referring to auth.users and adding one to public.profiles
-- This helps PostgREST "see" the relationship for joining.

BEGIN;

-- 1. Drop old constraint if exists (name might vary, trying generic approach)
-- Note: Supabase/Postgres usually names it activity_feed_user_id_fkey
ALTER TABLE public.activity_feed
DROP CONSTRAINT IF EXISTS activity_feed_user_id_fkey;

-- 2. Add new constraint pointing to profiles
ALTER TABLE public.activity_feed
ADD CONSTRAINT activity_feed_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- 3. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload config';

COMMIT;
