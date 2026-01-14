-- 1. Intentamos borrar la política por si ya existe (para evitar errores)
DROP POLICY IF EXISTS "Allow public read access to workout_plan_exercises" ON workout_plan_exercises;

-- 2. Aseguramos que RLS esté activo
ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;

-- 3. Creamos la política de acceso público
CREATE POLICY "Allow public read access to workout_plan_exercises"
ON workout_plan_exercises
FOR SELECT
TO public
USING (true);
