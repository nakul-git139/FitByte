import { FormRuleConfig } from '../../types';
import { PoseLandmarkIndex } from '../../../types/pose';

export const MOUNTAIN_CLIMBER_THRESHOLDS = {
  kneeDriveMaxAngle: 85,          // Knee flex <= 85° indicates knee drive towards chest
  hipMaxPikeAngle: 145,           // Hips bouncing too high < 145°

  feedbackCooldownMs: 2000,
  persistenceMs: 300,
};

export const MOUNTAIN_CLIMBER_RULES: Record<string, FormRuleConfig> = {
  HIPS_BOUNCING_HIGH: {
    id: 'MOUNTAIN_CLIMBER_HIPS_BOUNCING_HIGH',
    name: 'Hips Too High / Bouncing',
    priority: 9,
    cooldownMs: MOUNTAIN_CLIMBER_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: MOUNTAIN_CLIMBER_THRESHOLDS.persistenceMs,
    voiceMessage: 'Keep your hips low and steady.',
    visualMessage: '⚠️ Keep hips low',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
  INSUFFICIENT_KNEE_DRIVE: {
    id: 'MOUNTAIN_CLIMBER_INSUFFICIENT_KNEE_DRIVE',
    name: 'Drive Knees Closer to Chest',
    priority: 7,
    cooldownMs: MOUNTAIN_CLIMBER_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: 250,
    voiceMessage: 'Drive your knees further forward.',
    visualMessage: '⚠️ Drive knees forward',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_KNEE,
      PoseLandmarkIndex.RIGHT_KNEE,
    ],
  },
};
