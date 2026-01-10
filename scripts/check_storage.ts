
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from web/.env.local
dotenv.config({ path: path.resolve(__dirname, '../web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing credentials in web/.env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStorage() {
    console.log('🔍 Checking Supabase Storage...');

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('❌ Error listing buckets:', error.message);
        return;
    }

    if (!buckets || buckets.length === 0) {
        console.log('⚠️ No buckets found.');
        return;
    }

    console.log(`✅ Found ${buckets.length} buckets:`);

    for (const bucket of buckets) {
        console.log(`\n📂 Bucket: [${bucket.name}] (Public: ${bucket.public})`);

        // List top 20 files in images folder
        const { data: files } = await supabase.storage.from(bucket.name).list('images', {
            limit: 20,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' },
        });

        if (files && files.length > 0) {
            console.log('   📄 Sample files in /images:');
            files.forEach(f => console.log(`     - images/${f.name} (${(f.metadata?.size / 1024).toFixed(2)} KB)`));
        } else {
            console.log('   (No files in /images)');
        }
    }
}

checkStorage();
