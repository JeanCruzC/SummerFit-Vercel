
const { generateDayMealPlanFromDB } = await import('../web/lib/mealGenerator');
import * as dotenv from 'dotenv';
import { resolve } from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../web/.env.local') });

// Polyfill Worker for Node.js environment (glpk.js needs it)
import { Worker } from 'worker_threads';
if (typeof global.Worker === 'undefined') {
    (global as any).Worker = Worker;
}

async function run() {
    console.log('🧪 Testing Meal Generator with Categorization Fix...');
    try {
        const plan = await generateDayMealPlanFromDB(
            1524,
            135,
            3,
            [],
            'balanced',
            [],
            []
        );

        console.log('\n✅ Plan Generated!');
        console.log(`Totals: ${plan.totals.kcal} kcal, ${plan.totals.protein}g Protein`);

        console.log('\n🍽️  Menu Sample:');
        plan.meals.forEach(m => {
            console.log(`\n[${m.type.toUpperCase()}]`);
            m.items.forEach(i => console.log(` - ${i.portion_g}g ${i.food.name_es} (${i.food.category})`));
        });

    } catch (e) {
        console.error('❌ Error:', e);
    }
}

run();
