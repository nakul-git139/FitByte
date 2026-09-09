import { FormRuleConfig } from '../../types';
import { PoseLandmarkIndex } from '../../../types/pose';

export const PLANK_THRESHOLDS = {
  hipMinStraightAngle: 158,   // Straight spine >= 158°
  hipSaggingAngle: 155,       // Hip angle < 155° with sag
  hipPikeAngle: 150,          // Hip angle < 150° with pike

  feedbackCooldownMs: 2000,
  persistenceMs: 300,
};

export const PLANK_RULES: Record<string, FormRuleConfig> = {
  HIPS_SAGGING: {
    id: 'PLANK_HIPS_SAGGING',
    name: 'Hips Sagging',
    priority: 10,
    cooldownMs: PLANK_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: PLANK_THRESHOLDS.persistenceMs,
    voiceMessage: 'Keep your hips up.',
    visualMessage: '⚠️ Keep your hips up',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
  HIPS_TOO_HIGH: {
    id: 'PLANK_HIPS_TOO_HIGH',
    name: 'Hips Too High (Pike)',
    priority: 9,
    cooldownMs: PLANK_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: PLANK_THRESHOLDS.persistenceMs,
    voiceMessage: 'Lower your hips slightly.',
    visualMessage: '⚠️ Keep your back flat',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
};
