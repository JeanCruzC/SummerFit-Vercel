-- Contar ejercicios totales
SELECT 'Ejercicios totales' as tipo, COUNT(*) as total FROM exercises;

-- Contar registros de media
SELECT 'Total media' as tipo, COUNT(*) as total FROM exercise_media;

-- Contar por tipo de media
SELECT type as tipo, COUNT(*) as total FROM exercise_media GROUP BY type;

-- Ejercicios SIN ninguna media
SELECT 'Ejercicios SIN media' as tipo, COUNT(*) as total
FROM exercises e 
WHERE NOT EXISTS (SELECT 1 FROM exercise_media em WHERE em.exercise_id = e.id);

-- Ejercicios CON media
SELECT 'Ejercicios CON media' as tipo, COUNT(*) as total
FROM exercises e 
WHERE EXISTS (SELECT 1 FROM exercise_media em WHERE em.exercise_id = e.id);
