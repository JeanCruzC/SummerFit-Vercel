
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
const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // Must use Service Key for uploads bypassing RLS if needed

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or SERVICE_KEY (required for storage uploads)');
    console.error('Please add SUPABASE_SERVICE_KEY to web/.env.local');
    // Attempt fallback relative to script location for debugging if needed, but best to crash if missing
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_DIR = path.resolve(__dirname, '../musclewiki_complete_data');
const BUCKET = 'exercises';

async function uploadDirectory(subDir, contentTypePrefix) {
    const dirPath = path.join(BASE_DIR, subDir);
    if (!fs.existsSync(dirPath)) {
        console.error(`❌ Directory not found: ${dirPath}`);
        return;
    }

    const files = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
    console.log(`📂 Found ${files.length} files in ${subDir}`);

    const BATCH_SIZE = 5; // Concurrency limit
    let uploadedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (filename) => {
            const filePath = path.join(dirPath, filename);
            const fileBuffer = fs.readFileSync(filePath);
            const storagePath = `${subDir}/${filename}`;
            const mimeType = `${contentTypePrefix}/${path.extname(filename).substring(1)}`;

            try {
                // Try upload
                const { error: uploadError } = await supabase.storage
                    .from(BUCKET)
                    .upload(storagePath, fileBuffer, {
                        contentType: mimeType,
                        upsert: false // Don't overwrite to save time if run multiple times
                    });

                if (uploadError) {
                    if (uploadError.message.includes('Duplicate') || uploadError.message === 'The resource already exists' || uploadError.statusCode === '409') {
                        skippedCount++;
                    } else {
                        console.error(`❌ Failed ${filename}: ${uploadError.message}`);
                        errorCount++;
                    }
                } else {
                    console.log(`✅ Uploaded: ${filename}`);
                    uploadedCount++;
                }
            } catch (err) {
                console.error(`❌ Error ${filename}:`, err);
                errorCount++;
            }
        }));

        // Progress log
        if ((i + BATCH_SIZE) % 100 === 0) {
            console.log(`📊 Progress ${subDir}: ${i + BATCH_SIZE}/${files.length} (Up: ${uploadedCount}, Skip: ${skippedCount}, Err: ${errorCount})`);
        }
    }

    console.log(`\n✨ Finished ${subDir}: ${uploadedCount} uploaded, ${skippedCount} skipped, ${errorCount} errors.\n`);
}

async function main() {
    console.log('🚀 Starting Media Upload...');

    // Upload Images
    await uploadDirectory('images', 'image');

    // Upload Videos
    await uploadDirectory('videos', 'video');

    console.log('👋 All uploads completed!');
}

main().catch(console.error);
