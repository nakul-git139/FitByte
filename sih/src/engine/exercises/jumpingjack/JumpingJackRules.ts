import { FormRuleConfig } from '../../types';
import { PoseLandmarkIndex } from '../../../types/pose';

export const JUMPING_JACK_THRESHOLDS = {
  armOverheadMinAngle: 135,       // Arm overhead angle >= 135°
  feetApartRatioMin: 1.25,        // Feet span / Shoulder span >= 1.25
  feetClosedRatioMax: 0.75,       // Feet span / Shoulder span <= 0.75

  feedbackCooldownMs: 2000,
  persistenceMs: 250,
};

export const JUMPING_JACK_RULES: Record<string, FormRuleConfig> = {
  ARMS_TOO_LOW: {
    id: 'JUMPING_JACK_ARMS_TOO_LOW',
    name: 'Arms Not High Enough',
    priority: 8,
    cooldownMs: JUMPING_JACK_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: JUMPING_JACK_THRESHOLDS.persistenceMs,
    voiceMessage: 'Raise your arms all the way up.',
    visualMessage: '⚠️ Arms all the way up',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_WRIST,
      PoseLandmarkIndex.RIGHT_WRIST,
      PoseLandmarkIndex.LEFT_SHOULDER,
      PoseLandmarkIndex.RIGHT_SHOULDER,
    ],
  },
  FEET_TOO_NARROW: {
    id: 'JUMPING_JACK_FEET_TOO_NARROW',
    name: 'Jump Wider',
    priority: 7,
    cooldownMs: JUMPING_JACK_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: JUMPING_JACK_THRESHOLDS.persistenceMs,
    voiceMessage: 'Spread your feet wider.',
    visualMessage: '⚠️ Jump wider',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_ANKLE,
      PoseLandmarkIndex.RIGHT_ANKLE,
    ],
  },
};
