-- Activity Feed Table
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    type text CHECK (type IN ('post', 'workout', 'weight_goal', 'streak', 'milestone', 'recipe')) NOT NULL,
    content text,
    metadata jsonb DEFAULT '{}'::jsonb,
    images text[],
    likes_count int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- RLS for Activity Feed
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see feed items from:
-- 1. Themselves
-- 2. Their friends (where status = 'accepted')
-- Note: This join might be expensive on huge datasets but fine for MVP.
CREATE POLICY "Users can view feed of friends" 
ON public.activity_feed FOR SELECT 
USING (
    auth.uid() = user_id -- Own posts
    OR 
    EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
        AND (
            (f.user_id = auth.uid() AND f.friend_id = activity_feed.user_id)
            OR 
            (f.friend_id = auth.uid() AND f.user_id = activity_feed.user_id)
        )
    )
    OR
    EXISTS (
        -- Also show posts from public profiles? Maybe not for feed, keep it intimate.
        -- Let's stick to friends for now.
        SELECT 1 FROM profiles p 
        WHERE p.user_id = activity_feed.user_id 
        AND p.is_public_routine = true -- If they share routine public, maybe share feed public? 
        -- Actually, user asked for "Twitter like", usually implies followers/friends.
        -- Let's stick to Friends + Self for "Feed", maybe "Explore" later.
        AND 1=0 -- Disabled for now
    )
);

CREATE POLICY "Users can create their own feed items" 
ON public.activity_feed FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feed items" 
ON public.activity_feed FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feed items" 
ON public.activity_feed FOR DELETE 
USING (auth.uid() = user_id);

-- Friendship Logic Helper (Optional, but cleaner)
-- Function to accept request
CREATE OR REPLACE FUNCTION accept_friend_request(requestor_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE friendships
    SET status = 'accepted'
    WHERE user_id = requestor_id AND friend_id = auth.uid();
END;
$$;
