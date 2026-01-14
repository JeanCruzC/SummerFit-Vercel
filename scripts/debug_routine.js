
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const envPath = path.resolve(__dirname, '../web/.env.local');

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        if (line.includes('=')) {
            const [key, val] = line.split('=');
            process.env[key.trim()] = val.trim();
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function checkWorkoutPlans() {
    console.log("--- Checking workout_plans for Daniela ---");

    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('user_id, is_public_routine')
        .ilike('full_name', '%Daniela Idrogo%')
        .single();

    if (!profiles) return console.log("User not found");

    console.log("is_public_routine:", profiles.is_public_routine);

    const { data: plans } = await supabaseAdmin
        .from('workout_plans')
        .select('*')
        .eq('user_id', profiles.user_id)
        .eq('is_active', true);

    console.log(`Found ${plans?.length || 0} active workout_plans`);

    if (plans && plans.length > 0) {
        const p = plans[0];
        console.log("Plan:", p.name, "- ID:", p.id, "- Created:", p.created_at);
        console.log("source_routine_id:", p.source_routine_id);

        // Check exercises
        const { count } = await supabaseAdmin
            .from('workout_plan_exercises')
            .select('*', { count: 'exact', head: true })
            .eq('workout_plan_id', p.id);
        console.log("workout_plan_exercises count:", count);
    }
}

checkWorkoutPlans();
