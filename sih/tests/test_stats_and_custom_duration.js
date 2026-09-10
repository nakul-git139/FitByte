const { StorageService } = require('../src/services/storageService');
const { WorkoutAiService } = require('../src/services/workoutAiService');

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
  console.log('\n======================================================');
  console.log('🧪 TESTING DYNAMIC STATS & CUSTOM WORKOUT DURATION');
  console.log('======================================================\n');

  // --- TEST 1: First-time user stats (Zero history) ---
  console.log('--- TEST 1: First-Time User Baseline Stats ---');
  await StorageService.clearHistory();
  const initialStats = await StorageService.getDashboardStats();

  assert(initialStats.totalWorkouts === 0, `Total workouts is 0 for new user (got: ${initialStats.totalWorkouts})`);
  assert(initialStats.totalCalories === 0, `Total calories is 0 for new user (got: ${initialStats.totalCalories})`);
  assert(initialStats.dayStreak === 0, `Day streak is 0 for new user (got: ${initialStats.dayStreak})`);
  assert(initialStats.totalReps === 0, `Total reps is 0 for new user (got: ${initialStats.totalReps})`);
  assert(initialStats.averageFormScore === 0, `Average form score is 0 for new user (got: ${initialStats.averageFormScore})`);
  assert(initialStats.recentWorkouts.length === 0, `Recent workouts array is empty for new user`);
  assert(initialStats.weekDayActive.every((active) => active === false), `All weekday activity bars are false for new user`);

  // --- TEST 2: Single workout recorded ---
  console.log('\n--- TEST 2: Single Workout Session Stats ---');
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  await StorageService.saveWorkoutSession({
    id: 'session-1',
    date: todayStr,
    completedAt: now.toISOString(),
    workoutName: 'Bodyweight Squats',
    workoutType: 'Squats',
    exercises: [
      { name: 'Squats', plannedReps: 12, actualReps: 12, goodReps: 11, badReps: 1, formScore: 92 },
    ],
    plannedReps: 12,
    actualReps: 12,
    goodReps: 11,
    badReps: 1,
    formAccuracyScore: 92,
    durationSeconds: 180,
    activeSeconds: 150,
    caloriesBurned: 45,
    geminiObservations: [],
  });

  const singleSessionStats = await StorageService.getDashboardStats();
  assert(singleSessionStats.totalWorkouts === 1, `Total workouts is 1 (got: ${singleSessionStats.totalWorkouts})`);
  assert(singleSessionStats.totalCalories === 45, `Total calories matches workout calories: 45 (got: ${singleSessionStats.totalCalories})`);
  assert(singleSessionStats.dayStreak === 1, `Day streak is 1 for workout today (got: ${singleSessionStats.dayStreak})`);
  assert(singleSessionStats.totalReps === 12, `Total reps is 12 (got: ${singleSessionStats.totalReps})`);
  assert(singleSessionStats.averageFormScore === 92, `Avg form score is 92% (got: ${singleSessionStats.averageFormScore})`);
  
  const currentDayIndex = (now.getDay() + 6) % 7;
  assert(singleSessionStats.weekDayActive[currentDayIndex] === true, `Current weekday (${currentDayIndex}) is marked active in weekly chart`);

  // --- TEST 3: Multi-day Consecutive Streak Calculation ---
  console.log('\n--- TEST 3: Multi-Day Streak Calculation ---');
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const twoDaysAgo = new Date(now);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;

  await StorageService.saveWorkoutSession({
    id: 'session-2',
    date: yesterdayStr,
    completedAt: yesterday.toISOString(),
    workoutName: 'Pushups Session',
    workoutType: 'Pushups',
    exercises: [],
    plannedReps: 10,
    actualReps: 10,
    goodReps: 9,
    badReps: 1,
    formAccuracyScore: 90,
    durationSeconds: 120,
    activeSeconds: 100,
    caloriesBurned: 30,
  });

  await StorageService.saveWorkoutSession({
    id: 'session-3',
    date: twoDaysAgoStr,
    completedAt: twoDaysAgo.toISOString(),
    workoutName: 'Plank Hold',
    workoutType: 'Plank',
    exercises: [],
    plannedReps: 30,
    actualReps: 30,
    goodReps: 30,
    badReps: 0,
    formAccuracyScore: 96,
    durationSeconds: 90,
    activeSeconds: 60,
    caloriesBurned: 20,
  });

  const threeDayStats = await StorageService.getDashboardStats();
  assert(threeDayStats.totalWorkouts === 3, `Total workouts is 3 (got: ${threeDayStats.totalWorkouts})`);
  assert(threeDayStats.totalCalories === 95, `Total calories is 45+30+20=95 (got: ${threeDayStats.totalCalories})`);
  assert(threeDayStats.dayStreak === 3, `Consecutive day streak is 3 (got: ${threeDayStats.dayStreak})`);
  assert(threeDayStats.averageFormScore === Math.round((92 + 90 + 96) / 3), `Average form score correctly averaged across 3 sessions (got: ${threeDayStats.averageFormScore}%)`);

  // --- TEST 4: Custom Duration Workout Generation ---
  console.log('\n--- TEST 4: Custom Duration AI & Fallback Routines ---');

  // Test 4a: Express custom duration (10 min)
  const expressWorkout = await WorkoutAiService.generateDailyWorkout({
    mood: 'Great',
    energyLevel: 4,
    durationMinutes: 10,
    timestamp: new Date(),
  });
  assert(expressWorkout.durationMinutes === 10, `Express workout duration is 10 min (got: ${expressWorkout.durationMinutes})`);
  assert(expressWorkout.exercises.length >= 2, `Express workout has appropriate exercise count (got: ${expressWorkout.exercises.length})`);
  console.log(`ℹ️ 10-Min Plan: "${expressWorkout.workoutName}" (${expressWorkout.exercises.length} exercises)`);

  // Test 4b: Custom duration (35 min)
  const mediumCustomWorkout = await WorkoutAiService.generateDailyWorkout({
    mood: 'Motivated',
    energyLevel: 5,
    durationMinutes: 35,
    timestamp: new Date(),
  });
  assert(mediumCustomWorkout.durationMinutes === 35, `Custom 35-min workout duration is 35 (got: ${mediumCustomWorkout.durationMinutes})`);
  assert(mediumCustomWorkout.exercises.length >= 3, `35-min workout has rich exercise volume (got: ${mediumCustomWorkout.exercises.length})`);
  console.log(`ℹ️ 35-Min Plan: "${mediumCustomWorkout.workoutName}" (${mediumCustomWorkout.exercises.length} exercises)`);

  // Test 4c: Long custom duration (60 min)
  const longCustomWorkout = await WorkoutAiService.generateDailyWorkout({
    mood: 'Great',
    energyLevel: 4,
    durationMinutes: 60,
    timestamp: new Date(),
  });
  assert(longCustomWorkout.durationMinutes === 60, `Custom 60-min workout duration is 60 (got: ${longCustomWorkout.durationMinutes})`);
  console.log(`ℹ️ 60-Min Plan: "${longCustomWorkout.workoutName}" (${longCustomWorkout.exercises.length} exercises)`);

  console.log('\n======================================================');
  console.log(`🎉 STATS & CUSTOM DURATION TESTS PASSED (${passedTests}/${totalTests})!`);
  console.log('======================================================\n');
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
