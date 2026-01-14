-- 1. FIX CHAT REALTIME
-- Enable Realtime for private_messages (Safely)
DO $$
BEGIN
  -- Attempt to add table to publication. 
  -- Handles error if table is already in publication.
  ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL; -- Fail silently if publication doesn't exist (unlikely in Supabase)
END $$;

-- 2. SETUP FEED INTERACTIONS
-- Likes Table
CREATE TABLE IF NOT EXISTS public.feed_likes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid REFERENCES public.activity_feed(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(post_id, user_id)
);

-- Comments Table
CREATE TABLE IF NOT EXISTS public.feed_comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid REFERENCES public.activity_feed(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS for Feed Interactions
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

-- Likes Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read likes' AND tablename = 'feed_likes') THEN
        CREATE POLICY "Public read likes" ON public.feed_likes FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth insert likes' AND tablename = 'feed_likes') THEN
        CREATE POLICY "Auth insert likes" ON public.feed_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth delete likes' AND tablename = 'feed_likes') THEN
        CREATE POLICY "Auth delete likes" ON public.feed_likes FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Comments Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read comments' AND tablename = 'feed_comments') THEN
        CREATE POLICY "Public read comments" ON public.feed_comments FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth insert comments' AND tablename = 'feed_comments') THEN
        CREATE POLICY "Auth insert comments" ON public.feed_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth delete own comments' AND tablename = 'feed_comments') THEN
        CREATE POLICY "Auth delete own comments" ON public.feed_comments FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
