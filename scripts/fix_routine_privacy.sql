-- FIX RLS FOR PUBLIC ROUTINES & NUTRITION

-- 1. Policy for Workout Plans (Routine)
-- Allow anyone to VIEW a workout plan if the owner's profile has 'is_public_routine = true'
DROP POLICY IF EXISTS "Public can view routines if enabled" ON public.workout_plans;

CREATE POLICY "Public can view routines if enabled"
ON public.workout_plans FOR SELECT
USING (
  auth.uid() = user_id -- Owner can always see
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = workout_plans.user_id
    AND p.is_public_routine = true
  )
);

-- 2. Policy for Daily Logs (Nutrition/Progress)
-- Allow anyone to VIEW logs if owner has 'is_public_nutrition = true'
DROP POLICY IF EXISTS "Public can view nutrition if enabled" ON public.daily_logs;

CREATE POLICY "Public can view nutrition if enabled"
ON public.daily_logs FOR SELECT
USING (
  auth.uid() = user_id -- Owner can always see
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = daily_logs.user_id
    AND p.is_public_nutrition = true
  )
);

-- Note: We trust 'is_public_*' flags on the profile.
-- If you want to restrict this ONLY to friends, you would add an extra check for friendship status here.
-- But for now, "Public" implies visible to community/search.
