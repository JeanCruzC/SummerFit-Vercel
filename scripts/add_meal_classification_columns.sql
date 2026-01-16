-- Add columns for AI classification
ALTER TABLE foods 
ADD COLUMN IF NOT EXISTS meal_times text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_common_staple boolean DEFAULT false;

-- Add comment to explain columns
COMMENT ON COLUMN foods.meal_times IS 'Array of suitable meal times: ["breakfast", "lunch", "dinner", "snack"]';
COMMENT ON COLUMN foods.is_common_staple IS 'True if the food is a common, widely available staple ingredient';
