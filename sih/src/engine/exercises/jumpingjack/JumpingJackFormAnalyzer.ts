import { PoseLandmark, PoseLandmarkIndex, FormError, BodyMetrics } from '../../types';
import { LandmarkProcessor } from '../../core/LandmarkProcessor';
import { JUMPING_JACK_RULES, JUMPING_JACK_THRESHOLDS } from './JumpingJackRules';

export class JumpingJackFormAnalyzer {
  private processor: LandmarkProcessor;

  constructor(processor: LandmarkProcessor) {
    this.processor = processor;
  }

  public analyzeForm(
    landmarks: PoseLandmark[],
    bodyMetrics: BodyMetrics,
    armAngle: number,
    feetSpanRatio: number,
    isOpenPhase: boolean
  ): {
    candidateErrors: FormError[];
  } {
    const candidateErrors: FormError[] = [];

    if (isOpenPhase) {
      if (armAngle > 0 && armAngle < JUMPING_JACK_THRESHOLDS.armOverheadMinAngle) {
        candidateErrors.push({
          ruleId: JUMPING_JACK_RULES.ARMS_TOO_LOW.id,
          message: JUMPING_JACK_RULES.ARMS_TOO_LOW.voiceMessage,
          visualMessage: JUMPING_JACK_RULES.ARMS_TOO_LOW.visualMessage,
          severity: 'info',
          priority: JUMPING_JACK_RULES.ARMS_TOO_LOW.priority,
          highlightJoints: JUMPING_JACK_RULES.ARMS_TOO_LOW.highlightJoints,
        });
      }

      if (feetSpanRatio > 0 && feetSpanRatio < JUMPING_JACK_THRESHOLDS.feetApartRatioMin) {
        candidateErrors.push({
          ruleId: JUMPING_JACK_RULES.FEET_TOO_NARROW.id,
          message: JUMPING_JACK_RULES.FEET_TOO_NARROW.voiceMessage,
          visualMessage: JUMPING_JACK_RULES.FEET_TOO_NARROW.visualMessage,
          severity: 'info',
          priority: JUMPING_JACK_RULES.FEET_TOO_NARROW.priority,
          highlightJoints: JUMPING_JACK_RULES.FEET_TOO_NARROW.highlightJoints,
        });
      }
    }

    return {
      candidateErrors,
    };
  }
}
