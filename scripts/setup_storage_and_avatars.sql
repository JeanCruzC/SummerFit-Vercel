-- Add avatar_url to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Setup Storage Bucket for Avatars
-- Note: Creating buckets via SQL requires permissions. If this fails, create 'avatars' bucket in Dashboard.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- 1. Allow public access to avatars
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'avatars' );

-- 2. Allow authenticated users to upload their own avatar
-- We assume the file path will be namespaced by user_id, e.g., 'avatars/{user_id}/...'
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects FOR INSERT 
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid() = (storage.foldername(name))[1]::uuid
);

-- 3. Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid() = (storage.foldername(name))[1]::uuid
);

-- 4. Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid() = (storage.foldername(name))[1]::uuid
);
