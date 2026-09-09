const { RepCounter } = require('../src/engine/core/RepCounter');
const { ExerciseEngineRegistry } = require('../src/engine/registry');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${message}`);
  }
}

console.log('\n========================================');
console.log('🧪 TESTING MODULAR REP COUNTER ENGINE');
console.log('========================================\n');

// 1. Initialize RepCounter for Squats (start: 160°, trigger: 140°, inflection: 90°, minROM: 40°)
const squatCounter = new RepCounter({
  startAngle: 160,
  triggerAngle: 140,
  inflectionAngle: 90,
  incompleteAngleThreshold: 115,
  minRangeOfMotionDelta: 40,
  movementDirection: 'decreasing_angle',
  minRepDurationMs: 300,
  cooldownBetweenRepsMs: 200,
});

// TEST 1: Multiple Consecutive Clean Reps
console.log('--- TEST 1: Multiple Consecutive Clean Reps ---');
let time = 1000;

for (let rep = 1; rep <= 3; rep++) {
  // At top (160°)
  squatCounter.update(160, time);
  time += 100;

  // Descending (130°, 100°, 85° bottom)
  squatCounter.update(130, time);
  time += 100;
  squatCounter.update(100, time);
  time += 100;
  let bottomEvent = squatCounter.update(85, time);
  assert(bottomEvent.phase === 'BOTTOM', `Rep ${rep}: Bottom depth reached at 85°`);

  // Ascending (110°, 140°, 160° return)
  time += 100;
  squatCounter.update(110, time);
  time += 100;
  squatCounter.update(140, time);
  time += 100;
  let completeEvent = squatCounter.update(160, time);

  assert(completeEvent.isNewRep === true, `Rep ${rep}: New rep event triggered`);
  assert(completeEvent.isGoodRep === true, `Rep ${rep}: Counted as good rep`);
  assert(completeEvent.repCount === rep, `Rep ${rep}: Total rep count is ${rep}`);
  assert(completeEvent.goodReps === rep, `Rep ${rep}: Total good reps is ${rep}`);

  time += 300; // Cooldown before next rep
}

assert(squatCounter.getRepCount() === 3, 'All 3 consecutive reps counted');
assert(squatCounter.getGoodReps() === 3, 'All 3 reps classified as good reps');
assert(squatCounter.getFormScore() === 100, 'Form score is 100%');

// TEST 2: Slow Tempo Reps (3.5s tempo rep)
console.log('\n--- TEST 2: Slow Controlled Tempo Rep ---');
squatCounter.reset();
time = 10000;

// Top start
squatCounter.update(160, time);
// 1.5s slow descent
time += 500;
squatCounter.update(135, time);
time += 500;
squatCounter.update(110, time);
time += 500;
squatCounter.update(85, time);
// 0.5s pause at bottom
time += 500;
squatCounter.update(85, time);
// 1.5s slow ascent
time += 500;
squatCounter.update(120, time);
time += 500;
squatCounter.update(145, time);
time += 500;
let slowRep = squatCounter.update(160, time);

assert(slowRep.isNewRep === true, 'Slow controlled rep completed successfully');
assert(slowRep.repCount === 1, 'Rep count is 1 for slow tempo');

// TEST 3: Fast Explosive Rep (500ms rep)
console.log('\n--- TEST 3: Fast Explosive Rep ---');
time += 500;
squatCounter.update(160, time);
time += 150;
squatCounter.update(120, time);
time += 150;
squatCounter.update(80, time);
time += 150;
squatCounter.update(130, time);
time += 150;
let fastRep = squatCounter.update(160, time);

assert(fastRep.isNewRep === true, 'Fast explosive rep completed successfully');
assert(fastRep.repCount === 2, 'Total rep count is 2');

// TEST 4: Partial / Shallow Rep (Turnaround at 120° > 90° depth)
console.log('\n--- TEST 4: Incomplete / Partial Rep ---');
time += 500;
squatCounter.update(160, time);
time += 150;
squatCounter.update(135, time);
time += 150;
squatCounter.update(120, time); // Turned around at 120° (shallow, < 40° ROM from 160°)
time += 150;
squatCounter.update(145, time);
time += 150;
let partialRep = squatCounter.update(160, time);

assert(partialRep.isNewRep === false, 'Small partial dip (<40° delta) is rejected and not counted');
assert(squatCounter.getRepCount() === 2, 'Rep count unchanged at 2');

// TEST 5: Noisy Movement / Micro-fidgeting
console.log('\n--- TEST 5: Noisy Movement / Fidgeting Filter ---');
time += 500;
// Oscillate between 150° and 160° (standing fidgeting)
for (let i = 0; i < 6; i++) {
  squatCounter.update(152, time);
  time += 100;
  squatCounter.update(158, time);
  time += 100;
}
assert(squatCounter.getRepCount() === 2, 'Fidgeting/noise does not increment rep count');

// TEST 6: Duplicate Counting Prevention (Lingering at bottom)
console.log('\n--- TEST 6: Duplicate Counting Prevention ---');
squatCounter.reset();
time = 20000;

squatCounter.update(160, time);
time += 100;
squatCounter.update(130, time);
time += 100;
squatCounter.update(80, time);
// Lingering at bottom for multiple frames
time += 100;
squatCounter.update(80, time);
time += 100;
squatCounter.update(82, time);
time += 100;
squatCounter.update(79, time);

assert(squatCounter.getRepCount() === 0, 'Lingering at bottom does not count as completed reps');

time += 100;
squatCounter.update(120, time);
time += 100;
let returnedRep = squatCounter.update(160, time);
assert(returnedRep.repCount === 1, 'Only counts 1 rep upon full return to top');

// Lingering at top lockout
time += 50;
squatCounter.update(160, time);
time += 50;
squatCounter.update(160, time);
assert(squatCounter.getRepCount() === 1, 'Lockout lingering does not double-count');

console.log('\n========================================');
console.log('🎉 ALL MODULAR REP COUNTER TESTS PASSED!');
console.log('========================================\n');
