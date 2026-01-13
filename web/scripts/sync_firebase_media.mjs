/**
 * Script para sincronizar exercise_media con Firebase URLs
 * Ejecutar con: node sync_firebase_media.mjs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const FIREBASE_BUCKET = 'summerfit-media.firebasestorage.app';
const EXERCISES_DIR = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/musclewiki_complete_data/exercises';
const IMAGES_DIR = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/musclewiki_complete_data/images';
const VIDEOS_DIR = '/home/jcc/Descargas/SummerFit--main/SummerFit-Vercel-main/musclewiki_complete_data/videos';

// Crear cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Función para generar URL de Firebase
function getFirebaseUrl(folder, filename) {
    const encodedPath = `exercises%2F${folder}%2F${encodeURIComponent(filename)}`;
    return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_BUCKET}/o/${encodedPath}?alt=media`;
}

// Función para extraer nombre de archivo de URL de MuscleWiki
function extractFilename(url) {
    const parts = url.split('/');
    return parts[parts.length - 1];
}

// Verificar si archivo existe localmente
function fileExists(folder, filename) {
    const dir = folder === 'images' ? IMAGES_DIR : VIDEOS_DIR;
    return fs.existsSync(path.join(dir, filename));
}

async function main() {
    console.log('🚀 Iniciando sincronización de media con Firebase...\n');

    // Leer todos los archivos de ejercicios
    const exerciseFiles = fs.readdirSync(EXERCISES_DIR).filter(f => f.endsWith('.json'));
    console.log(`📁 Encontrados ${exerciseFiles.length} archivos de ejercicios\n`);

    // Obtener ejercicios de la BD
    const { data: dbExercises, error: exError } = await supabase
        .from('exercises')
        .select('id, title');

    if (exError) {
        console.error('Error obteniendo ejercicios:', exError);
        return;
    }

    // Crear mapa de ejercicios por título
    const exerciseMap = new Map();
    dbExercises.forEach(ex => {
        exerciseMap.set(ex.title.toLowerCase().trim(), ex.id);
    });

    console.log(`📊 ${dbExercises.length} ejercicios en la BD\n`);

    let updatedCount = 0;
    let insertedCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    // Procesar cada archivo JSON
    for (const file of exerciseFiles) {
        const jsonPath = path.join(EXERCISES_DIR, file);
        const exercise = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

        // Buscar ejercicio en BD por nombre
        const exerciseId = exerciseMap.get(exercise.name.toLowerCase().trim());

        if (!exerciseId) {
            // console.log(`⚠️ Ejercicio no encontrado en BD: ${exercise.name}`);
            notFoundCount++;
            continue;
        }

        // Procesar videos del ejercicio
        if (exercise.videos && exercise.videos.length > 0) {
            for (const video of exercise.videos) {
                // Video
                const videoFilename = extractFilename(video.url);
                const videoExists = fileExists('videos', videoFilename);

                if (videoExists) {
                    const firebaseVideoUrl = getFirebaseUrl('videos', videoFilename);

                    // Actualizar o insertar
                    const { error } = await supabase
                        .from('exercise_media')
                        .upsert({
                            exercise_id: exerciseId,
                            url: firebaseVideoUrl,
                            type: 'video',
                            gender: video.gender,
                            angle: video.angle
                        }, {
                            onConflict: 'exercise_id,type,gender,angle'
                        });

                    if (!error) {
                        updatedCount++;
                    }
                } else {
                    skippedCount++;
                }

                // Imagen OG
                if (video.og_image) {
                    const imageFilename = extractFilename(video.og_image);
                    const imageExists = fileExists('images', imageFilename);

                    if (imageExists) {
                        const firebaseImageUrl = getFirebaseUrl('images', imageFilename);

                        const { error } = await supabase
                            .from('exercise_media')
                            .upsert({
                                exercise_id: exerciseId,
                                url: firebaseImageUrl,
                                type: 'image',
                                gender: video.gender,
                                angle: video.angle
                            }, {
                                onConflict: 'exercise_id,type,gender,angle'
                            });

                        if (!error) {
                            insertedCount++;
                        }
                    } else {
                        skippedCount++;
                    }
                }
            }
        }
    }

    console.log('\n✅ Sincronización completada!');
    console.log(`   - Videos/Imágenes actualizados: ${updatedCount}`);
    console.log(`   - Registros insertados: ${insertedCount}`);
    console.log(`   - Archivos no encontrados localmente: ${skippedCount}`);
    console.log(`   - Ejercicios no encontrados en BD: ${notFoundCount}`);
}

main().catch(console.error);
