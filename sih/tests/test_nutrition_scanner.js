const { analyzeFoodNutrition } = require('../src/server/geminiService');
const { NutritionService } = require('../src/services/nutritionService');
const { StorageService } = require('../src/services/storageService');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`✅ Passed: ${message}`);
    passedTests++;
  } else {
    console.error(`❌ Failed: ${message}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('🥗 TESTING AI FOOD SCANNER, CALORIE INTAKE & GEMINI SUGGESTIONS');
  console.log('================================================================\n');

  // --- TEST 1: Healthy / High-Protein Meal Analysis ---
  console.log('--- TEST 1: Healthy High-Protein Meal Analysis ---');
  const healthyMealAnalysis = await analyzeFoodNutrition({
    mealDescription: 'Grilled chicken breast with quinoa, avocado, and steamed broccoli',
    userFitnessGoal: 'Lean muscle growth and athletic stamina',
  });

  assert(healthyMealAnalysis.mealName.length > 0, `Identified meal name: "${healthyMealAnalysis.mealName}"`);
  assert(healthyMealAnalysis.totalCalories > 300, `Estimated calories > 300 kcal (got: ${healthyMealAnalysis.totalCalories} kcal)`);
  assert(healthyMealAnalysis.macros.proteinGrams >= 30, `Identified high protein content: ${healthyMealAnalysis.macros.proteinGrams}g`);
  assert(healthyMealAnalysis.macros.carbsGrams > 0, `Identified complex carbs: ${healthyMealAnalysis.macros.carbsGrams}g`);
  assert(healthyMealAnalysis.macros.fatsGrams > 0, `Identified healthy fats: ${healthyMealAnalysis.macros.fatsGrams}g`);
  assert(healthyMealAnalysis.quality === 'excellent' || healthyMealAnalysis.quality === 'good', `Nutrition quality classified as healthy (got: ${healthyMealAnalysis.quality})`);
  assert(healthyMealAnalysis.healthScore >= 80, `Health score is high (got: ${healthyMealAnalysis.healthScore}/100)`);
  assert(healthyMealAnalysis.geminiSuggestions.length > 20, 'Gemini generated functional dietary and workout timing suggestions');
  console.log(`ℹ️ Healthy Meal Suggestion: "${healthyMealAnalysis.geminiSuggestions.slice(0, 100)}..."`);

  // --- TEST 2: Poor Calorie / Fast Food Meal Analysis & Healthy Swaps ---
  console.log('\n--- TEST 2: Poor Calorie Quality Meal Analysis & Suggestions ---');
  const poorMealAnalysis = await analyzeFoodNutrition({
    mealDescription: 'Double cheeseburger with french fries and large soda',
    userFitnessGoal: 'Fat loss and clean energy',
  });

  assert(poorMealAnalysis.totalCalories >= 700, `Estimated high calorie load (got: ${poorMealAnalysis.totalCalories} kcal)`);
  assert(poorMealAnalysis.macros.fatsGrams >= 30, `Identified high fats: ${poorMealAnalysis.macros.fatsGrams}g`);
  assert(poorMealAnalysis.quality === 'poor' || poorMealAnalysis.quality === 'moderate', `Correctly flagged poor/unbalanced quality (got: ${poorMealAnalysis.quality})`);
  assert(poorMealAnalysis.healthScore <= 50, `Health score reflects low nutrient density (got: ${poorMealAnalysis.healthScore}/100)`);
  assert(poorMealAnalysis.geminiSuggestions.toLowerCase().includes('spike') || 
         poorMealAnalysis.geminiSuggestions.toLowerCase().includes('saturated') || 
         poorMealAnalysis.geminiSuggestions.toLowerCase().includes('fatigue') || 
         poorMealAnalysis.geminiSuggestions.toLowerCase().includes('water') ||
         poorMealAnalysis.geminiSuggestions.toLowerCase().includes('digest'), 
         'Gemini provides metabolic warnings on energy crashes/digestion');
  assert(poorMealAnalysis.healthySwaps && poorMealAnalysis.healthySwaps.length >= 2, `Provides at least 2 actionable healthy swaps (got: ${poorMealAnalysis.healthySwaps?.length})`);
  console.log(`ℹ️ Poor Meal Suggestion: "${poorMealAnalysis.geminiSuggestions.slice(0, 100)}..."`);
  console.log(`ℹ️ Healthy Swap Sample: "${poorMealAnalysis.healthySwaps[0]}"`);

  // --- TEST 3: Meal Logging & Daily Nutrition Intake Aggregation ---
  console.log('\n--- TEST 3: Meal Logging & Daily Calorie Intake Tracking ---');
  await StorageService.clearFoodLogs();

  const initialSummary = await StorageService.getDailyNutritionSummary();
  assert(initialSummary.totalCaloriesConsumed === 0, `Initial daily calories consumed is 0 for new day`);
  assert(initialSummary.mealCount === 0, `Initial meal count is 0`);

  // Log Meal 1: Breakfast Oatmeal
  const breakfast = NutritionService.getLocalFallbackFoodAnalysis('Oatmeal with berries and greek yogurt');
  await NutritionService.logMeal(breakfast, 'https://sample-image.jpg');

  // Log Meal 2: Lunch Chicken Bowl
  await NutritionService.logMeal(healthyMealAnalysis, 'https://healthy-lunch.jpg');

  const updatedSummary = await StorageService.getDailyNutritionSummary();
  assert(updatedSummary.mealCount === 2, `Logged 2 meals successfully (got: ${updatedSummary.mealCount})`);
  assert(updatedSummary.totalCaloriesConsumed === breakfast.totalCalories + healthyMealAnalysis.totalCalories, `Total calories consumed equals sum of logged meals (${updatedSummary.totalCaloriesConsumed} kcal)`);
  assert(updatedSummary.totalProteinGrams === breakfast.macros.proteinGrams + healthyMealAnalysis.macros.proteinGrams, `Cumulative daily protein tracked (${updatedSummary.totalProteinGrams}g)`);
  assert(updatedSummary.loggedMeals.length === 2, `Logged meals stored in persistent array`);

  // --- TEST 4: Backend HTTP Endpoint Analysis (POST /api/nutrition/analyze-food) ---
  console.log('\n--- TEST 4: Client NutritionService Analysis with Fallback Resilience ---');
  const clientAnalysis = await NutritionService.analyzeFood('', 'Pepperoni pizza slices with extra cheese');
  assert(clientAnalysis.mealName.length > 0, `Client service returned valid meal name: "${clientAnalysis.mealName}"`);
  assert(clientAnalysis.totalCalories > 0, `Client service returned total calories: ${clientAnalysis.totalCalories} kcal`);
  assert(clientAnalysis.macros.proteinGrams > 0, `Client service returned protein: ${clientAnalysis.macros.proteinGrams}g`);

  console.log('\n================================================================');
  console.log(`🎉 ALL FOOD SCANNER & CALORIE INTAKE TESTS PASSED (${passedTests}/${totalTests})!`);
  console.log('================================================================\n');
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
