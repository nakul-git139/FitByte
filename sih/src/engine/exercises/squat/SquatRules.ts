import { FormRuleConfig } from '../../types';
import { PoseLandmarkIndex } from '../../../types/pose';

export const SQUAT_THRESHOLDS = {
  standingMinAngle: 155,          // Knee flex >= 155° is standing
  descentTriggerAngle: 140,       // Knee flex < 140° starts descent
  deepSquatMaxAngle: 95,          // Knee flex <= 95° is parallel / deep squat
  insufficientDepthMaxAngle: 115, // Turnaround > 115° is shallow

  kneeCaveRatioMin: 0.85,         // Knee span / Ankle span (< 0.85 indicates knee valgus / caving)
  maxChestLeanAngle: 48,          // Torso angle relative to vertical

  feedbackCooldownMs: 2000,
  persistenceMs: 300,
};

export const SQUAT_RULES: Record<string, FormRuleConfig> = {
  KNEES_CAVING: {
    id: 'SQUAT_KNEES_CAVING',
    name: 'Knees Caving In',
    priority: 10,
    cooldownMs: SQUAT_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: SQUAT_THRESHOLDS.persistenceMs,
    voiceMessage: 'Push your knees out.',
    visualMessage: '⚠️ Push your knees out',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_KNEE,
      PoseLandmarkIndex.RIGHT_KNEE,
    ],
  },
  INSUFFICIENT_DEPTH: {
    id: 'SQUAT_INSUFFICIENT_DEPTH',
    name: 'Insufficient Depth',
    priority: 8,
    cooldownMs: SQUAT_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: 250,
    voiceMessage: 'Squat a little lower.',
    visualMessage: '⚠️ Squat lower',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_KNEE,
      PoseLandmarkIndex.RIGHT_KNEE,
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
  CHEST_FALLING: {
    id: 'SQUAT_CHEST_FALLING',
    name: 'Chest Falling Forward',
    priority: 7,
    cooldownMs: SQUAT_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: SQUAT_THRESHOLDS.persistenceMs,
    voiceMessage: 'Keep your chest up.',
    visualMessage: '⚠️ Keep your chest up',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_SHOULDER,
      PoseLandmarkIndex.RIGHT_SHOULDER,
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
};
