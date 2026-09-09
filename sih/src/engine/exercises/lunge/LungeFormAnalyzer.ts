import { PoseLandmark, PoseLandmarkIndex, FormError, BodyMetrics } from '../../types';
import { LandmarkProcessor } from '../../core/LandmarkProcessor';
import { LUNGE_RULES, LUNGE_THRESHOLDS } from './LungeRules';

export class LungeFormAnalyzer {
  private processor: LandmarkProcessor;

  constructor(processor: LandmarkProcessor) {
    this.processor = processor;
  }

  public analyzeForm(
    landmarks: PoseLandmark[],
    bodyMetrics: BodyMetrics,
    lowestAngleInRep: number,
    isRepTransitioningUp: boolean
  ): {
    candidateErrors: FormError[];
  } {
    const candidateErrors: FormError[] = [];

    if (isRepTransitioningUp && lowestAngleInRep > LUNGE_THRESHOLDS.insufficientDepthMaxAngle) {
      candidateErrors.push({
        ruleId: LUNGE_RULES.INSUFFICIENT_DEPTH.id,
        message: LUNGE_RULES.INSUFFICIENT_DEPTH.voiceMessage,
        visualMessage: LUNGE_RULES.INSUFFICIENT_DEPTH.visualMessage,
        severity: 'info',
        priority: LUNGE_RULES.INSUFFICIENT_DEPTH.priority,
        highlightJoints: LUNGE_RULES.INSUFFICIENT_DEPTH.highlightJoints,
      });
    }

    return {
      candidateErrors,
    };
  }
}
