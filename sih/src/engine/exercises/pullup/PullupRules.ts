import { FormRuleConfig } from '../../types';
import { PoseLandmarkIndex } from '../../../types/pose';

export const PULLUP_THRESHOLDS = {
  deadHangMinAngle: 145,       // Elbow flexion >= 145° is dead hang
  ascentTriggerAngle: 135,     // Elbow flexion < 135° triggers ascent
  chinOverBarAngle: 75,        // Elbow flexion <= 75° indicates top of pullup
  insufficientHeightMaxAngle: 90, // Turnaround > 90° means did not reach top

  feedbackCooldownMs: 2000,
  persistenceMs: 300,
};

export const PULLUP_RULES: Record<string, FormRuleConfig> = {
  INSUFFICIENT_HEIGHT: {
    id: 'PULLUP_INSUFFICIENT_HEIGHT',
    name: 'Insufficient Height',
    priority: 8,
    cooldownMs: PULLUP_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: 250,
    voiceMessage: 'Pull higher.',
    visualMessage: '⚠️ Pull a little higher',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_ELBOW,
      PoseLandmarkIndex.RIGHT_ELBOW,
      PoseLandmarkIndex.NOSE,
    ],
  },
  KIPPING_EXCESSIVE: {
    id: 'PULLUP_KIPPING_EXCESSIVE',
    name: 'Excessive Kipping / Swinging',
    priority: 7,
    cooldownMs: PULLUP_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: PULLUP_THRESHOLDS.persistenceMs,
    voiceMessage: 'Avoid swinging.',
    visualMessage: '⚠️ Keep body steady',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
      PoseLandmarkIndex.LEFT_KNEE,
      PoseLandmarkIndex.RIGHT_KNEE,
    ],
  },
  ASYMMETRIC_PULL: {
    id: 'PULLUP_ASYMMETRIC_PULL',
    name: 'Asymmetric Pull',
    priority: 9,
    cooldownMs: PULLUP_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: PULLUP_THRESHOLDS.persistenceMs,
    voiceMessage: 'Pull evenly with both arms.',
    visualMessage: '⚠️ Pull evenly',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_SHOULDER,
      PoseLandmarkIndex.RIGHT_SHOULDER,
      PoseLandmarkIndex.LEFT_ELBOW,
      PoseLandmarkIndex.RIGHT_ELBOW,
    ],
  },
};
