-- ============================================================
-- Create user_pantry table for grocery selection
-- Run this in Supabase SQL Editor
-- ============================================================

-- Step 1: Create the table
CREATE TABLE IF NOT EXISTS user_pantry (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ingredient_name TEXT NOT NULL,
    ingredient_name_es TEXT NOT NULL,
    category TEXT NOT NULL,
    emoji TEXT,
    search_term TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, ingredient_name)
);

-- Step 2: Enable RLS
ALTER TABLE user_pantry ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies
CREATE POLICY "Users can view own pantry" ON user_pantry
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to own pantry" ON user_pantry
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from own pantry" ON user_pantry
    FOR DELETE USING (auth.uid() = user_id);

-- Step 4: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_pantry_user_id ON user_pantry(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pantry_category ON user_pantry(category);

-- Step 5: Add onboarding_completed flag to profiles (if not exists)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pantry_setup_completed BOOLEAN DEFAULT FALSE;
