/**
 * Seed Basic Exercises Script
 * 
 * Populates Supabase 'exercises' table with a curated list of basic exercises.
 * Uses 'slug' as the unique identifier for upsert operations.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load env from web/.env.local
const envPath = path.resolve(__dirname, '../web/.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error('❌ .env.local not found at:', envPath);
    process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASIC_EXERCISES = [
    // --- CARDIO (No Equipment / Home) ---
    {
        slug: 'running',
        title: 'Correr (Running)',
        description: 'Ejercicio cardiovascular fundamental. Mejora la resistencia y quema calorías. Puede realizarse al aire libre o en cinta.',
        type: 'Cardio',
        level: 'Principiante',
        body_part: 'Full Body',
        equipment_required: ['Peso corporal'],
        met: 8.0,
        ranking_score: 100,
        // Smart Tags
        movement_pattern: 'cardio_steady',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['quadriceps', 'calfs', 'heart'],
        secondary_muscles: ['hamstrings', 'glutes', 'core'],
        score_hypertrophy: 2,
        score_strength: 2,
        score_difficulty: 1,
        score_risk: 2,
        score_stability: 3,
        exercise_media: [{
            type: 'image',
            url: 'https://images.unsplash.com/photo-1552674605-46d526776b2f?w=400',
            order: 1
        }]
    },
    {
        slug: 'walking',
        title: 'Caminata',
        description: 'Cardio de bajo impacto ideal para principiantes y personas con obesidad. Protege las articulaciones.',
        type: 'Cardio',
        level: 'Principiante',
        body_part: 'Full Body',
        equipment_required: ['Peso corporal'],
        met: 3.5,
        ranking_score: 95,
        movement_pattern: 'cardio_low_impact',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['quadriceps', 'calfs'],
        secondary_muscles: ['glutes', 'core'],
        score_hypertrophy: 1,
        score_strength: 1,
        score_difficulty: 1,
        score_risk: 1,
        score_stability: 5,
        exercise_media: [{
            type: 'image',
            url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400',
            order: 1
        }]
    },
    {
        slug: 'treadmill-incline-walk',
        title: 'Caminata Inclinada en Cinta',
        description: 'Caminata con inclinación en cinta. Mayor quema calórica que caminata plana, bajo impacto.',
        type: 'Cardio',
        level: 'Principiante',
        body_part: 'Full Body',
        equipment_required: ['Cinta de correr'],
        met: 5.0,
        ranking_score: 92,
        movement_pattern: 'cardio_low_impact',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['glutes', 'hamstrings'],
        secondary_muscles: ['quadriceps', 'calfs'],
        score_hypertrophy: 2,
        score_strength: 2,
        score_difficulty: 1,
        score_risk: 1,
        score_stability: 5,
        exercise_media: [{
            type: 'image',
            url: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400',
            order: 1
        }]
    },
    {
        slug: 'hiit-burpees',
        title: 'HIIT - Burpees (20min)',
        description: 'Entrenamiento HIIT de alta intensidad con burpees. 30seg trabajo, 30seg descanso. Quema calórica extrema.',
        type: 'Cardio',
        level: 'Intermedio',
        body_part: 'Full Body',
        equipment_required: ['Peso corporal'],
        met: 12.0,
        ranking_score: 88,
        movement_pattern: 'cardio_hiit',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['quadriceps', 'pectorals', 'triceps'],
        secondary_muscles: ['core', 'deltoids', 'hamstrings'],
        score_hypertrophy: 3,
        score_strength: 3,
        score_difficulty: 4,
        score_risk: 3,
        score_stability: 2,
        exercise_media: [{
            type: 'image',
            url: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=400',
            order: 1
        }]
    },
    {
        slug: 'hiit-sprints',
        title: 'HIIT - Sprints (20min)',
        description: 'Intervalos de sprints de alta intensidad. 30seg sprint, 60seg caminata. Ideal para pérdida de grasa.',
        type: 'Cardio',
        level: 'Intermedio',
        body_part: 'Full Body',
        equipment_required: ['Peso corporal'],
        met: 10.0,
        ranking_score: 90,
        movement_pattern: 'cardio_hiit',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['quadriceps', 'calfs', 'glutes'],
        secondary_muscles: ['hamstrings', 'core'],
        score_hypertrophy: 2,
        score_strength: 3,
        score_difficulty: 4,
        score_risk: 3,
        score_stability: 3,
        exercise_media: [{
            type: 'image',
            url: 'https://images.unsplash.com/photo-1562771379-e71d218a8781?w=400',
            order: 1
        }]
    },
    {
        slug: 'treadmill-hiit',
        title: 'HIIT en Cinta (20min)',
        description: 'Intervalos de alta intensidad en cinta. Alterna velocidad alta (1min) con recuperación (1min).',
        type: 'Cardio',
        level: 'Intermedio',
        body_part: 'Full Body',
        equipment_required: ['Cinta de correr'],
        met: 11.0,
        ranking_score: 91,
        movement_pattern: 'cardio_hiit',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['quadriceps', 'calfs'],
        secondary_muscles: ['hamstrings', 'glutes', 'core'],
        score_hypertrophy: 2,
        score_strength: 3,
        score_difficulty: 3,
        score_risk: 2,
        score_stability: 4,
        exercise_media: [{
            type: 'image',
            url: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400',
            order: 1
        }]
    },
    {
        slug: 'mountain-climbers',
        title: 'Mountain Climbers (HIIT)',
        description: 'Ejercicio de cardio HIIT explosivo. Trabaja core y cardio simultáneamente.',
        type: 'Cardio',
        level: 'Intermedio',
        body_part: 'Full Body',
        equipment_required: ['Peso corporal'],
        met: 9.0,
        ranking_score: 87,
        movement_pattern: 'cardio_hiit',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['core', 'quadriceps'],
        secondary_muscles: ['deltoids', 'hip_flexors'],
        score_hypertrophy: 2,
        score_strength: 2,
        score_difficulty: 3,
        score_risk: 2,
        score_stability: 3,
        exercise_media: [{
            type: 'image',
            url: 'https://images.unsplash.com/photo-1434608519344-49d77a699ded?w=400',
            order: 1
        }]
    },
    {
        slug: 'jumping-jacks',
        title: 'Saltos de Tijera (Jumping Jacks)',
        description: 'Ejercicio de cardio clásico para calentar y elevar el ritmo cardíaco. Involucra todo el cuerpo.',
        type: 'Cardio',
        level: 'Principiante',
        body_part: 'Full Body',
        equipment_required: ['Peso corporal'],
        met: 8.0,
        ranking_score: 95,
        movement_pattern: 'cardio_plyo',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['calves', 'deltoids'],
        secondary_muscles: ['quadriceps', 'core'],
        score_hypertrophy: 1,
        score_strength: 1,
        score_difficulty: 1,
        score_risk: 1,
        score_stability: 4,
        exercise_media: [{
            type: 'image',
            url: 'https://images.unsplash.com/photo-1544367563-12123d832d61?w=400',
            order: 1
        }]
    },
    {
        slug: 'burpees',
        title: 'Burpees',
        description: 'Ejercicio intenso de cuerpo completo que combina fuerza y resistencia cardiovascular.',
        type: 'Cardio',
        level: 'Intermedio',
        body_part: 'Full Body',
        equipment_required: ['Peso corporal'],
        met: 10.0,
        ranking_score: 90,
        movement_pattern: 'cardio_plyo',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['pectorals', 'quadriceps', 'triceps'],
        secondary_muscles: ['core', 'deltoids', 'hamstrings'],
        score_hypertrophy: 3,
        score_strength: 3,
        score_difficulty: 4,
        score_risk: 3,
        score_stability: 3,
        exercise_media: [{
            type: 'image',
            url: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=400',
            order: 1
        }]
    },

    // --- CHEST / PUSH (Home/Calisthenics) ---
    {
        slug: 'push-ups',
        title: 'Flexiones (Push-ups)',
        description: 'Ejercicio fundamental para pecho, hombros y tríceps. Mantén el cuerpo recto como una tabla.',
        type: 'Fuerza',
        level: 'Principiante',
        body_part: 'Pecho',
        equipment_required: ['Peso corporal'],
        met: 3.8,
        ranking_score: 98,
        movement_pattern: 'horizontal_press',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['pectorals'],
        secondary_muscles: ['triceps', 'anterior_deltoid'],
        score_hypertrophy: 4,
        score_strength: 4,
        score_difficulty: 2,
        score_risk: 2
    },
    {
        slug: 'incline-push-ups',
        title: 'Flexiones Inclinadas',
        description: 'Variante más fácil de flexiones, con las manos apoyadas en una superficie elevada. Ideal para principiantes.',
        type: 'Fuerza',
        level: 'Principiante',
        body_part: 'Pecho',
        equipment_required: ['Peso corporal'],
        met: 3.5,
        ranking_score: 85,
        movement_pattern: 'horizontal_press',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['pectorals'],
        secondary_muscles: ['triceps', 'anterior_deltoid'],
        score_hypertrophy: 3,
        score_strength: 3,
        score_difficulty: 1,
        score_risk: 1
    },

    // --- BACK / PULL (Home/Calisthenics) ---
    {
        slug: 'pull-ups',
        title: 'Dominadas (Pull-ups)',
        description: 'El mejor ejercicio de peso corporal para espalda y bíceps. Requiere una barra.',
        type: 'Fuerza',
        level: 'Intermedio',
        body_part: 'Espalda',
        equipment_required: ['Barra de dominadas'],
        met: 5.0,
        ranking_score: 97,
        movement_pattern: 'vertical_pull',
        mechanic: 'Compound',
        force: 'Pull',
        primary_muscles: ['latissimus_dorsi'],
        secondary_muscles: ['biceps', 'rear_deltoid', 'rhomboids'],
        score_hypertrophy: 5,
        score_strength: 5,
        score_difficulty: 4,
        score_risk: 2
    },
    {
        slug: 'chin-ups',
        title: 'Dominadas Supinas (Chin-ups)',
        description: 'Similar a las dominadas pero con agarre supino (palmas hacia ti). Enfatiza más los bíceps.',
        type: 'Fuerza',
        level: 'Intermedio',
        body_part: 'Bíceps',
        equipment_required: ['Barra de dominadas'],
        met: 5.0,
        ranking_score: 92,
        movement_pattern: 'vertical_pull',
        mechanic: 'Compound',
        force: 'Pull',
        primary_muscles: ['biceps', 'latissimus_dorsi'],
        secondary_muscles: ['rear_deltoid', 'forearms'],
        score_hypertrophy: 5,
        score_strength: 4,
        score_difficulty: 3,
        score_risk: 2
    },

    // --- LEGS (Home) ---
    {
        slug: 'squats',
        title: 'Sentadillas (Squats)',
        description: 'El rey de los ejercicios de pierna. Trabaja cuádriceps, glúteos e isquios.',
        type: 'Fuerza',
        level: 'Principiante',
        body_part: 'Piernas',
        equipment_required: ['Peso corporal'],
        met: 5.0,
        ranking_score: 99,
        movement_pattern: 'squat',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['quadriceps', 'glutes'],
        secondary_muscles: ['hamstrings', 'adductors', 'core'],
        score_hypertrophy: 5,
        score_strength: 4,
        score_difficulty: 2,
        score_risk: 2
    },
    {
        slug: 'lunges',
        title: 'Zancadas (Lunges)',
        description: 'Excelente ejercicio unilateral para piernas y glúteos. Mejora el equilibrio.',
        type: 'Fuerza',
        level: 'Principiante',
        body_part: 'Piernas',
        equipment_required: ['Peso corporal'],
        met: 4.0,
        ranking_score: 94,
        movement_pattern: 'lunge_step',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['quadriceps', 'glutes'],
        secondary_muscles: ['hamstrings', 'calves', 'core'],
        score_hypertrophy: 4,
        score_strength: 3,
        score_difficulty: 3,
        score_risk: 2
    },

    // --- ABS / CORE ---
    {
        slug: 'plank',
        title: 'Plancha (Plank)',
        description: 'Ejercicio isométrico para fortalecer todo el core/abdomen. Mantén la postura recta.',
        type: 'Fuerza',
        level: 'Principiante',
        body_part: 'Abdomen',
        equipment_required: ['Peso corporal'],
        met: 3.0,
        ranking_score: 96,
        movement_pattern: 'core_stability',
        mechanic: 'Isolation',
        force: 'Static',
        primary_muscles: ['rectus_abdominis', 'transverse_abdominis'],
        secondary_muscles: ['shoulders', 'glutes'],
        score_hypertrophy: 3,
        score_strength: 4,
        score_difficulty: 2,
        score_risk: 1
    },
    {
        slug: 'crunches',
        title: 'Abdominale (Crunches)',
        description: 'Ejercicio clásico para el recto abdominal.',
        type: 'Fuerza',
        level: 'Principiante',
        body_part: 'Abdomen',
        equipment_required: ['Peso corporal'],
        met: 3.0,
        ranking_score: 93,
        movement_pattern: 'core_flexion',
        mechanic: 'Isolation',
        force: 'Pull', // Flexion allows pull
        primary_muscles: ['rectus_abdominis'],
        secondary_muscles: ['obliques'],
        score_hypertrophy: 3,
        score_strength: 2,
        score_difficulty: 1,
        score_risk: 2
    },

    // --- GYM BASICS ---
    {
        slug: 'bench-press',
        title: 'Press de Banca (Bench Press)',
        description: 'Ejercicio compuesto fundamental para pecho, tríceps y hombros usando barra.',
        type: 'Fuerza',
        level: 'Intermedio',
        body_part: 'Pecho',
        equipment_required: ['Barra', 'Banco plano'],
        met: 5.0,
        ranking_score: 88,
        movement_pattern: 'horizontal_press',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['pectorals'],
        secondary_muscles: ['triceps', 'anterior_deltoid'],
        score_hypertrophy: 5,
        score_strength: 5,
        score_difficulty: 3,
        score_risk: 3
    },
    {
        slug: 'deadlift',
        title: 'Peso Muerto (Deadlift)',
        description: 'Ejercicio de cuerpo completo que enfatiza la cadena posterior (espalda baja, glúteos, isquios).',
        type: 'Fuerza',
        level: 'Intermedio',
        body_part: 'Espalda',
        equipment_required: ['Barra'],
        met: 6.0,
        ranking_score: 89,
        movement_pattern: 'hip_hinge',
        mechanic: 'Compound',
        force: 'Pull',
        primary_muscles: ['glutes', 'hamstrings', 'erector_spinae'],
        secondary_muscles: ['trapezius', 'forearms', 'quadriceps'],
        score_hypertrophy: 5,
        score_strength: 5,
        score_difficulty: 5,
        score_risk: 4
    },
    {
        slug: 'dumbbell-curl',
        title: 'Curl de Bíceps con Mancuernas',
        description: 'Ejercicio de aislamiento para desarrollar los bíceps.',
        type: 'Fuerza',
        level: 'Principiante',
        body_part: 'Bíceps',
        equipment_required: ['Mancuernas'],
        met: 3.0,
        ranking_score: 87,
        movement_pattern: 'elbow_flexion_curl',
        mechanic: 'Isolation',
        force: 'Pull',
        primary_muscles: ['biceps'],
        secondary_muscles: ['forearms'],
        score_hypertrophy: 4,
        score_strength: 2,
        score_difficulty: 1,
        score_risk: 1
    },
    {
        slug: 'shoulder-press',
        title: 'Press Militar (Shoulder Press)',
        description: 'Ejercicio vertical de empuje para desarrollar hombros fuertes.',
        type: 'Fuerza',
        level: 'Intermedio',
        body_part: 'Hombros',
        equipment_required: ['Mancuernas'], // Or Barbell
        met: 4.0,
        ranking_score: 86,
        movement_pattern: 'vertical_press',
        mechanic: 'Compound',
        force: 'Push',
        primary_muscles: ['deltoids'],
        secondary_muscles: ['triceps', 'upper_chest'],
        score_hypertrophy: 5,
        score_strength: 5,
        score_difficulty: 3,
        score_risk: 3
    },
    {
        slug: 'triceps-extension',
        title: 'Extensión de Tríceps',
        description: 'Ejercicio de aislamiento para tríceps.',
        type: 'Fuerza',
        level: 'Principiante',
        body_part: 'Tríceps',
        equipment_required: ['Mancuernas', 'Polea'],
        met: 3.0,
        ranking_score: 85,
        movement_pattern: 'triceps_extension',
        mechanic: 'Isolation',
        force: 'Push',
        primary_muscles: ['triceps'],
        secondary_muscles: [],
        score_hypertrophy: 4,
        score_strength: 2,
        score_difficulty: 2,
        score_risk: 1
    },
    {
        slug: 'lateral-raise',
        title: 'Elevaciones Laterales',
        description: 'Aislamiento para la cabeza lateral del hombro.',
        type: 'Fuerza',
        level: 'Principiante',
        body_part: 'Hombros',
        equipment_required: ['Mancuernas'],
        met: 3.0,
        ranking_score: 88,
        movement_pattern: 'shoulder_raise',
        mechanic: 'Isolation',
        force: 'Push', // Abduction
        primary_muscles: ['lateral_deltoid'],
        secondary_muscles: ['trapezius'],
        score_hypertrophy: 5,
        score_strength: 2,
        score_difficulty: 2,
        score_risk: 2
    },
    {
        slug: 'dumbbell-row',
        title: 'Remo con Mancuerna',
        description: 'Ejercicio unilateral para dorsales y espalda media.',
        type: 'Fuerza',
        level: 'Intermedio',
        body_part: 'Espalda',
        equipment_required: ['Mancuernas', 'Banco'],
        met: 4.0,
        ranking_score: 91,
        movement_pattern: 'horizontal_pull',
        mechanic: 'Compound',
        force: 'Pull',
        primary_muscles: ['latissimus_dorsi', 'rhomboids'],
        secondary_muscles: ['biceps', 'rear_deltoid'],
        score_hypertrophy: 5,
        score_strength: 4,
        score_difficulty: 2,
        score_risk: 2
    }
];

async function seed() {
    console.log('🌱 Seeding basic exercises...');

    let count = 0;
    for (const ex of BASIC_EXERCISES) {
        // Upsert based on slug
        const { error } = await supabase
            .from('exercises')
            .upsert(ex, { onConflict: 'slug' });

        if (error) {
            console.error(`❌ Error inserting ${ex.slug}:`, error.message);
        } else {
            console.log(`✅ Inserted: ${ex.title}`);
            count++;
        }
    }

    console.log(`\n✨ Finished! Inserted/Updated ${count} exercises.`);
}

seed();
