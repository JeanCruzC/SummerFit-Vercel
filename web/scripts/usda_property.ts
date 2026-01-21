import { generateDayMealPlanFromDB } from '../lib/mealGenerator';
import { validateUSDAHard } from '../lib/usdaCompliance';

const ITERATIONS = parseInt(process.env.ITERATIONS || '500', 10); // set ITERATIONS=10000 for full run

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

async function run() {
  let failures = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    const kcal = randomInt(1400, 2400);
    const protein = randomInt(90, 170);
    const meals = [3, 4, 5][randomInt(0, 2)] as 3 | 4 | 5;
    try {
      const plan = await generateDayMealPlanFromDB(
        kcal,
        protein,
        meals,
        undefined,
        'balanced',
        [],
        [],
        undefined,
        { gender: 'male', age: 30, lifeStage: 'standard' }
      );
      const usda = validateUSDAHard(plan, kcal, 30);
      if (!usda.isValid) {
        failures++;
        console.error(`Fail ${i + 1}: ${usda.issues.join(' | ')}`);
      }
    } catch (err: any) {
      failures++;
      console.error(`Error ${i + 1}:`, err?.message || err);
    }
  }

  if (failures > 0) {
    console.error(`❌ Property test failed in ${failures}/${ITERATIONS} runs`);
    process.exit(1);
  } else {
    console.log(`✅ Property test passed (${ITERATIONS}/${ITERATIONS})`);
  }
}

run();
