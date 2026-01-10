
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function listTables() {
    console.log("🔍 Listing all tables in 'public' schema...");

    // This query fetches table names from the information_schema
    // Note: This often requires postgres permissions, but we'll try via rpc or just guessing if this fails.
    // Since we don't have direct SQL access, we'll try a known trick: list generic types?
    // Actually, Supabase JS client doesn't support 'show tables' directly without a function.

    // Alternative: Try to select from likely candidates
    const candidates = ['exercise_images', 'media', 'exercise_media', 'images', 'assets'];

    for (const table of candidates) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (!error) {
            console.log(`✅ Table '${table}' exists! (Rows: ${count})`);
        } else {
            console.log(`❌ Table '${table}' not found (Code: ${error.code})`);
        }
    }

    // Check content of exercise_media for a non-seeded row
    console.log("\n🔍 Checking exercise_media content for ID 9134:");
    const { data } = await supabase.from('exercises').select('id, slug, exercise_media').eq('id', 9134).single();
    console.log(JSON.stringify(data, null, 2));
}

listTables();
