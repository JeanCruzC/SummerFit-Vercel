-- Enable RLS just in case (it likely is already)
ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to SELECT/READ workout_plan_exercises
-- We assume privacy is handled at the 'workout_plans' level or 'profiles' level.
-- If you can see the plan_id, you can see the exercises.
CREATE POLICY "Allow public read access to workout_plan_exercises"
ON workout_plan_exercises
FOR SELECT
USING (true);
