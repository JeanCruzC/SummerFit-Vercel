-- Backfill full_name in public.profiles from auth.users metadata

-- IMPORTANT: This script likely requires superuser privileges or being run in the Supabase Dashboard SQL Editor
-- as accessing auth.users directly might be restricted for standard connection roles.

UPDATE public.profiles p
SET full_name = u.raw_user_meta_data->>'full_name'
FROM auth.users u
WHERE p.user_id = u.id
  AND (p.full_name IS NULL OR p.full_name = '');

-- Optional: If you want to force update all (even if not null), remove the AND clause.
