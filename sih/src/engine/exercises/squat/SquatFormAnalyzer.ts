import { PoseLandmark, PoseLandmarkIndex, FormError, BodyMetrics } from '../../types';
import { LandmarkProcessor } from '../../core/LandmarkProcessor';
import { SQUAT_RULES, SQUAT_THRESHOLDS } from './SquatRules';

export class SquatFormAnalyzer {
  private processor: LandmarkProcessor;

  constructor(processor: LandmarkProcessor) {
    this.processor = processor;
  }

  public analyzeForm(
    landmarks: PoseLandmark[],
    bodyMetrics: BodyMetrics,
    kneeAngle: number,
    isDescendingOrBottom: boolean,
    lowestAngleInRep: number,
    isRepTransitioningUp: boolean
  ): {
    candidateErrors: FormError[];
    kneeCaveRatio: number;
    torsoAngle: number;
  } {
    const candidateErrors: FormError[] = [];

    const leftShoulder = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
    const leftHip = landmarks[PoseLandmarkIndex.LEFT_HIP];
    const rightHip = landmarks[PoseLandmarkIndex.RIGHT_HIP];
    const leftKnee = landmarks[PoseLandmarkIndex.LEFT_KNEE];
    const rightKnee = landmarks[PoseLandmarkIndex.RIGHT_KNEE];
    const leftAnkle = landmarks[PoseLandmarkIndex.LEFT_ANKLE];
    const rightAnkle = landmarks[PoseLandmarkIndex.RIGHT_ANKLE];

    // 1. Knee Cave / Valgus Calculation
    let kneeCaveRatio = 1.0;
    const bothKneesVisible =
      this.processor.isVisible(leftKnee) && this.processor.isVisible(rightKnee);
    const bothAnklesVisible =
      this.processor.isVisible(leftAnkle) && this.processor.isVisible(rightAnkle);

    if (bothKneesVisible && bothAnklesVisible) {
      const kneeSpan = this.processor.getDistance2D(leftKnee, rightKnee);
      const ankleSpan = this.processor.getDistance2D(leftAnkle, rightAnkle);
      if (ankleSpan > 0.05) {
        kneeCaveRatio = parseFloat((kneeSpan / ankleSpan).toFixed(2));
      }
    }

    if (isDescendingOrBottom && kneeAngle < 130) {
      if (kneeCaveRatio < SQUAT_THRESHOLDS.kneeCaveRatioMin) {
        candidateErrors.push({
          ruleId: SQUAT_RULES.KNEES_CAVING.id,
          message: SQUAT_RULES.KNEES_CAVING.voiceMessage,
          visualMessage: SQUAT_RULES.KNEES_CAVING.visualMessage,
          severity: 'warning',
          priority: SQUAT_RULES.KNEES_CAVING.priority,
          highlightJoints: SQUAT_RULES.KNEES_CAVING.highlightJoints,
        });
      }
    }

    // 2. Insufficient Depth Warning
    if (isRepTransitioningUp && lowestAngleInRep > SQUAT_THRESHOLDS.insufficientDepthMaxAngle) {
      candidateErrors.push({
        ruleId: SQUAT_RULES.INSUFFICIENT_DEPTH.id,
        message: SQUAT_RULES.INSUFFICIENT_DEPTH.voiceMessage,
        visualMessage: SQUAT_RULES.INSUFFICIENT_DEPTH.visualMessage,
        severity: 'info',
        priority: SQUAT_RULES.INSUFFICIENT_DEPTH.priority,
        highlightJoints: SQUAT_RULES.INSUFFICIENT_DEPTH.highlightJoints,
      });
    }

    // 3. Torso / Chest Inclination Angle relative to vertical
    let torsoAngle = 0;
    const shoulder = this.processor.isVisible(leftShoulder) ? leftShoulder : rightShoulder;
    const hip = this.processor.isVisible(leftHip) ? leftHip : rightHip;

    if (shoulder && hip) {
      const dx = Math.abs(shoulder.x - hip.x);
      const dy = Math.abs(shoulder.y - hip.y);
      if (dy > 0) {
        torsoAngle = Math.round((Math.atan2(dx, dy) * 180.0) / Math.PI);
      }
    }

    if (isDescendingOrBottom && torsoAngle > SQUAT_THRESHOLDS.maxChestLeanAngle) {
      candidateErrors.push({
        ruleId: SQUAT_RULES.CHEST_FALLING.id,
        message: SQUAT_RULES.CHEST_FALLING.voiceMessage,
        visualMessage: SQUAT_RULES.CHEST_FALLING.visualMessage,
        severity: 'warning',
        priority: SQUAT_RULES.CHEST_FALLING.priority,
        highlightJoints: SQUAT_RULES.CHEST_FALLING.highlightJoints,
      });
    }

    return {
      candidateErrors,
      kneeCaveRatio,
      torsoAngle,
    };
  }
}
