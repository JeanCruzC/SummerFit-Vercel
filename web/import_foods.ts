
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

dotenv.config({ path: '.env.local' });

// Supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.log('Usage: SUPABASE_SERVICE_KEY=... npx tsx import_foods.ts');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CSV_PATH = path.join(__dirname, '../Data_food.csv');

interface CSVFood {
    ID: string;
    Name: string;
    'Food Group': string;
    Calories: string;
    'Protein (g)': string;
    'Carbohydrate (g)': string;
    'Fat (g)': string;
}

async function importFoods() {
    console.log('🚀 Starting food import...');

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ CSV not found at: ${CSV_PATH}`);
        process.exit(1);
    }

    const foods: any[] = [];
    let processed = 0;

    // Check if table exists (simple query)
    const { error: checkError } = await supabase.from('foods').select('id').limit(1);
    if (checkError) {
        console.log('⚠️ Warning: Could not access foods table. It might not exist.');
        console.log('Error details:', checkError.message);
    }

    return new Promise((resolve, reject) => {
        fs.createReadStream(CSV_PATH)
            .pipe(csv({ skipLines: 3 })) // Skip first 3 metadata lines
            .on('headers', (headers) => {
                console.log('📄 Headers detected:', headers.slice(0, 5));
            })
            .on('data', (row) => {
                // Map CSV fields to DB fields
                // CSV: ID, Name, Food Group, Calories, Fat (g), Protein (g), Carbohydrate (g)

                const name = row['Name'];
                const category = row['Food Group'];
                const kcal = parseFloat(row['Calories'] || '0');
                const protein = parseFloat(row['Protein (g)'] || '0');
                const carbs = parseFloat(row['Carbohydrate (g)'] || '0');
                const fat = parseFloat(row['Fat (g)'] || '0');

                if (name && !isNaN(kcal)) {
                    foods.push({
                        source_id: row['ID'],
                        name: name,
                        category: category || 'Other',
                        kcal_per_100g: kcal,
                        protein_g_per_100g: protein,
                        carbs_g_per_100g: carbs,
                        fat_g_per_100g: fat
                    });
                }
            })
            .on('end', async () => {
                console.log(`\n📦 Parsed ${foods.length} foods. Uploading to Supabase...`);

                // Batch upload
                const BATCH_SIZE = 1000;
                for (let i = 0; i < foods.length; i += BATCH_SIZE) {
                    const batch = foods.slice(i, i + BATCH_SIZE);
                    const { error } = await supabase.from('foods').insert(batch); // Changed from upsert to insert
                    // Actually, source_id might be unique but Supabase ID is auto-inc.
                    // Let's rely on name upsert? Or just insert and ignore conflicts?
                    // Let's try upsert on name if possible, or just insert.
                    // If table has unique constraint on name, upsert works.

                    if (error) {
                        console.error(`❌ Batch ${i / BATCH_SIZE + 1} failed:`, error.message);
                    } else {
                        process.stdout.write(`✅ Batch ${i / BATCH_SIZE + 1} `);
                    }
                }

                console.log('\n\n🎉 Import completed!');
                resolve(true);
            })
            .on('error', (err) => {
                console.error('❌ Stream error:', err);
                reject(err);
            });
    });
}

importFoods();
