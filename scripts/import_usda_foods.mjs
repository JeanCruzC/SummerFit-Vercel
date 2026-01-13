/**
 * USDA FoodData Central Import Script
 * 
 * Downloads SR Legacy and Foundation Foods data from USDA and imports to Supabase.
 * 
 * Usage:
 *   node import_usda_foods.mjs
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { Extract } from 'unzip-stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../web/.env.local') });

// Supabase config
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase credentials in .env.local');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// USDA Data URLs - These are the official download links
const USDA_DATA_DIR = path.join(__dirname, '../data/usda');
const SR_LEGACY_URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip';
const FOUNDATION_URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_json_2024-10-31.zip';

// Nutrient ID mapping from USDA to our schema
const NUTRIENT_MAP = {
    1008: 'kcal_per_100g',           // Energy (kcal)
    1003: 'protein_g_per_100g',       // Protein
    1005: 'carbs_g_per_100g',         // Carbohydrate, by difference
    1004: 'fat_g_per_100g',           // Total lipid (fat)
    1079: 'fiber_g_per_100g',         // Fiber, total dietary
    2000: 'sugar_g_per_100g',         // Sugars, total
    1093: 'sodium_mg_per_100g',       // Sodium, Na
    1253: 'cholesterol_mg_per_100g',  // Cholesterol
    1258: 'saturated_fat_g_per_100g', // Fatty acids, total saturated
    1092: 'potassium_mg_per_100g',    // Potassium, K
    1087: 'calcium_mg_per_100g',      // Calcium, Ca
    1089: 'iron_mg_per_100g',         // Iron, Fe
    1104: 'vitamin_a_iu_per_100g',    // Vitamin A, IU
    1162: 'vitamin_c_mg_per_100g',    // Vitamin C, total ascorbic acid
    1110: 'vitamin_d_iu_per_100g',    // Vitamin D (D2 + D3), IU
};

/**
 * Download a file from URL
 */
async function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        console.log(`📥 Downloading: ${path.basename(destPath)}...`);

        const file = createWriteStream(destPath);

        const request = https.get(url, (response) => {
            // Handle redirects
            if (response.statusCode === 301 || response.statusCode === 302) {
                downloadFile(response.headers.location, destPath)
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download: ${response.statusCode}`));
                return;
            }

            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;

            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
                process.stdout.write(`\r   Progress: ${percent}%`);
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log('\n   ✅ Download complete');
                resolve(destPath);
            });
        });

        request.on('error', (err) => {
            fs.unlink(destPath, () => { });
            reject(err);
        });
    });
}

/**
 * Extract ZIP file
 */
async function extractZip(zipPath, destDir) {
    console.log(`📦 Extracting: ${path.basename(zipPath)}...`);

    return new Promise((resolve, reject) => {
        createReadStream(zipPath)
            .pipe(Extract({ path: destDir }))
            .on('close', () => {
                console.log('   ✅ Extraction complete');
                resolve(destDir);
            })
            .on('error', reject);
    });
}

/**
 * Find JSON file in extracted directory
 */
function findJsonFile(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            const found = findJsonFile(fullPath);
            if (found) return found;
        } else if (file.endsWith('.json') && !file.startsWith('.')) {
            return fullPath;
        }
    }
    return null;
}

/**
 * Parse USDA food data and extract nutrients
 */
function parseFoodData(food, dataSource) {
    const nutrients = {};

    // Initialize all nutrient fields with 0
    for (const field of Object.values(NUTRIENT_MAP)) {
        nutrients[field] = 0;
    }

    // Extract nutrients from USDA format
    const foodNutrients = food.foodNutrients || [];
    for (const fn of foodNutrients) {
        const nutrientId = fn.nutrient?.id || fn.nutrientId;
        const amount = fn.amount ?? fn.value ?? 0;

        if (nutrientId && NUTRIENT_MAP[nutrientId]) {
            nutrients[NUTRIENT_MAP[nutrientId]] = parseFloat(amount) || 0;
        }
    }

    // Get serving info if available
    let servingSize = null;
    let servingDescription = null;

    if (food.foodPortions && food.foodPortions.length > 0) {
        const portion = food.foodPortions[0];
        servingSize = portion.gramWeight || null;
        servingDescription = portion.portionDescription || portion.modifier || null;
    }

    return {
        fdc_id: food.fdcId,
        source_id: `usda_${food.fdcId}`,
        name: food.description || food.foodDescription || 'Unknown',
        category: food.foodCategory?.description || food.wweiaFoodCategory?.wweiaFoodCategoryDescription || null,
        ...nutrients,
        data_source: dataSource,
        serving_size_g: servingSize,
        serving_description: servingDescription,
        brand_name: food.brandOwner || food.brandName || null,
        ingredients: food.ingredients || null,
    };
}

/**
 * Batch upsert foods to Supabase
 */
async function upsertFoods(foods, batchSize = 500) {
    console.log(`\n📤 Uploading ${foods.length} foods to Supabase...`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < foods.length; i += batchSize) {
        const batch = foods.slice(i, i + batchSize);
        const batchNum = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(foods.length / batchSize);

        try {
            const { error } = await supabase
                .from('foods')
                .upsert(batch, {
                    onConflict: 'fdc_id',
                    ignoreDuplicates: false
                });

            if (error) {
                console.error(`\n   ❌ Batch ${batchNum}/${totalBatches} failed:`, error.message);
                errorCount += batch.length;
            } else {
                process.stdout.write(`\r   ✅ Batch ${batchNum}/${totalBatches} uploaded`);
                successCount += batch.length;
            }
        } catch (err) {
            console.error(`\n   ❌ Batch ${batchNum}/${totalBatches} exception:`, err.message);
            errorCount += batch.length;
        }
    }

    console.log(`\n\n📊 Upload Summary:`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    return { successCount, errorCount };
}

/**
 * Process a USDA dataset
 */
async function processDataset(url, dataSource) {
    const zipName = path.basename(url);
    const zipPath = path.join(USDA_DATA_DIR, zipName);
    const extractDir = path.join(USDA_DATA_DIR, dataSource);

    // Create data directory if it doesn't exist
    if (!fs.existsSync(USDA_DATA_DIR)) {
        fs.mkdirSync(USDA_DATA_DIR, { recursive: true });
    }

    // Download if not already present
    if (!fs.existsSync(zipPath)) {
        await downloadFile(url, zipPath);
    } else {
        console.log(`📂 Using cached: ${zipName}`);
    }

    // Extract if not already done
    if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
        await extractZip(zipPath, extractDir);
    } else {
        console.log(`📂 Using extracted: ${dataSource}`);
    }

    // Find and parse JSON
    const jsonFile = findJsonFile(extractDir);
    if (!jsonFile) {
        throw new Error(`No JSON file found in ${extractDir}`);
    }

    console.log(`📄 Parsing: ${path.basename(jsonFile)}...`);
    const rawData = fs.readFileSync(jsonFile, 'utf-8');
    const data = JSON.parse(rawData);

    // Handle different USDA formats
    let foods = [];
    if (data.SRLegacyFoods) {
        foods = data.SRLegacyFoods;
    } else if (data.FoundationFoods) {
        foods = data.FoundationFoods;
    } else if (Array.isArray(data)) {
        foods = data;
    } else {
        // Try to find foods array in the data
        for (const key of Object.keys(data)) {
            if (Array.isArray(data[key]) && data[key].length > 0 && data[key][0].fdcId) {
                foods = data[key];
                break;
            }
        }
    }

    console.log(`   Found ${foods.length} foods in ${dataSource}`);

    // Parse all foods
    const parsedFoods = foods.map(food => parseFoodData(food, dataSource));

    return parsedFoods;
}

/**
 * Main import function
 */
async function main() {
    console.log('🚀 USDA FoodData Central Import');
    console.log('================================\n');

    try {
        // Test Supabase connection
        const { error: testError } = await supabase.from('foods').select('id').limit(1);
        if (testError) {
            console.error('❌ Cannot connect to Supabase:', testError.message);
            process.exit(1);
        }
        console.log('✅ Supabase connection verified\n');

        // Process SR Legacy dataset
        console.log('📥 Processing SR Legacy Foods...');
        console.log('─'.repeat(40));
        const srFoods = await processDataset(SR_LEGACY_URL, 'usda_sr');

        // Process Foundation Foods dataset
        console.log('\n📥 Processing Foundation Foods...');
        console.log('─'.repeat(40));
        const foundationFoods = await processDataset(FOUNDATION_URL, 'usda_foundation');

        // Combine all foods
        const allFoods = [...srFoods, ...foundationFoods];
        console.log(`\n📊 Total foods to import: ${allFoods.length}`);

        // Upsert to Supabase
        const result = await upsertFoods(allFoods);

        // Final verification
        const { count, error: countError } = await supabase
            .from('foods')
            .select('*', { count: 'exact', head: true })
            .like('data_source', 'usda%');

        if (!countError) {
            console.log(`\n🎉 Import Complete!`);
            console.log(`   Total USDA foods in database: ${count}`);
        }

    } catch (err) {
        console.error('\n❌ Import failed:', err.message);
        process.exit(1);
    }
}

// Run the import
main();
