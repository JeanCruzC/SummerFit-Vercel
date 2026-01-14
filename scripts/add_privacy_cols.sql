-- Add privacy columns to profiles table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_public_routine') THEN
        ALTER TABLE profiles ADD COLUMN is_public_routine BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_public_nutrition') THEN
        ALTER TABLE profiles ADD COLUMN is_public_nutrition BOOLEAN DEFAULT true;
    END IF;
END $$;
