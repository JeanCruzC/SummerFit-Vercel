
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.resolve(__dirname, '../web/.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    console.error('❌ .env.local not found');
    process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Must use Service Key for writes

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const EXERCISES_DIR = path.resolve(__dirname, '../musclewiki_complete_data/exercises');
const STORAGE_BASE_URL = `${supabaseUrl}/storage/v1/object/public/exercises`;

async function seed() {
    console.log('🚀 Starting MuscleWiki Seeding...');

    // 1. CLEAR EXISTING DATA 
    console.log('🗑️ Clearing existing exercises...');
    const { error: deleteError } = await supabase.from('exercises').delete().neq('id', 0);
    if (deleteError) {
        console.error('❌ Error clearing exercises:', deleteError.message);
    } else {
        console.log('✅ Cleared old exercises.');
    }

    // Read all JSONs
    if (!fs.existsSync(EXERCISES_DIR)) {
        console.error(`❌ Directory not found: ${EXERCISES_DIR}`);
        return;
    }

    const files = fs.readdirSync(EXERCISES_DIR)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => parseInt(a) - parseInt(b));

    console.log(`📂 Found ${files.length} exercise files.`);

    const BATCH_SIZE = 50;

    // Cache mapped exercises 
    const exercisesToInsert = [];
    const mediaToInsert = [];

    for (const file of files) {
        const content = fs.readFileSync(path.join(EXERCISES_DIR, file), 'utf-8');
        try {
            const data = JSON.parse(content);

            const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            let equipment = [data.category];
            if (data.category === 'Bodyweight') equipment = ['Peso corporal', 'None', 'Ninguno'];
            if (data.category === 'Dumbbells') equipment = ['Mancuernas'];
            if (data.category === 'Barbell') equipment = ['Barra'];
            if (data.category === 'Kettlebells') equipment = ['Kettlebell'];
            if (data.category === 'Cables') equipment = ['Polea'];
            if (data.category === 'Machine') equipment = ['Máquina'];
            if (data.category === 'Stretches') equipment = ['Estiramiento', 'Ninguno'];
            if (data.category === 'Band') equipment = ['Bandas'];
            if (data.category === 'Plate') equipment = ['Discos'];
            if (data.category === 'TRX') equipment = ['TRX'];
            if (data.category === 'Yoga') equipment = ['Yoga', 'Ninguno'];

            let level = 'Intermedio';
            if (data.difficulty === 'Beginner') level = 'Principiante';
            if (data.difficulty === 'Advanced') level = 'Avanzado';

            let bodyPart = data.primary_muscles.length > 0 ? data.primary_muscles[0] : 'Other';
            const muscle = bodyPart.toLowerCase();
            if (muscle === 'biceps') bodyPart = 'Bíceps';
            if (muscle === 'triceps') bodyPart = 'Tríceps';
            if (muscle.includes('chest') || muscle === 'pectorals') bodyPart = 'Pecho';
            if (muscle.includes('back') || muscle === 'lats') bodyPart = 'Espalda';
            if (muscle.includes('leg') || muscle === 'quadriceps' || muscle === 'hamstrings' || muscle === 'calves' || muscle === 'glutes') bodyPart = 'Piernas';
            if (muscle.includes('shoulder') || muscle === 'delts') bodyPart = 'Hombros';
            if (muscle.includes('abdominal') || muscle === 'core') bodyPart = 'Abdomen';
            if (muscle.includes('cardio')) bodyPart = 'Cardio';

            const exercise = {
                slug: slug,
                title: data.name,
                description: data.steps ? data.steps[0] : null,
                type: 'Fuerza', // Default
                level: level,
                body_part: bodyPart,
                equipment_required: equipment,
                force: data.force,
                mechanic: data.mechanic,
                primary_muscles: data.primary_muscles,
                instructions: data.steps,
                ranking_score: 100
            };

            exercisesToInsert.push(exercise);

            // Prepare Media
            if (data.videos && Array.isArray(data.videos)) {
                data.videos.forEach((vid) => {
                    if (!vid.url) return;

                    const videoFilename = vid.url.split('/').pop();
                    const imageFilename = vid.og_image ? vid.og_image.split('/').pop() : null;

                    mediaToInsert.push({
                        slug: slug,
                        type: 'video',
                        url: `${STORAGE_BASE_URL}/videos/${videoFilename}`,
                        gender: vid.gender,
                        angle: vid.angle
                    });

                    if (imageFilename) {
                        mediaToInsert.push({
                            slug: slug,
                            type: 'image',
                            url: `${STORAGE_BASE_URL}/images/${imageFilename}`,
                            gender: vid.gender,
                            angle: vid.angle
                        });
                    }
                });
            }

        } catch (e) {
            console.error(`Error parsing ${file}:`, e);
        }
    }

    console.log(`Inserting ${exercisesToInsert.length} exercises...`);

    for (let i = 0; i < exercisesToInsert.length; i += BATCH_SIZE) {
        const batch = exercisesToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('exercises').upsert(batch, { onConflict: 'slug' });
        if (error) {
            console.error('❌ Error inserting exercises batch:', error);
        } else {
            process.stdout.write('.');
        }
    }
    console.log('\n✅ Exercises inserted.');

    console.log('Fetching IDs for media linking...');
    const { data: allExercises } = await supabase.from('exercises').select('id, slug');
    const slugToId = new Map(allExercises ? allExercises.map(e => [e.slug, e.id]) : []);

    const finalMedia = mediaToInsert.map(m => {
        const id = slugToId.get(m.slug);
        if (!id) return null;
        return {
            exercise_id: id,
            type: m.type,
            url: m.url,
            gender: m.gender,
            angle: m.angle
        };
    }).filter(x => x !== null);

    console.log(`Inserting ${finalMedia.length} media items...`);
    for (let i = 0; i < finalMedia.length; i += BATCH_SIZE) {
        const batch = finalMedia.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('exercise_media').insert(batch);
        if (!error) process.stdout.write('.');
    }

    console.log('\n✨ Database seeding completed!');
}

seed().catch(console.error);
