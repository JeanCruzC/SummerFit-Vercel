-- ========================================
-- SCRIPT COMPLETO DE OPTIMIZACIÓN DE SUPABASE
-- Ejecutar TODO en SQL Editor de Supabase
-- ========================================

-- ========================================
-- PARTE 1: ELIMINAR ÍNDICES DUPLICADOS
-- ========================================

DROP INDEX IF EXISTS idx_exercises_pattern;
DROP INDEX IF EXISTS idx_exercises_score_hypertrophy;

-- ========================================
-- PARTE 2: ELIMINAR POLÍTICAS DUPLICADAS
-- (Mantener solo una por acción)
-- ========================================

-- daily_logs: eliminar duplicados
DROP POLICY IF EXISTS "Users can view own logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON public.daily_logs;

-- meal_entries: eliminar duplicados
DROP POLICY IF EXISTS "Users can view own meals" ON public.meal_entries;
DROP POLICY IF EXISTS "Users can insert own meals" ON public.meal_entries;

-- foods: eliminar duplicados
DROP POLICY IF EXISTS "Anyone can read foods" ON public.foods;

-- user_progression: eliminar duplicados
DROP POLICY IF EXISTS "Users can view their own progression" ON public.user_progression;

-- user_schedule: eliminar duplicados
DROP POLICY IF EXISTS "Users can view their own schedule" ON public.user_schedule;

-- ========================================
-- PARTE 3: RECREAR POLÍTICAS CON (select auth.uid())
-- Esto mejora el rendimiento al no re-evaluar por cada fila
-- ========================================

-- === USERS ===
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;

CREATE POLICY "Users can view own data" ON public.users
FOR SELECT USING ((select auth.uid())::text = id::text);

CREATE POLICY "Users can update own data" ON public.users
FOR UPDATE USING ((select auth.uid())::text = id::text);

CREATE POLICY "Users can insert own data" ON public.users
FOR INSERT WITH CHECK ((select auth.uid())::text = id::text);

-- === PROFILES ===
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING ((select auth.uid()) = user_id);

-- === DAILY_LOGS ===
DROP POLICY IF EXISTS "Users can manage own daily logs" ON public.daily_logs;

CREATE POLICY "Users can manage own daily logs" ON public.daily_logs
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- === MEAL_ENTRIES ===
DROP POLICY IF EXISTS "Users can manage own meal entries" ON public.meal_entries;

CREATE POLICY "Users can manage own meal entries" ON public.meal_entries
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- === EXERCISE_LOGS ===
DROP POLICY IF EXISTS "Users can manage own exercise logs" ON public.exercise_logs;

CREATE POLICY "Users can manage own exercise logs" ON public.exercise_logs
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- === WEIGHT_HISTORY ===
DROP POLICY IF EXISTS "Users can manage own weight history" ON public.weight_history;

CREATE POLICY "Users can manage own weight history" ON public.weight_history
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- === USER_EQUIPMENT ===
DROP POLICY IF EXISTS "Users can view their own equipment" ON public.user_equipment;
DROP POLICY IF EXISTS "Users can insert their own equipment" ON public.user_equipment;
DROP POLICY IF EXISTS "Users can update their own equipment" ON public.user_equipment;
DROP POLICY IF EXISTS "Users can delete their own equipment" ON public.user_equipment;

CREATE POLICY "Users can manage own equipment" ON public.user_equipment
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- === WORKOUT_PLANS ===
DROP POLICY IF EXISTS "Users can view their own workout plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can insert their own workout plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can update their own workout plans" ON public.workout_plans;
DROP POLICY IF EXISTS "Users can delete their own workout plans" ON public.workout_plans;

CREATE POLICY "Users can manage own workout plans" ON public.workout_plans
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- === WORKOUT_PLAN_EXERCISES ===
DROP POLICY IF EXISTS "Users can view exercises from their plans" ON public.workout_plan_exercises;
DROP POLICY IF EXISTS "Users can insert exercises to their plans" ON public.workout_plan_exercises;
DROP POLICY IF EXISTS "Users can update exercises in their plans" ON public.workout_plan_exercises;
DROP POLICY IF EXISTS "Users can delete exercises from their plans" ON public.workout_plan_exercises;

CREATE POLICY "Users can manage workout plan exercises" ON public.workout_plan_exercises
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.workout_plans wp 
    WHERE wp.id = workout_plan_id AND wp.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.workout_plans wp 
    WHERE wp.id = workout_plan_id AND wp.user_id = (select auth.uid())
  )
);

-- === SAVED_ROUTINES ===
DROP POLICY IF EXISTS "Users can view their own routines" ON public.saved_routines;
DROP POLICY IF EXISTS "Users can insert their own routines" ON public.saved_routines;
DROP POLICY IF EXISTS "Users can update their own routines" ON public.saved_routines;

CREATE POLICY "Users can manage own routines" ON public.saved_routines
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- === USER_SCHEDULE ===
DROP POLICY IF EXISTS "Users can manage their own schedule" ON public.user_schedule;

CREATE POLICY "Users can manage own schedule" ON public.user_schedule
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- === WORKOUT_LOGS ===
DROP POLICY IF EXISTS "Users can view their own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can insert their own logs" ON public.workout_logs;

CREATE POLICY "Users can manage own workout logs" ON public.workout_logs
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- === USER_PROGRESSION ===
DROP POLICY IF EXISTS "Users can manage their own progression" ON public.user_progression;

CREATE POLICY "Users can manage own progression" ON public.user_progression
FOR ALL USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- ========================================
-- VERIFICACIÓN FINAL
-- ========================================

SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
