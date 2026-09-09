import { FormRuleConfig } from '../../types';
import { PoseLandmarkIndex } from '../../../types/pose';

export const PUSHUP_THRESHOLDS = {
  // Repetition Phase Transitions
  armLockoutMinAngle: 150,        // Elbow flex >= 150° is top / extended position
  descentTriggerAngle: 135,       // Elbow flex < 135° triggers descent phase
  bottomInflectionAngle: 90,      // Elbow flex <= 90° is proper bottom depth
  insufficientDepthMaxAngle: 105, // If bottom turnaround occurs above 105°, flag depth warning

  // 1. Elbow Width / Flare Metrics (Normalized to body dimensions)
  elbowWidthRatioMax: 1.38,       // Elbow span / Shoulder span ratio (> 1.38 indicates wide elbows)
  maxElbowFlareAngle: 72,         // Angle between Torso and Upper Arm (> 72° is flared "T-pushup")

  // 2. Hip Alignment (Shoulder - Hip - Ankle/Knee line)
  hipSagAngle: 160,               // Hip angle < 160° with hip sagging towards ground
  hipPikeAngle: 155,              // Hip angle < 155° with hips raised upward

  // 3. Body Symmetry
  maxAsymmetryRatio: 0.15,        // Shoulder / Hip vertical tilt difference > 15%

  // Timing
  feedbackCooldownMs: 2000,       // 2.0s cooldown per rule
  persistenceMs: 300,             // 300ms persistence threshold (200-400ms)
};

export const PUSHUP_RULES: Record<string, FormRuleConfig> = {
  ELBOWS_TOO_WIDE: {
    id: 'PUSHUP_ELBOWS_TOO_WIDE',
    name: 'Elbows Too Wide',
    priority: 10, // Top priority: Protects shoulder rotator cuffs
    cooldownMs: PUSHUP_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: PUSHUP_THRESHOLDS.persistenceMs,
    voiceMessage: 'Narrow your elbows.',
    visualMessage: '⚠️ Narrow your elbows',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_ELBOW,
      PoseLandmarkIndex.RIGHT_ELBOW,
      PoseLandmarkIndex.LEFT_SHOULDER,
      PoseLandmarkIndex.RIGHT_SHOULDER,
    ],
  },
  HIPS_SAGGING: {
    id: 'PUSHUP_HIPS_SAGGING',
    name: 'Hips Sagging',
    priority: 9, // High priority: Protects lumbar spine
    cooldownMs: PUSHUP_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: PUSHUP_THRESHOLDS.persistenceMs,
    voiceMessage: 'Keep your hips up.',
    visualMessage: '⚠️ Keep your hips up',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
  HIPS_TOO_HIGH: {
    id: 'PUSHUP_HIPS_TOO_HIGH',
    name: 'Hips Too High',
    priority: 8,
    cooldownMs: PUSHUP_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: PUSHUP_THRESHOLDS.persistenceMs,
    voiceMessage: 'Keep your body straight.',
    visualMessage: '⚠️ Keep your body straight',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
  INSUFFICIENT_DEPTH: {
    id: 'PUSHUP_INSUFFICIENT_DEPTH',
    name: 'Insufficient Depth',
    priority: 6,
    cooldownMs: PUSHUP_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: 250,
    voiceMessage: 'Go a little lower.',
    visualMessage: '⚠️ Go a little lower',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_ELBOW,
      PoseLandmarkIndex.RIGHT_ELBOW,
    ],
  },
  UNEVEN_BODY: {
    id: 'PUSHUP_UNEVEN_BODY',
    name: 'Uneven Body Position',
    priority: 7,
    cooldownMs: PUSHUP_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: PUSHUP_THRESHOLDS.persistenceMs,
    voiceMessage: 'Keep your body aligned.',
    visualMessage: '⚠️ Keep your body aligned',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_SHOULDER,
      PoseLandmarkIndex.RIGHT_SHOULDER,
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
};
