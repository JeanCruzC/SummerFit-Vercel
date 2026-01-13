-- Script de Migración: Actualizar URLs de exercise_media a Firebase Storage
-- 
-- ANTES DE EJECUTAR:
-- 1. Hacer backup de la tabla exercise_media
-- 2. Este script cambia las URLs de Supabase a Firebase
--
-- Bucket Firebase: summerfit-media.firebasestorage.app
-- Formato URL Firebase: https://firebasestorage.googleapis.com/v0/b/summerfit-media.firebasestorage.app/o/exercises%2Fimages%2FFILENAME?alt=media

-- PASO 1: Ver ejemplos actuales de URLs
SELECT id, url, type 
FROM exercise_media 
LIMIT 5;

-- PASO 2: Actualizar URLs de imágenes (Supabase -> Firebase)
-- Las imágenes están en: gs://summerfit-media.firebasestorage.app/exercises/images/
UPDATE exercise_media 
SET url = CONCAT(
    'https://firebasestorage.googleapis.com/v0/b/summerfit-media.firebasestorage.app/o/exercises%2Fimages%2F',
    REPLACE(
        SUBSTRING(url FROM '[^/]+$'),  -- Obtener solo el nombre del archivo
        ' ', '%20'  -- Encodear espacios
    ),
    '?alt=media'
)
WHERE type = 'image'
  AND url LIKE '%supabase%';

-- PASO 3: Actualizar URLs de videos (Supabase -> Firebase)  
-- Los videos están en: gs://summerfit-media.firebasestorage.app/exercises/videos/
UPDATE exercise_media 
SET url = CONCAT(
    'https://firebasestorage.googleapis.com/v0/b/summerfit-media.firebasestorage.app/o/exercises%2Fvideos%2F',
    REPLACE(
        SUBSTRING(url FROM '[^/]+$'),  -- Obtener solo el nombre del archivo
        ' ', '%20'  -- Encodear espacios
    ),
    '?alt=media'
)
WHERE type = 'video'
  AND url LIKE '%supabase%';

-- PASO 4: Verificar los cambios
SELECT id, url, type 
FROM exercise_media 
WHERE url LIKE '%firebase%'
LIMIT 10;

-- PASO 5: Contar registros actualizados
SELECT type, COUNT(*) as total
FROM exercise_media 
WHERE url LIKE '%firebase%'
GROUP BY type;
