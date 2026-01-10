
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function checkSlugMatch() {
    console.log("🔍 Searching for 'abdominals-stretch'...");

    // Search for titles or slugs containing keywords from the file we found
    // File: og-female-abdominals-stretch-variation-1-front.jpg
    const { data: exercises } = await supabase
        .from('exercises')
        .select('id, slug, title')
        .ilike('slug', '%abdominal%stretch%');

    if (exercises && exercises.length > 0) {
        console.log("✅ Found Matches:");
        exercises.forEach(ex => console.log(`   - Slug: ${ex.slug} | Title: ${ex.title}`));
    } else {
        console.log("❌ No matches found for '%abdominal%stretch%'.");
    }
}

checkSlugMatch();
