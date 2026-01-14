-- Add full_name to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Update RLS to ensure public access to name (already covered by "Enable read access for all users" probably, but good to verify)
-- Assuming existing policy: "Enable read access for all users" ON "public"."profiles" FOR SELECT USING (true); from previous steps.

-- Helper function to get friends with status
-- This helps fetching "My Friends" or "Pending Requests" easily
CREATE OR REPLACE FUNCTION get_my_friends(current_user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  location_name TEXT,
  status TEXT,
  is_sender BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id as friend_id,
    p.full_name,
    p.avatar_url,
    p.phone,
    p.location_name,
    f.status,
    (f.user_id = current_user_id) as is_sender
  FROM public.friendships f
  JOIN public.profiles p ON (
    (f.user_id = current_user_id AND f.friend_id = p.user_id) OR
    (f.friend_id = current_user_id AND f.user_id = p.user_id)
  )
  WHERE f.user_id = current_user_id OR f.friend_id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync user metadata to profile on creating/update (Optional but good)
CREATE OR REPLACE FUNCTION public.sync_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET full_name = new.raw_user_meta_data->>'full_name'
  WHERE user_id = new.id;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: Linking this trigger to auth.users requires superuser, user might need to run this in dashboard SQL editor
-- CREATE TRIGGER on_auth_user_update
-- AFTER UPDATE ON auth.users
-- FOR EACH ROW EXECUTE FUNCTION public.sync_user_metadata();
