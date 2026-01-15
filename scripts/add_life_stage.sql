-- Add physiological_state column to profiles table
-- This enables clinical nutrition personalization (Pregnancy, Lactation, etc.)

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'life_stage') THEN
        ALTER TABLE public.profiles ADD COLUMN life_stage TEXT DEFAULT 'standard';
    END IF;
END $$;

-- Create an index for querying profiles by life_stage
CREATE INDEX IF NOT EXISTS idx_profiles_life_stage ON public.profiles(life_stage);

-- Comment to document allowed values
COMMENT ON COLUMN public.profiles.life_stage IS 'Physiological state: standard, pregnancy_1, pregnancy_2, pregnancy_3, lactation_1, lactation_2, menopause, senior';
