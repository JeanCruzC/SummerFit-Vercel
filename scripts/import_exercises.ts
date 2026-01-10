import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as csv from 'csv-parser';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../web/.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExerciseRow {
    slug: string;
    title: string;
    description: string;
    type: string;
    level: string;
    body_part: string;
    equipment_required: string;
    lugar_entrenamiento: string;
    met: string;
    ranking_score: string;
    rating: string;
    rating_desc: string;
}

interface Exercise {
    slug: string;
    title: string;
    description: string | null;
    type: string | null;
    level: string | null;
    body_part: string | null;
    equipment_required: string[] | null;
    training_location: string[] | null;
    met: number | null;
    ranking_score: number | null;
    rating: number | null;
    rating_desc: string | null;
}

function parseArrayField(field: string): string[] | null {
    if (!field || field.trim() === '') return null;
    try {
        const normalized = field.replace(/'/g, '"');
        const parsed = JSON.parse(normalized);
        return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
        // Sanitize field for safe logging (CWE-117)
        const cleanField = typeof field === 'string' ? field.replace(/[\r\n]/g, '') : 'unknown';
        console.warn(`Failed to parse array field: ${cleanField}`);
        return null;
    }
}

function parseNumber(value: string): number | null {
    if (!value || value.trim() === '') return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
}

async function importExercises() {
    console.log('🏋️  Starting exercise import...\n');

    const exercises: Exercise[] = [];
    const filePath = './exercises_summerfit_es_final.csv';

    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        process.exit(1);
    }

    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (row: ExerciseRow) => {
                exercises.push({
                    slug: row.slug,
                    title: row.title,
                    description: row.description || null,
                    type: row.type || null,
                    level: row.level || null,
                    body_part: row.body_part || null,
                    equipment_required: parseArrayField(row.equipment_required),
                    training_location: parseArrayField(row.lugar_entrenamiento),
                    met: parseNumber(row.met),
                    ranking_score: parseNumber(row.ranking_score),
                    rating: parseNumber(row.rating),
                    rating_desc: row.rating_desc || null,
                });
            })
            .on('end', () => resolve())
            .on('error', (error: Error) => reject(error));
    });

    console.log(`📊 Parsed ${exercises.length} exercises from CSV\n`);
    console.log('Sample exercise:');
    console.log(JSON.stringify(exercises[0], null, 2));
    console.log('\n');

    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < exercises.length; i += batchSize) {
        const batch = exercises.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(exercises.length / batchSize);

        console.log(`📦 Inserting batch ${batchNumber}/${totalBatches} (${batch.length} exercises)...`);

        const { error } = await supabase.from('exercises').insert(batch);

        if (error) {
            console.error(`❌ Error in batch ${batchNumber}:`, error.message);
            errorCount += batch.length;
        } else {
            console.log(`✅ Batch ${batchNumber} inserted successfully`);
            successCount += batch.length;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n========================================');
    console.log('📊 IMPORT SUMMARY');
    console.log('========================================');
    console.log(`✅ Successfully imported: ${successCount} exercises`);
    if (errorCount > 0) {
        console.log(`❌ Failed to import: ${errorCount} exercises`);
    }
    console.log('========================================\n');

    const { count, error: countError } = await supabase
        .from('exercises')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('❌ Failed to verify import:', countError.message);
    } else {
        console.log(`✅ Verification: ${count} total exercises in database\n`);
    }

    console.log('🏋️  Analyzing equipment types...');
    const { data: equipmentData } = await supabase
        .from('exercises')
        .select('equipment_required')
        .not('equipment_required', 'is', null);

    if (equipmentData) {
        const equipmentSet = new Set<string>();
        equipmentData.forEach((ex: { equipment_required: string[] }) => {
            ex.equipment_required?.forEach(eq => equipmentSet.add(eq));
        });

        console.log('\nUnique equipment types found:');
        Array.from(equipmentSet).sort().forEach(eq => console.log(`  - ${eq}`));
    }

    console.log('\n✅ Import completed!\n');
}

importExercises().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
