-- Fix INSERT policy for workout_plan_exercises
-- The current policy might be blocking inserts even for the owner

-- 1. Drop and recreate the owner-based policies
DROP POLICY IF EXISTS "Users can manage workout plan exercises" ON public.workout_plan_exercises;

-- 2. Create owner-based INSERT policy
-- Users can insert exercises to plans they own
CREATE POLICY "Users can insert exercises to their plans"
ON workout_plan_exercises
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_plans 
    WHERE workout_plans.id = workout_plan_id 
    AND workout_plans.user_id = auth.uid()
  )
);

-- 3. Keep the public SELECT policy from before (if not already created)
DROP POLICY IF EXISTS "Allow public read access to workout_plan_exercises" ON workout_plan_exercises;
CREATE POLICY "Allow public read access to workout_plan_exercises"
ON workout_plan_exercises
FOR SELECT
TO public
USING (true);

-- 4. Create UPDATE and DELETE policies for owners
CREATE POLICY "Users can update their plan exercises"
ON workout_plan_exercises
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workout_plans 
    WHERE workout_plans.id = workout_plan_id 
    AND workout_plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their plan exercises"
ON workout_plan_exercises
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workout_plans 
    WHERE workout_plans.id = workout_plan_id 
    AND workout_plans.user_id = auth.uid()
  )
);
