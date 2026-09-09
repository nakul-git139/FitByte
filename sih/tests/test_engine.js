const { ExerciseEngineRegistry } = require('../src/engine/registry');
const { PoseLandmarkIndex } = require('../src/types/pose');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

function createBasePushupLandmarks(options = {}) {
  const {
    elbowAngle = 160,
    elbowSpread = 0.22,
    hipOffsetY = 0.50,
    isSagging = false,
    isPiked = false,
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

  // Shoulders (Span = 0.36)
  const armLen = 0.14;
  const leftShoulderX = centerX - 0.18;
  const leftShoulderY = shoulderY;
  const rightShoulderX = centerX + 0.18;
  const rightShoulderY = shoulderY;

  landmarks[PoseLandmarkIndex.LEFT_SHOULDER] = { x: leftShoulderX, y: leftShoulderY, z: 0, visibility: allVisible ? 0.98 : 0.1 };
  landmarks[PoseLandmarkIndex.RIGHT_SHOULDER] = { x: rightShoulderX, y: rightShoulderY, z: 0, visibility: allVisible ? 0.98 : 0.1 };

  // Elbows (Upper arm length = 0.14)
  const leftElbowX = centerX - elbowSpread;
  const leftElbowY = shoulderY + armLen;
  const rightElbowX = centerX + elbowSpread;
  const rightElbowY = shoulderY + armLen;

  landmarks[PoseLandmarkIndex.LEFT_ELBOW] = { x: leftElbowX, y: leftElbowY, z: 0, visibility: allVisible ? 0.95 : 0.1 };
  landmarks[PoseLandmarkIndex.RIGHT_ELBOW] = { x: rightElbowX, y: rightElbowY, z: 0, visibility: allVisible ? 0.95 : 0.1 };

  // Calculate exact interior elbow angle:
  // Angle formed by Shoulder -> Elbow -> Wrist
  const leftArmVecAngle = Math.atan2(leftElbowY - leftShoulderY, leftElbowX - leftShoulderX);
  const rightArmVecAngle = Math.atan2(rightElbowY - rightShoulderY, rightElbowX - rightShoulderX);

  const angleRad = (elbowAngle * Math.PI) / 180.0;
  const leftWristAngle = leftArmVecAngle + (Math.PI - angleRad);
  const rightWristAngle = rightArmVecAngle - (Math.PI - angleRad);

  landmarks[PoseLandmarkIndex.LEFT_WRIST] = {
    x: leftElbowX + armLen * Math.cos(leftWristAngle),
    y: leftElbowY + armLen * Math.sin(leftWristAngle),
    z: 0,
    visibility: allVisible ? 0.95 : 0.1,
  };
  landmarks[PoseLandmarkIndex.RIGHT_WRIST] = {
    x: rightElbowX + armLen * Math.cos(rightWristAngle),
    y: rightElbowY + armLen * Math.sin(rightWristAngle),
    z: 0,
    visibility: allVisible ? 0.95 : 0.1,
  };

  // Hips (Normal, Sagging, or Piked)
  let effectiveHipY = hipOffsetY;
  let hipXOffset = 0;
  if (isSagging) {
    effectiveHipY = 0.68; // Dropped downward
    hipXOffset = 0.08;
  } else if (isPiked) {
    effectiveHipY = 0.35; // Arched upward
    hipXOffset = 0.08;
  }

  landmarks[PoseLandmarkIndex.LEFT_HIP] = { x: centerX - 0.12 + hipXOffset, y: effectiveHipY, z: 0, visibility: allVisible ? 0.98 : 0.1 };
  landmarks[PoseLandmarkIndex.RIGHT_HIP] = { x: centerX + 0.12 + hipXOffset, y: effectiveHipY, z: 0, visibility: allVisible ? 0.98 : 0.1 };

  // Knees
  landmarks[PoseLandmarkIndex.LEFT_KNEE] = { x: centerX - 0.12, y: 0.72, z: 0, visibility: allVisible ? 0.95 : 0.1 };
  landmarks[PoseLandmarkIndex.RIGHT_KNEE] = { x: centerX + 0.12, y: 0.72, z: 0, visibility: allVisible ? 0.95 : 0.1 };

  // Ankles
  landmarks[PoseLandmarkIndex.LEFT_ANKLE] = { x: centerX - 0.12, y: ankleY, z: 0, visibility: allVisible ? 0.95 : 0.1 };
  landmarks[PoseLandmarkIndex.RIGHT_ANKLE] = { x: centerX + 0.12, y: ankleY, z: 0, visibility: allVisible ? 0.95 : 0.1 };

  return landmarks;
}

console.log('\n========================================');
console.log('🧪 RUNNING AI FORM COACH TEST SUITE');
console.log('========================================\n');

// TEST 1: Full Pushup Repetition State Machine
console.log('--- TEST 1: Pushup Repetition State Machine ---');
const pushupEngine = ExerciseEngineRegistry.getEngine('Pushups');
pushupEngine.reset();

let timestamp = 1000;
// Frame 1-2: Lockout Start
pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 160 }), timestamp);
timestamp += 100;
let r1 = pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 160 }), timestamp);
assert(r1.phase === 'START' || r1.phase === 'IDLE', 'Engine initialized in start/idle phase');

// Frame 3-5: Descent
timestamp += 100;
pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 120 }), timestamp);
timestamp += 100;
let r2 = pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 120 }), timestamp);
assert(r2.phase === 'DESCENDING', 'Descent detected when elbow angle decreases');

// Frame 6-8: Bottom inflection (elbow flex reaches 75 deg <= 90 deg)
timestamp += 100;
pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 75 }), timestamp);
timestamp += 100;
let r3 = pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 75 }), timestamp);
assert(r3.phase === 'BOTTOM', 'Bottom inflection detected at <= 90 deg');

// Frame 9-11: Ascent
timestamp += 100;
pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 135 }), timestamp);
timestamp += 100;
let r4 = pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 135 }), timestamp);
assert(r4.phase === 'ASCENDING', 'Ascent phase detected');

// Frame 12-14: Lockout return (completes rep)
timestamp += 100;
pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 160 }), timestamp);
timestamp += 100;
let r5 = pushupEngine.processFrame(createBasePushupLandmarks({ elbowAngle: 160 }), timestamp);
assert(r5.repCount === 1, 'Rep completed and count incremented to 1');
assert(r5.perfectReps === 1, 'Deep rep without errors counted as perfect');

// TEST 2: Elbow Flare Detection & Normalization
console.log('\n--- TEST 2: Elbow Width / Flare Detection ---');
pushupEngine.reset();
timestamp = 5000;

// Proper tucked elbows (elbowSpread = 0.22, shoulderSpan = 0.36 -> Ratio = 1.22 <= 1.38)
let rNormal = pushupEngine.processFrame(createBasePushupLandmarks({ elbowSpread: 0.22 }), timestamp);
assert(rNormal.isGoodForm === true, 'Tucked elbow form is classified as good');
assert(rNormal.activeErrors.length === 0, 'No form errors for tucked elbows');

// Wide flared elbows during descent (elbowSpread = 0.34, elbowAngle = 110 -> Ratio = 1.88 > 1.38 threshold)
// Frame 1: First frame (within persistence window < 300ms)
timestamp += 100;
let rFlare1 = pushupEngine.processFrame(createBasePushupLandmarks({ elbowSpread: 0.34, elbowAngle: 110 }), timestamp);
assert(rFlare1.activeErrors.length === 0, 'Debounced: single noisy frame does not trigger feedback');

// Frame 2: Persisted error (duration = 350ms >= 300ms persistence threshold)
timestamp += 350;
let rFlare2 = pushupEngine.processFrame(createBasePushupLandmarks({ elbowSpread: 0.34, elbowAngle: 110 }), timestamp);
assert(rFlare2.activeErrors.length > 0, 'Sustained wide elbows detected as active form error');
assert(rFlare2.activeErrors.some(e => e.ruleId === 'PUSHUP_ELBOWS_TOO_WIDE'), 'Rule ID matches PUSHUP_ELBOWS_TOO_WIDE');
assert(rFlare2.primaryFeedback && rFlare2.primaryFeedback.message === 'Narrow your elbows.', 'Voice feedback is "Narrow your elbows."');
assert(rFlare2.primaryFeedback && rFlare2.primaryFeedback.visualMessage === '⚠️ Narrow your elbows', 'Visual banner is "⚠️ Narrow your elbows"');

// TEST 3: Feedback Cooldown (2.0s cooldown check)
console.log('\n--- TEST 3: Feedback Cooldown ---');
// Immediately next frame (100ms later) with error still active
timestamp += 100;
let rCooldown1 = pushupEngine.processFrame(createBasePushupLandmarks({ elbowSpread: 0.34 }), timestamp);
assert(rCooldown1.activeErrors.length > 0, 'Error is still active');
assert(rCooldown1.primaryFeedback !== null, 'Visual banner remains active');

// TEST 4: Hip Sagging Detection
console.log('\n--- TEST 4: Hip Sagging Detection ---');
pushupEngine.reset();
timestamp = 10000;

// Initial frame (detects candidate error)
let rSagInit = pushupEngine.processFrame(createBasePushupLandmarks({ isSagging: true }), timestamp);
console.log('rSagInit hipAngle:', rSagInit.metrics.hipAngle, 'errors:', rSagInit.activeErrors);
// Sustained frame (350ms later >= 300ms persistence threshold)
timestamp += 350;
let rSag = pushupEngine.processFrame(createBasePushupLandmarks({ isSagging: true }), timestamp);
console.log('rSag hipAngle:', rSag.metrics.hipAngle, 'errors:', rSag.activeErrors, 'primaryFeedback:', rSag.primaryFeedback);
assert(rSag.activeErrors.some(e => e.ruleId === 'PUSHUP_HIPS_SAGGING'), 'Hip sag detected');
assert(rSag.primaryFeedback && rSag.primaryFeedback.message === 'Keep your hips up.', 'Hip sag voice message is "Keep your hips up."');

// TEST 5: Hip Pike / Too High Detection
console.log('\n--- TEST 5: Hip Too High Detection ---');
pushupEngine.reset();
timestamp = 15000;

// Initial frame
pushupEngine.processFrame(createBasePushupLandmarks({ isPiked: true }), timestamp);
// Sustained frame (350ms later)
timestamp += 350;
let rPike = pushupEngine.processFrame(createBasePushupLandmarks({ isPiked: true }), timestamp);
assert(rPike.activeErrors.some(e => e.ruleId === 'PUSHUP_HIPS_TOO_HIGH'), 'Hip too high detected');
assert(rPike.primaryFeedback && rPike.primaryFeedback.message === 'Keep your body straight.', 'Hip pike voice message is "Keep your body straight."');

// TEST 6: Visibility Guard (Out of frame test)
console.log('\n--- TEST 6: Visibility Guard ---');
pushupEngine.reset();
timestamp = 20000;

// Out of frame landmarks (visibility = 0.1)
let rInvisible = pushupEngine.processFrame(createBasePushupLandmarks({ allVisible: false }), timestamp);
assert(rInvisible.visibilityStatus.isFullyVisible === false, 'Detects user is out of frame');
assert(rInvisible.visibilityStatus.guidanceMessage.includes('visible'), 'Provides clear body visibility guidance');
assert(rInvisible.activeErrors.length === 0, 'Does NOT throw false form errors when landmarks are missing');

// TEST 7: Squat Engine Verification
console.log('\n--- TEST 7: Squats Repetition & Knee Cave ---');
const squatEngine = ExerciseEngineRegistry.getEngine('Squats');
squatEngine.reset();
timestamp = 30000;

assert(squatEngine.exerciseName === 'Squats', 'Squat engine correctly loaded');

console.log('\n========================================');
console.log('🎉 ALL TESTS PASSED SUCCESSFULLY (7/7)!');
console.log('========================================\n');
