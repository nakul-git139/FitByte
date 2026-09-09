import { FormRuleConfig } from '../../types';
import { PoseLandmarkIndex } from '../../../types/pose';

export const BICEP_CURL_THRESHOLDS = {
  armExtensionMinAngle: 145,       // Fully extended arm >= 145°
  curlTriggerAngle: 130,           // Flexing < 130° starts curl
  peakContractionAngle: 65,        // Peak curl contraction <= 65°
  insufficientRangeMaxAngle: 85,   // Incomplete peak > 85°
  maxElbowDriftAngle: 32,          // Elbow swinging forward > 32°

  feedbackCooldownMs: 2000,
  persistenceMs: 300,
};

export const BICEP_CURL_RULES: Record<string, FormRuleConfig> = {
  ELBOW_DRIFTING: {
    id: 'BICEP_CURL_ELBOW_DRIFTING',
    name: 'Elbows Swinging / Drifting',
    priority: 9,
    cooldownMs: BICEP_CURL_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: BICEP_CURL_THRESHOLDS.persistenceMs,
    voiceMessage: 'Keep your elbows pinned to your sides.',
    visualMessage: '⚠️ Keep elbows pinned',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_ELBOW,
      PoseLandmarkIndex.RIGHT_ELBOW,
    ],
  },
  INSUFFICIENT_RANGE: {
    id: 'BICEP_CURL_INSUFFICIENT_RANGE',
    name: 'Incomplete Range of Motion',
    priority: 7,
    cooldownMs: BICEP_CURL_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: 250,
    voiceMessage: 'Curl all the way up.',
    visualMessage: '⚠️ Full range of motion',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_WRIST,
      PoseLandmarkIndex.RIGHT_WRIST,
      PoseLandmarkIndex.LEFT_ELBOW,
      PoseLandmarkIndex.RIGHT_ELBOW,
    ],
  },
  TORSO_SWAY: {
    id: 'BICEP_CURL_TORSO_SWAY',
    name: 'Body Swinging / Cheating',
    priority: 8,
    cooldownMs: BICEP_CURL_THRESHOLDS.feedbackCooldownMs,
    persistenceMs: BICEP_CURL_THRESHOLDS.persistenceMs,
    voiceMessage: "Don't swing your body.",
    visualMessage: '⚠️ Keep your torso steady',
    highlightJoints: [
      PoseLandmarkIndex.LEFT_SHOULDER,
      PoseLandmarkIndex.RIGHT_SHOULDER,
      PoseLandmarkIndex.LEFT_HIP,
      PoseLandmarkIndex.RIGHT_HIP,
    ],
  },
};
