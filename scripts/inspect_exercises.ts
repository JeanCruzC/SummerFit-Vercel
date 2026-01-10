
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function verify() {
    console.log("🔍 Verifying Smart Link Status...");

    // Check for specific linked exercise
    console.log("\n🔎 Checking 'abdominals-stretch-variation-one':");
    const { data: linked } = await supabase
        .from('exercises')
        .select('slug, title, exercise_media')
        .eq('slug', 'abdominals-stretch-variation-one')
        .single();

    if (linked) {
        console.log(`   Slug: ${linked.slug}`);
        const hasLink = linked.exercise_media && JSON.stringify(linked.exercise_media).includes('storage_link');
        console.log(`   Media Linked? ${hasLink ? '✅ YES' : '❌ NO'}`);
        if (hasLink) {
            console.log(`   URL: ${linked.exercise_media[0].url}`);
        }
    } else {
        console.log("   ❌ Reference exercise not found.");
    }
}

verify();
