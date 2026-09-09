import { PoseLandmark, PoseLandmarkIndex, FormError, BodyMetrics } from '../../types';
import { LandmarkProcessor } from '../../core/LandmarkProcessor';
import { PLANK_RULES, PLANK_THRESHOLDS } from './PlankRules';

export class PlankFormAnalyzer {
  private processor: LandmarkProcessor;

  constructor(processor: LandmarkProcessor) {
    this.processor = processor;
  }

  public analyzeForm(
    landmarks: PoseLandmark[],
    bodyMetrics: BodyMetrics
  ): {
    candidateErrors: FormError[];
    hipAngle: number;
  } {
    const candidateErrors: FormError[] = [];

    const leftShoulder = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
    const leftHip = landmarks[PoseLandmarkIndex.LEFT_HIP];
    const rightHip = landmarks[PoseLandmarkIndex.RIGHT_HIP];
    const leftAnkle = landmarks[PoseLandmarkIndex.LEFT_ANKLE];
    const rightAnkle = landmarks[PoseLandmarkIndex.RIGHT_ANKLE];
    const leftKnee = landmarks[PoseLandmarkIndex.LEFT_KNEE];
    const rightKnee = landmarks[PoseLandmarkIndex.RIGHT_KNEE];

    const leftLegEnd = this.processor.isVisible(leftAnkle) ? leftAnkle : leftKnee;
    const rightLegEnd = this.processor.isVisible(rightAnkle) ? rightAnkle : rightKnee;

    let leftHipAngle = 0;
    let rightHipAngle = 0;

    if (this.processor.isVisible(leftShoulder) && this.processor.isVisible(leftHip) && this.processor.isVisible(leftLegEnd)) {
      leftHipAngle = this.processor.calculateAngle(leftShoulder, leftHip, leftLegEnd);
    }
    if (this.processor.isVisible(rightShoulder) && this.processor.isVisible(rightHip) && this.processor.isVisible(rightLegEnd)) {
      rightHipAngle = this.processor.calculateAngle(rightShoulder, rightHip, rightLegEnd);
    }

    const hipAngle = leftHipAngle > 0 && rightHipAngle > 0
      ? Math.round((leftHipAngle + rightHipAngle) / 2)
      : leftHipAngle > 0
      ? leftHipAngle
      : rightHipAngle;

    if (hipAngle > 0) {
      const shoulder = this.processor.isVisible(leftShoulder) ? leftShoulder : rightShoulder;
      const hip = this.processor.isVisible(leftHip) ? leftHip : rightHip;
      const legEnd = this.processor.isVisible(leftLegEnd) ? leftLegEnd : rightLegEnd;

      if (shoulder && hip && legEnd) {
        const dx = legEnd.x - shoulder.x;
        const dy = legEnd.y - shoulder.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);

        let signedOffset = 0;
        if (lineLength > 0.05) {
          signedOffset = ((legEnd.x - shoulder.x) * (hip.y - shoulder.y) - (legEnd.y - shoulder.y) * (hip.x - shoulder.x)) / lineLength;
        }

        const isSagging = hipAngle < PLANK_THRESHOLDS.hipSaggingAngle && (signedOffset > 0.02 || hip.y > (shoulder.y + legEnd.y) / 2 + 0.03);
        const isPiked = hipAngle < PLANK_THRESHOLDS.hipPikeAngle && (signedOffset < -0.02 || hip.y < (shoulder.y + legEnd.y) / 2 - 0.03);

        if (isSagging) {
          candidateErrors.push({
            ruleId: PLANK_RULES.HIPS_SAGGING.id,
            message: PLANK_RULES.HIPS_SAGGING.voiceMessage,
            visualMessage: PLANK_RULES.HIPS_SAGGING.visualMessage,
            severity: 'warning',
            priority: PLANK_RULES.HIPS_SAGGING.priority,
            highlightJoints: PLANK_RULES.HIPS_SAGGING.highlightJoints,
          });
        } else if (isPiked) {
          candidateErrors.push({
            ruleId: PLANK_RULES.HIPS_TOO_HIGH.id,
            message: PLANK_RULES.HIPS_TOO_HIGH.voiceMessage,
            visualMessage: PLANK_RULES.HIPS_TOO_HIGH.visualMessage,
            severity: 'warning',
            priority: PLANK_RULES.HIPS_TOO_HIGH.priority,
            highlightJoints: PLANK_RULES.HIPS_TOO_HIGH.highlightJoints,
          });
        }
      }
    }

    return {
      candidateErrors,
      hipAngle,
    };
  }
}
