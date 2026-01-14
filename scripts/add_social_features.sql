-- Add social fields to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS latitude float,
ADD COLUMN IF NOT EXISTS longitude float,
ADD COLUMN IF NOT EXISTS location_name text,
ADD COLUMN IF NOT EXISTS is_public_profile boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_public_routine boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS is_public_nutrition boolean DEFAULT false;

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    status text CHECK (status IN ('pending', 'accepted', 'blocked')) DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- RLS Policies for Friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their own friendships
CREATE POLICY "Users can view their own friendships" 
ON friendships FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendship requests
CREATE POLICY "Users can create friendship requests" 
ON friendships FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own friendships (e.g. accepting)
CREATE POLICY "Users can update their own friendships" 
ON friendships FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Index for location searches
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(latitude, longitude);
