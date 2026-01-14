-- Enable public read access to profiles so users can find friends
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Create a new policy that allows viewing:
-- 1. Your own profile
-- 2. Any profile marked as public
-- 3. (Optional) Any profile that is your friend (if we wanted to get complex, but public is enough for search)

CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT 
USING (
    auth.uid() = user_id -- You can see yourself
    OR 
    is_public_profile = true -- You can see public users
    OR
    is_public_profile IS NULL -- Fallback for old users if column is null
);

-- Ensure the index exists for performance
CREATE INDEX IF NOT EXISTS idx_profiles_public ON profiles(is_public_profile);
