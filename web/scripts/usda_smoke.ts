import { generateDayMealPlanFromDB } from '../lib/mealGenerator';
import { validateUSDAHard } from '../lib/usdaCompliance';

async function run() {
  const trials = 10;
  let failures = 0;
  for (let i = 0; i < trials; i++) {
    try {
      const plan = await generateDayMealPlanFromDB(
        1800,
        130,
        3,
        undefined,
        'balanced',
        [],
        [],
        undefined,
        { gender: 'male', age: 30, lifeStage: 'standard' }
      );
      const usda = validateUSDAHard(plan, 1800, 30);
      if (!usda.isValid) {
        failures++;
        console.error(`Trial ${i + 1} failed: ${usda.issues.join(' | ')}`);
      } else {
        console.log(`Trial ${i + 1} ok: ${plan.totals.kcal} kcal, ${plan.totals.protein}g P`);
      }
    } catch (err: any) {
      failures++;
      console.error(`Trial ${i + 1} error`, err?.message || err);
    }
  }

  if (failures > 0) {
    console.error(`❌ USDA smoke test failed in ${failures}/${trials} trials`);
    process.exit(1);
  } else {
    console.log(`✅ USDA smoke test passed (${trials}/${trials})`);
  }
}

run();
