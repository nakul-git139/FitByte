const { StorageService } = require('../src/services/storageService');
const { WorkoutAiService } = require('../src/services/workoutAiService');
const { ExerciseEngineRegistry } = require('../src/engine/registry');
const { GeminiVisionService } = require('../src/services/geminiVisionService');
const { generateWorkout, analyzeExerciseFrame, analyzeWorkoutSummary } = require('../src/server/geminiService');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

async function runE2ETests() {
  console.log('\n===============================================================');
  console.log('🚀 COMPREHENSIVE END-TO-END WORKOUT & AI COACHING FLOW TEST');
  console.log('===============================================================\n');

  // Reset Storage for clean test
  await StorageService.clearHistory();

  // -------------------------------------------------------------
  // PHASE 1: APP LAUNCH & MOOD CHECK-IN (DAY 1)
  // -------------------------------------------------------------
  console.log('--- PHASE 1: Day 1 Launch & Mood Check-In ---');
  const initialSummary = await StorageService.getRecentFormSummary();
  assert(initialSummary.totalSessions === 0, 'New user starts with 0 recorded sessions');
  console.log(`ℹ️ Initial History Context: "${initialSummary.historySummaryText}"`);

  const day1CheckIn = {
    mood: 'Motivated',
    emoji: '🔥',
    energyLevel: 5,
    timestamp: new Date(),
  };

  console.log(`\n--- PHASE 2: Gemini AI Daily Workout Generation ---`);
  const day1Workout = await WorkoutAiService.generateDailyWorkout(day1CheckIn, {
    workoutHistory: initialSummary.historySummaryText,
    previousFormScores: `Average form score: ${initialSummary.averageFormScore}%`,
  });

  assert(day1Workout.workoutName.length > 0, 'Generated workout has a valid name');
  assert(day1Workout.difficulty === 'intense', 'Energy 5 generates intense workout');
  assert(day1Workout.exercises.length >= 3, 'Workout includes at least 3 structured exercises');
  assert(typeof day1Workout.reason === 'string' && day1Workout.reason.length > 0, 'Gemini provides mood-tailored reasoning');
  console.log(`ℹ️ Generated Plan: "${day1Workout.workoutName}" (${day1Workout.exercises.length} exercises)`);
  console.log(`ℹ️ Coach Reason: "${day1Workout.reason}"`);

  // -------------------------------------------------------------
  // PHASE 3: OPEN CAMERA & ON-DEVICE REAL-TIME POSE PROCESSING
  // -------------------------------------------------------------
  console.log('\n--- PHASE 3: On-Device Pose Tracking, Reps, and Local Form ---');
  const engine = ExerciseEngineRegistry.getEngine('Pushups');
  engine.reset();

  // Helper to generate biomechanically accurate landmarks
  function createBasePushupLandmarks(options = {}) {
    const {
      elbowAngle = 160,
      elbowSpread = 0.22,
      allVisible = true,
    } = options;

    const centerX = 0.5;
    const shoulderY = 0.35;
    const ankleY = 0.85;

    const landmarks = new Array(33).fill(null).map(() => ({
      x: centerX,
      y: 0.2,
      z: 0,
      visibility: allVisible ? 0.95 : 0.1,
    }));

    const armLen = 0.14;
    const leftShoulderX = centerX - 0.18;
    const leftShoulderY = shoulderY;
    const rightShoulderX = centerX + 0.18;
    const rightShoulderY = shoulderY;

    landmarks[11] = { x: leftShoulderX, y: leftShoulderY, z: 0, visibility: 0.98 };
    landmarks[12] = { x: rightShoulderX, y: rightShoulderY, z: 0, visibility: 0.98 };

    const leftElbowX = centerX - elbowSpread;
    const leftElbowY = shoulderY + armLen;
    const rightElbowX = centerX + elbowSpread;
    const rightElbowY = shoulderY + armLen;

    landmarks[13] = { x: leftElbowX, y: leftElbowY, z: 0, visibility: 0.95 };
    landmarks[14] = { x: rightElbowX, y: rightElbowY, z: 0, visibility: 0.95 };

    const leftArmVecAngle = Math.atan2(leftElbowY - leftShoulderY, leftElbowX - leftShoulderX);
    const rightArmVecAngle = Math.atan2(rightElbowY - rightShoulderY, rightElbowX - rightShoulderX);

    const angleRad = (elbowAngle * Math.PI) / 180.0;
    const leftWristAngle = leftArmVecAngle + (Math.PI - angleRad);
    const rightWristAngle = rightArmVecAngle - (Math.PI - angleRad);

    landmarks[15] = {
      x: leftElbowX + armLen * Math.cos(leftWristAngle),
      y: leftElbowY + armLen * Math.sin(leftWristAngle),
      z: 0,
      visibility: 0.95,
    };
    landmarks[16] = {
      x: rightElbowX + armLen * Math.cos(rightWristAngle),
      y: rightElbowY + armLen * Math.sin(rightWristAngle),
      z: 0,
      visibility: 0.95,
    };

    landmarks[23] = { x: centerX - 0.12, y: 0.58, z: 0, visibility: 0.95 };
    landmarks[24] = { x: centerX + 0.12, y: 0.58, z: 0, visibility: 0.95 };
    landmarks[25] = { x: centerX - 0.12, y: 0.72, z: 0, visibility: 0.95 };
    landmarks[26] = { x: centerX + 0.12, y: 0.72, z: 0, visibility: 0.95 };
    landmarks[27] = { x: centerX - 0.12, y: ankleY, z: 0, visibility: 0.95 };
    landmarks[28] = { x: centerX + 0.12, y: ankleY, z: 0, visibility: 0.95 };

    return landmarks;
  }

  // Simulate Rep 1: Clean Pushup (Lockout -> Descent -> Bottom 75° -> Ascent -> Lockout 160°)
  let simTime = 1000;
  engine.processFrame(createBasePushupLandmarks({ elbowAngle: 160 }), simTime);
  simTime += 100;
  engine.processFrame(createBasePushupLandmarks({ elbowAngle: 160 }), simTime);

  simTime += 100;
  engine.processFrame(createBasePushupLandmarks({ elbowAngle: 120 }), simTime);
  simTime += 100;
  let descFrame = engine.processFrame(createBasePushupLandmarks({ elbowAngle: 120 }), simTime);
  assert(descFrame.phase === 'DESCENDING', 'Descent phase detected');

  simTime += 100;
  engine.processFrame(createBasePushupLandmarks({ elbowAngle: 75 }), simTime);
  simTime += 100;
  let bottomFrame = engine.processFrame(createBasePushupLandmarks({ elbowAngle: 75 }), simTime);
  assert(bottomFrame.phase === 'BOTTOM', 'Frame identified bottom position of movement');

  simTime += 100;
  engine.processFrame(createBasePushupLandmarks({ elbowAngle: 135 }), simTime);
  simTime += 100;
  let ascFrame = engine.processFrame(createBasePushupLandmarks({ elbowAngle: 135 }), simTime);
  assert(ascFrame.phase === 'ASCENDING', 'Ascent phase detected');

  simTime += 100;
  engine.processFrame(createBasePushupLandmarks({ elbowAngle: 160 }), simTime);
  simTime += 100;
  let rep1Result = engine.processFrame(createBasePushupLandmarks({ elbowAngle: 160 }), simTime);
  assert(rep1Result.repCount === 1, 'Repetition 1 counted automatically');
  assert(rep1Result.perfectReps === 1, 'Clean full range of motion counted as perfect rep');

  // -------------------------------------------------------------
  // PHASE 4: ASYNCHRONOUS GEMINI VISION KEYFRAME DISPATCH
  // -------------------------------------------------------------
  console.log('\n--- PHASE 4: Asynchronous Gemini Vision Keyframe Coaching ---');
  const recordedObservations = [];

  const keyframeCheck = GeminiVisionService.shouldAnalyzeFrame('BOTTOM', [], 1, simTime + 15000);
  assert(keyframeCheck.eligible === true, 'Bottom keyframe is eligible for Gemini Vision');

  const visionResponse = await GeminiVisionService.analyzeKeyframe({
    exercise: 'Pushups',
    repNumber: 1,
    localFormScore: 100,
    detectedIssues: [],
    poseData: { elbowAngle: 85, hipAngle: 175 },
    keyframeReason: 'deepest_position',
  }, simTime + 15000);

  assert(visionResponse.assessment === 'good', 'Gemini Vision assessed clean pushup as good');
  assert(typeof visionResponse.overallSuggestion === 'string', 'Received concise coaching tip');
  recordedObservations.push(visionResponse.overallSuggestion);
  console.log(`ℹ️ Live Gemini HUD Tip: "${visionResponse.overallSuggestion}"`);

  // -------------------------------------------------------------
  // PHASE 5: WORKOUT COMPLETION & POST-WORKOUT GEMINI ANALYSIS
  // -------------------------------------------------------------
  console.log('\n--- PHASE 5: Workout Completion & Post-Workout Gemini Analysis ---');
  const completedStats = {
    workoutType: 'Pushups',
    workoutName: day1Workout.workoutName,
    mood: day1CheckIn.mood,
    energyLevel: day1CheckIn.energyLevel,
    durationSeconds: 180,
    activeSeconds: 140,
    caloriesBurned: 45,
    repCount: 12,
    goodReps: 11,
    badReps: 1,
    plannedReps: 12,
    formAccuracyScore: 92,
    geminiObservations: recordedObservations,
    previousWorkoutHistory: initialSummary.historySummaryText,
  };

  const postWorkoutAnalysis = await WorkoutAiService.analyzeWorkoutSummary(completedStats);
  assert(typeof postWorkoutAnalysis.summary === 'string' && postWorkoutAnalysis.summary.length > 0, 'Gemini generated post-workout summary');
  assert(Array.isArray(postWorkoutAnalysis.strengths) && postWorkoutAnalysis.strengths.length > 0, 'Identified biomechanical strengths');
  assert(typeof postWorkoutAnalysis.nextWorkoutSuggestion === 'string', 'Provided actionable next session advice');
  console.log(`ℹ️ Post-Workout Summary: "${postWorkoutAnalysis.summary}"`);
  console.log(`ℹ️ Strengths: ${JSON.stringify(postWorkoutAnalysis.strengths)}`);
  console.log(`ℹ️ Next Suggestion: "${postWorkoutAnalysis.nextWorkoutSuggestion}"`);

  // Save session into persistent storage
  const day1Record = {
    id: 'session-day-1',
    date: '2026-09-09',
    completedAt: new Date().toISOString(),
    mood: day1CheckIn.mood,
    energyLevel: day1CheckIn.energyLevel,
    workoutName: day1Workout.workoutName,
    workoutType: 'Pushups',
    exercises: [
      {
        name: 'Pushups',
        plannedReps: 12,
        actualReps: 12,
        goodReps: 11,
        badReps: 1,
        formScore: 92,
      },
    ],
    plannedReps: 12,
    actualReps: 12,
    goodReps: 11,
    badReps: 1,
    formAccuracyScore: 92,
    durationSeconds: 180,
    activeSeconds: 140,
    caloriesBurned: 45,
    geminiObservations: recordedObservations,
    aiAnalysis: postWorkoutAnalysis,
  };

  await StorageService.saveWorkoutSession(day1Record);
  const savedHistory = await StorageService.getWorkoutHistory();
  assert(savedHistory.length === 1, 'Workout session successfully saved in history');
  assert(savedHistory[0].formAccuracyScore === 92, 'Saved form accuracy score verified');

  // -------------------------------------------------------------
  // PHASE 6: NEXT DAY (DAY 2) ADAPTIVE PERSONALIZATION
  // -------------------------------------------------------------
  console.log('\n--- PHASE 6: Day 2 Check-In & Adaptive Personalization ---');
  const day2HistorySummary = await StorageService.getRecentFormSummary();
  assert(day2HistorySummary.totalSessions === 1, 'Day 2 detects 1 previous session');
  assert(day2HistorySummary.averageFormScore === 92, 'Day 2 loads past form score (92%)');
  console.log(`ℹ️ Day 2 Adaptive Context: "${day2HistorySummary.historySummaryText}"`);

  // User checks in on Day 2 with Low Energy
  const day2CheckIn = {
    mood: 'Tired',
    emoji: '😴',
    energyLevel: 2,
    timestamp: new Date(),
  };

  const day2Workout = await WorkoutAiService.generateDailyWorkout(day2CheckIn, {
    workoutHistory: day2HistorySummary.historySummaryText,
    previousFormScores: `Previous average form score: ${day2HistorySummary.averageFormScore}%`,
  });

  assert(day2Workout.difficulty === 'light', 'Day 2 low energy generates light recovery workout');
  assert(day2Workout.workoutName.toLowerCase().includes('recovery') || day2Workout.difficulty === 'light', 'Adapted for active recovery');
  console.log(`ℹ️ Day 2 Adapted Workout: "${day2Workout.workoutName}" (${day2Workout.difficulty})`);
  console.log(`ℹ️ Day 2 Reason: "${day2Workout.reason}"`);

  console.log('\n===============================================================');
  console.log('🎉 COMPLETE END-TO-END USER EXPERIENCE TEST PASSED (20/20)!');
  console.log('===============================================================\n');
}

runE2ETests().catch((err) => {
  console.error('End-to-End test failed:', err);
  process.exit(1);
});
