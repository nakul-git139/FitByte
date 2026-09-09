import { PoseLandmark, PoseLandmarkIndex, FormError, BodyMetrics } from '../../types';
import { LandmarkProcessor } from '../../core/LandmarkProcessor';
import { PULLUP_RULES, PULLUP_THRESHOLDS } from './PullupRules';

export class PullupFormAnalyzer {
  private processor: LandmarkProcessor;

  constructor(processor: LandmarkProcessor) {
    this.processor = processor;
  }

  public analyzeForm(
    landmarks: PoseLandmark[],
    bodyMetrics: BodyMetrics,
    leftElbowAngle: number,
    rightElbowAngle: number,
    isAscendingOrTop: boolean,
    lowestAngleInRep: number,
    isRepTransitioningDown: boolean
  ): {
    candidateErrors: FormError[];
    armAsymmetryDelta: number;
    bodySwingAngle: number;
  } {
    const candidateErrors: FormError[] = [];

    const leftShoulder = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
    const leftHip = landmarks[PoseLandmarkIndex.LEFT_HIP];
    const rightHip = landmarks[PoseLandmarkIndex.RIGHT_HIP];
    const leftKnee = landmarks[PoseLandmarkIndex.LEFT_KNEE];
    const rightKnee = landmarks[PoseLandmarkIndex.RIGHT_KNEE];

    // 1. Arm Asymmetry
    let armAsymmetryDelta = 0;
    if (leftElbowAngle > 0 && rightElbowAngle > 0) {
      armAsymmetryDelta = Math.abs(leftElbowAngle - rightElbowAngle);
      if (isAscendingOrTop && armAsymmetryDelta > 24) {
        candidateErrors.push({
          ruleId: PULLUP_RULES.ASYMMETRIC_PULL.id,
          message: PULLUP_RULES.ASYMMETRIC_PULL.voiceMessage,
          visualMessage: PULLUP_RULES.ASYMMETRIC_PULL.visualMessage,
          severity: 'warning',
          priority: PULLUP_RULES.ASYMMETRIC_PULL.priority,
          highlightJoints: PULLUP_RULES.ASYMMETRIC_PULL.highlightJoints,
        });
      }
    }

    // 2. Insufficient Height / Chin over bar
    if (isRepTransitioningDown && lowestAngleInRep > PULLUP_THRESHOLDS.insufficientHeightMaxAngle) {
      candidateErrors.push({
        ruleId: PULLUP_RULES.INSUFFICIENT_HEIGHT.id,
        message: PULLUP_RULES.INSUFFICIENT_HEIGHT.voiceMessage,
        visualMessage: PULLUP_RULES.INSUFFICIENT_HEIGHT.visualMessage,
        severity: 'info',
        priority: PULLUP_RULES.INSUFFICIENT_HEIGHT.priority,
        highlightJoints: PULLUP_RULES.INSUFFICIENT_HEIGHT.highlightJoints,
      });
    }

    // 3. Body Swing / Kipping Angle
    let bodySwingAngle = 0;
    const shoulder = this.processor.isVisible(leftShoulder) ? leftShoulder : rightShoulder;
    const hip = this.processor.isVisible(leftHip) ? leftHip : rightHip;
    const knee = this.processor.isVisible(leftKnee) ? leftKnee : rightKnee;

    if (shoulder && hip && knee) {
      bodySwingAngle = this.processor.calculateAngle(shoulder, hip, knee);
      // If hip-knee angle deviates severely from 180° (e.g. < 140° during pull)
      if (isAscendingOrTop && bodySwingAngle > 0 && bodySwingAngle < 140) {
        candidateErrors.push({
          ruleId: PULLUP_RULES.KIPPING_EXCESSIVE.id,
          message: PULLUP_RULES.KIPPING_EXCESSIVE.voiceMessage,
          visualMessage: PULLUP_RULES.KIPPING_EXCESSIVE.visualMessage,
          severity: 'warning',
          priority: PULLUP_RULES.KIPPING_EXCESSIVE.priority,
          highlightJoints: PULLUP_RULES.KIPPING_EXCESSIVE.highlightJoints,
        });
      }
    }

    return {
      candidateErrors,
      armAsymmetryDelta,
      bodySwingAngle,
    };
  }
}
