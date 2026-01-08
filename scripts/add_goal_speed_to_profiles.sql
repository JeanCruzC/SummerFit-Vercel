-- Add goal_speed column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS goal_speed text DEFAULT 'moderado' 
CHECK (goal_speed IN ('conservador', 'moderado', 'acelerado'));

-- Optional: Update existing rows to default
UPDATE profiles SET goal_speed = 'moderado' WHERE goal_speed IS NULL;
