const { GeminiVisionService } = require('../src/services/geminiVisionService');
const { generateWorkout, analyzeExerciseFrame } = require('../src/server/geminiService');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TESTING GEMINI VISION AI COACHING & KEYFRAME ENGINE');
  console.log('======================================================\n');

  // TEST 1: Keyframe Gating & Cooldown Logic
  console.log('--- TEST 1: Keyframe Gating & Eligibility Logic ---');

  // 1a. Idle frame with no errors should NOT trigger
  let check1 = GeminiVisionService.shouldAnalyzeFrame('IDLE', [], 0, 1000);
  assert(check1.eligible === false, 'Idle frame with no errors is not eligible');

  // 1b. Reaching BOTTOM of movement should trigger 'deepest_position'
  let check2 = GeminiVisionService.shouldAnalyzeFrame('BOTTOM', [], 2, 20000);
  assert(check2.eligible === true, 'BOTTOM phase is eligible');
  assert(check2.reason === 'deepest_position', 'Trigger reason is deepest_position');

  // 1c. Detected form error during descent should trigger 'form_issue'
  const mockError = {
    ruleId: 'knee_valgus',
    joint: 'knee',
    message: 'Knees caving inward',
    severity: 'high',
    timestamp: 35000,
  };
  let check3 = GeminiVisionService.shouldAnalyzeFrame('DESCENDING', [mockError], 3, 35000);
  assert(check3.eligible === true, 'Descending phase with form error is eligible');
  assert(check3.reason === 'form_issue', 'Trigger reason is form_issue');

  // 1d. Cooldown enforcement: subsequent call within 10s must be REJECTED
  // Note: analyzing a keyframe updates lastCallTimestamp
  await GeminiVisionService.analyzeKeyframe({
    exercise: 'Squats',
    repNumber: 3,
    localFormScore: 80,
    detectedIssues: ['Knees caving inward'],
    poseData: { kneeAngle: 85, hipAngle: 90 },
    keyframeReason: 'form_issue',
  }, 40000);

  let checkCooldown = GeminiVisionService.shouldAnalyzeFrame('BOTTOM', [], 4, 45000); // Only 5s after 40000
  assert(checkCooldown.eligible === false, 'Call within 10s cooldown window is blocked');

  let checkPostCooldown = GeminiVisionService.shouldAnalyzeFrame('BOTTOM', [], 4, 51000); // 11s after 40000
  assert(checkPostCooldown.eligible === true, 'Call after 10s cooldown window is allowed');

  // TEST 2: Local Fallback Coaching Response
  console.log('\n--- TEST 2: Local Vision Fallback Generation ---');
  const tip = GeminiVisionService.getLastCoachingTip();
  assert(tip !== null, 'Last coaching tip was recorded');
  assert(tip.assessment === 'needs_improvement', 'Assessment reflects detected error');
  assert(tip.text.length > 0, 'Coaching tip text is generated');
  console.log(`ℹ️ Sample Vision Fallback Tip: "${tip.text}"`);

  // TEST 3: Backend Vision Service Unit Logic
  console.log('\n--- TEST 3: Backend Vision Service Frame Analysis ---');

  // 3a. Clean Squat keyframe
  const squatVision = await analyzeExerciseFrame({
    exercise: 'Squats',
    repNumber: 5,
    localFormScore: 98,
    detectedIssues: [],
    poseData: { kneeAngle: 88, hipAngle: 92 },
    keyframeReason: 'deepest_position',
  });
  assert(squatVision.assessment === 'good', 'Clean squat assessed as good');
  assert(typeof squatVision.confidence === 'number' && squatVision.confidence > 0, 'Confidence score is positive number');
  assert(typeof squatVision.overallSuggestion === 'string' && squatVision.overallSuggestion.length > 0, 'Overall suggestion provided');
  console.log(`ℹ️ Squat Good Form Suggestion: "${squatVision.overallSuggestion}"`);

  // 3b. Pushup with flared elbows
  const pushupVision = await analyzeExerciseFrame({
    exercise: 'Pushups',
    repNumber: 3,
    localFormScore: 65,
    detectedIssues: ['Elbows flaring too wide (>75°)'],
    poseData: { elbowAngle: 85, elbowWidthRatio: 1.85 },
    keyframeReason: 'form_issue',
  });
  assert(pushupVision.assessment === 'needs_improvement', 'Flared elbows pushup assessed as needs_improvement');
  assert(pushupVision.issues.length >= 1, 'Contains issue detail');
  assert(pushupVision.overallSuggestion.toLowerCase().includes('elbow'), 'Suggestion specifically targets elbow alignment');
  console.log(`ℹ️ Pushup Correction Suggestion: "${pushupVision.overallSuggestion}"`);

  // 3c. Plank with sagging hips
  const plankVision = await analyzeExerciseFrame({
    exercise: 'Plank',
    repNumber: 1,
    localFormScore: 50,
    detectedIssues: ['Hips sagging below spine line'],
    poseData: { hipAngle: 155 },
    keyframeReason: 'form_issue',
  });
  assert(plankVision.assessment === 'needs_improvement', 'Plank sagging assessed as needs_improvement');
  assert(plankVision.overallSuggestion.toLowerCase().includes('hip'), 'Suggestion targets hip posture');
  console.log(`ℹ️ Plank Correction Suggestion: "${plankVision.overallSuggestion}"`);

  // TEST 4: Backend Daily Workout Generator
  console.log('\n--- TEST 4: Daily Mood AI Workout Generation ---');

  const highEnergyWorkout = await generateWorkout({
    mood: 'Motivated',
    energyLevel: 5,
    fitnessGoal: 'Muscle Gain & Strength',
  });
  assert(highEnergyWorkout.difficulty === 'intense', 'Energy 5 generates intense workout');
  assert(highEnergyWorkout.exercises.length >= 3, 'Contains structured exercises');
  assert(highEnergyWorkout.durationMinutes >= 25, 'Appropriate duration for high energy');
  console.log(`ℹ️ Generated High Energy Workout: "${highEnergyWorkout.workoutName}" (${highEnergyWorkout.exercises.length} exercises)`);

  const lowEnergyWorkout = await generateWorkout({
    mood: 'Tired',
    energyLevel: 1,
    fitnessGoal: 'Mobility & Recovery',
  });
  assert(lowEnergyWorkout.difficulty === 'light', 'Energy 1 generates light recovery workout');
  assert(lowEnergyWorkout.durationMinutes <= 20, 'Shorter duration for recovery');
  console.log(`ℹ️ Generated Low Energy Workout: "${lowEnergyWorkout.workoutName}" (${lowEnergyWorkout.exercises.length} exercises)`);

  console.log('\n======================================================');
  console.log('🎉 ALL GEMINI VISION & WORKOUT TESTS PASSED (16/16)');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
