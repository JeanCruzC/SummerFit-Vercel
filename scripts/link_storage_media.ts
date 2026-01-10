
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Heuristic to normalize strings for matching
// e.g. "abdominals-stretch-variation-one" -> "abdominalsstretchvariation1"
// e.g. "og-female-abdominals-stretch-variation-1-front.jpg" -> "abdominalsstretchvariation1"
function normalize(str: string): string {
    return str.toLowerCase()
        .replace(/og-female-/g, '') // Remove MuscleWiki prefix
        .replace(/og-male-/g, '')
        .replace(/-front|-side/g, '') // Remove view angle
        .replace(/\.jpg|\.png|\.webp/g, '') // Remove extension
        .replace(/-/g, '') // Remove dashes
        .replace(/one/g, '1') // Normalize numbers
        .replace(/two/g, '2')
        .replace(/three/g, '3')
        .replace(/four/g, '4')
        .replace(/five/g, '5');
}

async function linkMedia() {
    console.log('🚀 Starting Smart Storage Link...');

    // 1. Fetch all exercises (Paginated)
    console.log('📦 Fetching exercises...');
    let exercises: { id: number; slug: string; title: string }[] = [];
    let exOffset = 0;
    while (true) {
        const { data, error } = await supabase
            .from('exercises')
            .select('id, slug, title')
            .order('id')
            .range(exOffset, exOffset + 999);

        if (error) {
            console.error('❌ Error fetching exercises:', error);
            return;
        }
        if (!data || data.length === 0) break;

        exercises = [...exercises, ...data];
        exOffset += 1000;
        console.log(`   Fetched ${exercises.length} exercises so far...`);
    }

    // 2. Fetch all files in storage (Bucket: exercises, Folder: images)
    // We'll fetch in batches of 1000
    console.log('📂 Fetching file list from Storage...');
    let allFiles: { name: string; url: string }[] = [];
    let offset = 0;
    const LIMIT = 1000;
    let keepFetching = true;

    while (keepFetching) {
        const { data: files, error: fileError } = await supabase
            .storage
            .from('exercises')
            .list('images', { limit: LIMIT, offset: offset });

        if (fileError) {
            console.error('❌ Error listing files:', fileError);
            break;
        }

        if (!files || files.length === 0) {
            keepFetching = false;
        } else {
            console.log(`   Fetched ${files.length} files (Offset: ${offset})...`);

            // Map to useful structure
            const batch = files.map(f => ({
                name: f.name,
                url: `${supabaseUrl}/storage/v1/object/public/exercises/images/${f.name}`
            }));

            allFiles = [...allFiles, ...batch];
            offset += LIMIT;

            if (files.length < LIMIT) keepFetching = false;
        }
    }
    console.log(`✅ Total files found: ${allFiles.length}`);

    // 3. Match and Update
    console.log('🔗 Matching and Updating...');
    let updatedCount = 0;
    let skippedCount = 0;

    // Create a lookup map for normalized file names to expedite matching
    // Key: Normalized String, Value: URL
    const fileMap = new Map<string, string>();
    allFiles.forEach(f => fileMap.set(normalize(f.name), f.url));

    for (const ex of exercises) {
        const normSlug = normalize(ex.slug);

        // Try to find a match
        // Note: MuscleWiki often has slightly different names, but we try our best.
        // Files usually have "og-female-" prefix which we removed in normalize()

        const matchUrl = fileMap.get(normSlug);

        if (matchUrl) {
            // Found a match! Update DB.
            const mediaObject = [{
                type: 'image',
                url: matchUrl,
                order: 1,
                source: 'storage_link'
            }];

            const { error: updateError } = await supabase
                .from('exercises')
                .update({ exercise_media: mediaObject })
                .eq('id', ex.id);

            if (updateError) {
                console.error(`   ❌ Failed to update ${ex.slug}:`, updateError.message);
            } else {
                updatedCount++;
                if (updatedCount % 50 === 0) process.stdout.write('.');
            }
        } else {
            skippedCount++;
            // Optional: Log misses if debug needed
            // console.log(`   ⚠️ No match for: ${ex.slug} (Norm: ${normSlug})`);
        }
    }

    console.log(`\n\n✨ Process Complete!`);
    console.log(`✅ Linked: ${updatedCount} exercises`);
    console.log(`⚠️ Skipped: ${skippedCount} (No matching file found)`);
}

linkMedia();
