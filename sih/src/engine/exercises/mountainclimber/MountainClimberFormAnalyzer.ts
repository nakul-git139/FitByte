import { PoseLandmark, PoseLandmarkIndex, FormError, BodyMetrics } from '../../types';
import { LandmarkProcessor } from '../../core/LandmarkProcessor';
import { MOUNTAIN_CLIMBER_RULES, MOUNTAIN_CLIMBER_THRESHOLDS } from './MountainClimberRules';

export class MountainClimberFormAnalyzer {
  private processor: LandmarkProcessor;

  constructor(processor: LandmarkProcessor) {
    this.processor = processor;
  }

  public analyzeForm(
    landmarks: PoseLandmark[],
    bodyMetrics: BodyMetrics,
    hipAngle: number
  ): {
    candidateErrors: FormError[];
  } {
    const candidateErrors: FormError[] = [];

    if (hipAngle > 0 && hipAngle < MOUNTAIN_CLIMBER_THRESHOLDS.hipMaxPikeAngle) {
      candidateErrors.push({
        ruleId: MOUNTAIN_CLIMBER_RULES.HIPS_BOUNCING_HIGH.id,
        message: MOUNTAIN_CLIMBER_RULES.HIPS_BOUNCING_HIGH.voiceMessage,
        visualMessage: MOUNTAIN_CLIMBER_RULES.HIPS_BOUNCING_HIGH.visualMessage,
        severity: 'warning',
        priority: MOUNTAIN_CLIMBER_RULES.HIPS_BOUNCING_HIGH.priority,
        highlightJoints: MOUNTAIN_CLIMBER_RULES.HIPS_BOUNCING_HIGH.highlightJoints,
      });
    }

    return {
      candidateErrors,
    };
  }
}
