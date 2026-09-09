import { FormRuleConfig } from '../../types';
import { PoseLandmarkIndex } from '../../../types/pose';

export const LUNGE_THRESHOLDS = {
  standingMinAngle: 155,          // Knee flex >= 155° is standing upright
  lungeTriggerAngle: 135,         // Knee flex < 135° triggers lunge descent
  bottomLungeMaxAngle: 95,        // Front knee flex <= 95° is deep lunge
  insufficientDepthMaxAngle: 110, // Turnaround > 110° is shallow lunge

  feedbackCooldownMs: 2000,
  persistenceMs: 300,
};

export const LUNGE_RULES: Record<string, FormRuleConfig> = {
  KNEE_OVER_TOE: {
    id: 'LUNGE_KNEE_OVER_TOE',
    name: 'Front Knee Passing Toes',
    priority: 9,
    cooldownMs: LUNGE_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: LUNGE_THRESHOLDS.persistenceMs,
    voiceMessage: "Don't let your front knee pass your toes.",
    visualMessage: '⚠️ Knee behind toes',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_KNEE,
      PoseLandmarkIndex.RIGHT_KNEE,
      PoseLandmarkIndex.LEFT_ANKLE,
      PoseLandmarkIndex.RIGHT_ANKLE,
    ],
  },
  INSUFFICIENT_DEPTH: {
    id: 'LUNGE_INSUFFICIENT_DEPTH',
    name: 'Insufficient Depth',
    priority: 7,
    cooldownMs: LUNGE_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: 250,
    voiceMessage: 'Lunge a little deeper.',
    visualMessage: '⚠️ Step down lower',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_KNEE,
      PoseLandmarkIndex.RIGHT_KNEE,
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
};
