-- Add life_stage column to user_profiles if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS life_stage text DEFAULT 'standard';

-- Add comment to explain values
COMMENT ON COLUMN user_profiles.life_stage IS 'Physiological stage: standard, pregnancy_1, pregnancy_2, pregnancy_3, lactation_1, lactation_2, menopause';
