
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
        equipment_required: ['Peso corporal'], // Special handling for "None"
        met: 8.0,
        ranking_score: 100
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
        ranking_score: 95
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
        ranking_score: 90
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
        ranking_score: 98
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
        ranking_score: 85
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
        ranking_score: 97
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
        ranking_score: 92
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
        ranking_score: 99
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
        ranking_score: 94
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
        ranking_score: 96
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
        ranking_score: 93
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
        ranking_score: 88
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
        ranking_score: 89
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
        ranking_score: 87
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
        ranking_score: 86
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
