
-- ============================================================
-- MUSCLEWIKI SCHEMA UPDATE
-- ============================================================

-- 1. Updates to EXERCISES table
ALTER TABLE exercises 
ADD COLUMN IF NOT EXISTS force TEXT, -- 'Pull', 'Push', 'Static'
ADD COLUMN IF NOT EXISTS mechanic TEXT, -- 'Isolation', 'Compound'
ADD COLUMN IF NOT EXISTS primary_muscles TEXT[], -- Array of specific muscles (e.g., ['Biceps', 'Lats'])
ADD COLUMN IF NOT EXISTS secondary_muscles TEXT[]; -- Array of secondary muscles

-- Create indices for new columns
CREATE INDEX IF NOT EXISTS idx_exercises_force ON exercises (force);
CREATE INDEX IF NOT EXISTS idx_exercises_mechanic ON exercises (mechanic);

-- 2. Create EXERCISE_MEDIA table
CREATE TABLE IF NOT EXISTS public.exercise_media (
    id BIGSERIAL PRIMARY KEY,
    exercise_id BIGINT REFERENCES exercises(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('video', 'image')),
    url TEXT NOT NULL,
    gender TEXT, -- 'male', 'female'
    angle TEXT, -- 'front', 'side', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_media_exercise ON exercise_media (exercise_id);

-- 3. RLS for EXERCISE_MEDIA
ALTER TABLE exercise_media ENABLE ROW LEVEL SECURITY;

-- Allow public read access to exercise media
DROP POLICY IF EXISTS "Exercise media is publicly readable" ON exercise_media;
CREATE POLICY "Exercise media is publicly readable"
  ON exercise_media FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins/service role to manage media
-- (Assumes service role bypasses RLS, but for client-side admin panels:)
DROP POLICY IF EXISTS "Admins can manage exercise media" ON exercise_media;
CREATE POLICY "Admins can manage exercise media"
  ON exercise_media FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@summerfit.com') -- Adjust as needed or rely on Service Role
  WITH CHECK (auth.jwt() ->> 'email' = 'admin@summerfit.com');

-- 4. Storage Bucket Setup (Validation)
-- Note: Buckets are usually created via API or Dashboard, not standard SQL.
-- But we can try to insert into storage.buckets if using Supabase Storage schema.
-- UNCOMMENT the block below if you have permissions to manage storage via SQL.

/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercises', 'exercises', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policy: Public Read
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'exercises' );

-- Storage Policy: Auth Upload (or Service Role only)
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'exercises' AND auth.role() = 'authenticated' );
*/
