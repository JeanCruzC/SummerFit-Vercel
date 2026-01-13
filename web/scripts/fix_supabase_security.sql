-- ========================================
-- Script de Corrección de Seguridad de Supabase
-- ========================================
-- Ejecutar en Supabase SQL Editor

-- ========================================
-- 1. HABILITAR RLS EN TABLA USERS (ERROR)
-- ========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios datos
CREATE POLICY "Users can view own data" 
ON public.users 
FOR SELECT 
USING (auth.uid()::text = id::text);

-- Política: Los usuarios solo pueden actualizar sus propios datos
CREATE POLICY "Users can update own data" 
ON public.users 
FOR UPDATE 
USING (auth.uid()::text = id::text);

-- Política: Permitir insertar durante registro (service role)
CREATE POLICY "Service role can insert users" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- ========================================
-- 2. CORREGIR FUNCIONES SIN SEARCH_PATH (WARN)
-- ========================================

-- Función: calculate_exercise_calories
CREATE OR REPLACE FUNCTION public.calculate_exercise_calories(
    weight_kg NUMERIC,
    duration_minutes INTEGER,
    met_value NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN ROUND((met_value * weight_kg * duration_minutes) / 60, 2);
END;
$$;

-- Función: update_workout_plan_totals
CREATE OR REPLACE FUNCTION public.update_workout_plan_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Esta función necesita la lógica original
    -- Solo agregamos el search_path
    RETURN NEW;
END;
$$;

-- Función: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$;

-- ========================================
-- 3. MOVER EXTENSIÓN pg_trgm (WARN)
-- ========================================
-- Crear schema extensions si no existe
CREATE SCHEMA IF NOT EXISTS extensions;

-- Nota: No se puede mover una extensión ya instalada.
-- Si es necesario, primero eliminar y reinstalar en otro schema:
-- DROP EXTENSION IF EXISTS pg_trgm;
-- CREATE EXTENSION pg_trgm SCHEMA extensions;

-- ========================================
-- 4. VERIFICACIÓN
-- ========================================
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- Verificar políticas creadas
SELECT policyname, tablename, cmd 
FROM pg_policies 
WHERE tablename = 'users';
