/* Migration: Sync Forecasting Schema */
/* Description: Ensures workout_plans and saved_routines are synced for Dynamic Goal Forecasting */

-- 1. Update saved_routines with top-level columns for forecasting
ALTER TABLE saved_routines 
ADD COLUMN IF NOT EXISTS estimated_calories_weekly NUMERIC DEFAULT 0;

ALTER TABLE saved_routines 
ADD COLUMN IF NOT EXISTS total_met_hours NUMERIC DEFAULT 0;

-- 2. Update workout_plans to support AI metadata
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS brain_state JSONB DEFAULT '{}'::jsonb;

ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS cardio_plan JSONB DEFAULT '{}'::jsonb;

-- 3. Add column to track generation source
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS source_routine_id BIGINT REFERENCES saved_routines(id);

-- 4. Update user_schedule documentation
COMMENT ON TABLE user_schedule IS 'Maps specific routine days to real-world weekdays for the automated calendar.';

-- 5. Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_workout_plans_calories ON workout_plans(estimated_calories_weekly);
CREATE INDEX IF NOT EXISTS idx_saved_routines_calories ON saved_routines(estimated_calories_weekly);

-- 6. Add "recommended_schedule" helper to saved_routines
ALTER TABLE saved_routines
ADD COLUMN IF NOT EXISTS recommended_schedule TEXT[];
