
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function inspectImagesTable() {
    console.log("🔍 Inspecting 'exercise_images' table schema and content...");

    // Fetch sample data
    const { data, error } = await supabase
        .from('exercise_images')
        .select('*')
        .range(0, 5);

    if (error) {
        console.error("❌ Error fetching:", error);
        return;
    }

    if (!data || data.length === 0) {
        console.log("⚠️ Table 'exercise_images' is empty.");
        return;
    }

    console.log(`✅ Found ${data.length} sample rows:`);
    console.log(JSON.stringify(data, null, 2));

    // Check relationship with exercises table
    // Let's assume there is an exercise_id column
    if (data[0].exercise_id) {
        console.log("\n🔗 Checking link for first row...");
        const { data: ex } = await supabase.from('exercises').select('slug, title').eq('id', data[0].exercise_id).single();
        if (ex) {
            console.log(`   Linked to exercise: ${ex.title} (${ex.slug})`);
        } else {
            console.log("   ❌ Linked exercise not found (broken link?)");
        }
    }
}

inspectImagesTable();
