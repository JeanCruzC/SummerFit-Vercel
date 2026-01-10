
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

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
const PROJECT_ID = supabaseUrl.split('//')[1].split('.')[0];
const STORAGE_BASE_URL = `${supabaseUrl}/storage/v1/object/public/exercises`;

async function seed() {
    console.log('🚀 Starting MuscleWiki Seeding...');

    // 1. CLEAR EXISTING DATA (Since user wants ONLY MuscleWiki exercises)
    console.log('🗑️ Clearing existing exercises...');
    const { error: deleteError } = await supabase.from('exercises').delete().neq('id', 0); // Delete all rows where ID != 0 (basically all)
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

    // Simple numeric sort manually or just standard sort
    const files = fs.readdirSync(EXERCISES_DIR)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => parseInt(a) - parseInt(b));

    console.log(`📂 Found ${files.length} exercise files.`);

    const BATCH_SIZE = 50;

    // Cache mapped exercises to avoid re-reading
    const exercisesToInsert: any[] = [];
    const mediaToInsert: any[] = [];

    for (const file of files) {
        const content = fs.readFileSync(path.join(EXERCISES_DIR, file), 'utf-8');
        try {
            const data = JSON.parse(content);

            // Map JSON to DB Schema
            // id: data.id (Keep original ID to easily link media?) - Yes, let's try to keep it if SERIAL allows or just let Supabase generate new one and we map.
            // Actually, `exercises` table uses BIGSERIAL. If we provide ID, it might conflict with sequence unless we reset sequence.
            // Better to let Supabase generate ID, OR since we are wiping/replacing, we can force ID if table is empty.
            // Let's use the `slug` as the unique identifier for upsert. 
            // Name -> Slug
            const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            // MAP CATEGORY TO EQUIPMENT
            // MuscleWiki uses "Bodyweight", "Dumbbells", "Barbell", etc.
            // Our App uses "Peso corporal", "Mancuernas", "Barra", "Ninguno"
            let equipment = [data.category]; // Default
            if (data.category === 'Bodyweight') equipment = ['Peso corporal', 'None'];
            if (data.category === 'Dumbbells') equipment = ['Mancuernas'];
            if (data.category === 'Barbell') equipment = ['Barra'];
            if (data.category === 'Kettlebells') equipment = ['Kettlebell'];
            if (data.category === 'Cables') equipment = ['Polea'];
            if (data.category === 'Machine') equipment = ['Máquina'];

            // MAP DIFFICULTY TO LEVEL
            let level = 'Intermedio';
            if (data.difficulty === 'Beginner') level = 'Principiante';
            if (data.difficulty === 'Advanced') level = 'Avanzado';

            // MAP MUSCLE TO BODY PART (Spanish preferred by UI?)
            // UI `bodyParts` are: Pecho, Espalda, Piernas, Hombros, Bíceps, Tríceps, Abdomen, Cardio
            // MuscleWiki: Biceps, Lats, Quads, etc.
            let bodyPart = data.primary_muscles.length > 0 ? data.primary_muscles[0] : 'Other';
            const muscle = bodyPart.toLowerCase();
            if (muscle === 'biceps') bodyPart = 'Bíceps';
            if (muscle === 'triceps') bodyPart = 'Tríceps';
            if (muscle.includes('chest') || muscle === 'pectorals') bodyPart = 'Pecho';
            if (muscle.includes('back') || muscle === 'lats') bodyPart = 'Espalda';
            if (muscle.includes('leg') || muscle === 'quadriceps' || muscle === 'hamstrings' || muscle === 'calves' || muscle === 'glutes') bodyPart = 'Piernas';
            if (muscle.includes('shoulder') || muscle === 'delts') bodyPart = 'Hombros';
            if (muscle.includes('abdominal') || muscle === 'core') bodyPart = 'Abdomen';

            const exercise = {
                slug: slug,
                title: data.name, // Keep English name or Translate? User said "exercises from musclewiki", implies keeping them.
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
                data.videos.forEach((vid: any) => {
                    // Extract filename from URL
                    const videoFilename = vid.url.split('/').pop();
                    const imageFilename = vid.og_image.split('/').pop();

                    // Store strict relation to SLUG (since we don't have DB ID yet)
                    // We will resolve IDs after insertion
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

    // BATCH INSERT EXERCISES
    console.log(`Inserting ${exercisesToInsert.length} exercises...`);

    // Upsert exercises
    for (let i = 0; i < exercisesToInsert.length; i += BATCH_SIZE) {
        const batch = exercisesToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('exercises').upsert(batch, { onConflict: 'slug' });
        if (error) {
            console.error('❌ Error inserting exercises batch:', JSON.stringify(error));
        } else {
            process.stdout.write('.');
        }
    }
    console.log('\n✅ Exercises inserted.');

    // FETCH IDs map
    console.log('Fetching IDs for media linking...');
    const { data: allExercises } = await supabase.from('exercises').select('id, slug');
    const slugToId = new Map(allExercises?.map((e: any) => [e.slug, e.id]));

    // MAP MEDIA TO DB IDs
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

    // BATCH INSERT MEDIA
    console.log(`Inserting ${finalMedia.length} media items...`);
    for (let i = 0; i < finalMedia.length; i += BATCH_SIZE) {
        const batch = finalMedia.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('exercise_media').insert(batch);
        if (error) {
            // console.error('❌ Error media batch:', error.message); 
            // Ignore duplicates if re-running
        } else {
            process.stdout.write('.');
        }
    }

    console.log('\n✨ Database seeding completed!');
}

seed().catch(console.error);
