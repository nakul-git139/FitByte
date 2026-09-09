import { PoseLandmark, PoseLandmarkIndex, FormError, BodyMetrics } from '../../types';
import { LandmarkProcessor } from '../../core/LandmarkProcessor';
import { PUSHUP_RULES, PUSHUP_THRESHOLDS } from './PushupRules';

export class PushupFormAnalyzer {
  private processor: LandmarkProcessor;

  constructor(processor: LandmarkProcessor) {
    this.processor = processor;
  }

  /**
   * Analyzes live landmarks and returns all candidate form errors for the current frame.
   */
  public analyzeForm(
    landmarks: PoseLandmark[],
    bodyMetrics: BodyMetrics,
    elbowAngle: number,
    isDescendingOrBottom: boolean,
    lowestAngleInRep: number,
    isRepTransitioningUp: boolean
  ): {
    candidateErrors: FormError[];
    hipAngle: number;
    elbowWidthRatio: number;
    elbowFlareAngle: number;
  } {
    const candidateErrors: FormError[] = [];

    const leftShoulder = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
    const leftElbow = landmarks[PoseLandmarkIndex.LEFT_ELBOW];
    const rightElbow = landmarks[PoseLandmarkIndex.RIGHT_ELBOW];
    const leftHip = landmarks[PoseLandmarkIndex.LEFT_HIP];
    const rightHip = landmarks[PoseLandmarkIndex.RIGHT_HIP];
    const leftKnee = landmarks[PoseLandmarkIndex.LEFT_KNEE];
    const rightKnee = landmarks[PoseLandmarkIndex.RIGHT_KNEE];
    const leftAnkle = landmarks[PoseLandmarkIndex.LEFT_ANKLE];
    const rightAnkle = landmarks[PoseLandmarkIndex.RIGHT_ANKLE];

    // 1. Calculate Normalized Elbow Width & Flare
    let elbowWidthRatio = 0;
    let elbowFlareAngle = 0;

    const bothShouldersVisible =
      this.processor.isVisible(leftShoulder) && this.processor.isVisible(rightShoulder);
    const bothElbowsVisible =
      this.processor.isVisible(leftElbow) && this.processor.isVisible(rightElbow);

    if (bothShouldersVisible && bothElbowsVisible && bodyMetrics.shoulderWidth > 0.05) {
      const elbowSpan = this.processor.getDistance2D(leftElbow, rightElbow);
      elbowWidthRatio = parseFloat((elbowSpan / bodyMetrics.shoulderWidth).toFixed(2));
    }

    // Torso to upper-arm abduction angle (left and right)
    let leftFlare = 0;
    let rightFlare = 0;
    if (this.processor.isVisible(leftHip) && this.processor.isVisible(leftShoulder) && this.processor.isVisible(leftElbow)) {
      leftFlare = this.processor.calculateAbductionAngle(leftHip, leftShoulder, leftElbow);
    }
    if (this.processor.isVisible(rightHip) && this.processor.isVisible(rightShoulder) && this.processor.isVisible(rightElbow)) {
      rightFlare = this.processor.calculateAbductionAngle(rightHip, rightShoulder, rightElbow);
    }
    elbowFlareAngle = Math.max(leftFlare, rightFlare);

    // Rule 1: ELBOWS TOO WIDE
    // Evaluated during descent / bottom phases when arms are flexing
    if (isDescendingOrBottom || elbowAngle < 135) {
      const isRatioTooWide = elbowWidthRatio > PUSHUP_THRESHOLDS.elbowWidthRatioMax;
      const isFlareTooWide = elbowFlareAngle > PUSHUP_THRESHOLDS.maxElbowFlareAngle;

      if (isRatioTooWide || isFlareTooWide) {
        candidateErrors.push({
          ruleId: PUSHUP_RULES.ELBOWS_TOO_WIDE.id,
          message: PUSHUP_RULES.ELBOWS_TOO_WIDE.voiceMessage,
          visualMessage: PUSHUP_RULES.ELBOWS_TOO_WIDE.visualMessage,
          severity: 'warning',
          priority: PUSHUP_RULES.ELBOWS_TOO_WIDE.priority,
          highlightJoints: PUSHUP_RULES.ELBOWS_TOO_WIDE.highlightJoints,
        });
      }
    }

    // 2. Calculate Hip & Spine Line Collinearity (Hip Sag vs Hip Pike)
    let leftHipAngle = 0;
    let rightHipAngle = 0;

    // Use Ankle if visible, otherwise Knee as fallback
    const leftLegEnd = this.processor.isVisible(leftAnkle) ? leftAnkle : leftKnee;
    const rightLegEnd = this.processor.isVisible(rightAnkle) ? rightAnkle : rightKnee;

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
        // Compute signed perpendicular distance of Hip from the Shoulder->Leg line
        const dx = legEnd.x - shoulder.x;
        const dy = legEnd.y - shoulder.y;
        const lineLength = Math.sqrt(dx * dx + dy * dy);

        let signedOffset = 0;
        if (lineLength > 0.05) {
          // Cross product (Shoulder->Leg x Shoulder->Hip)
          // Positive indicates hip sagging below/outside the spine line
          signedOffset = ((legEnd.x - shoulder.x) * (hip.y - shoulder.y) - (legEnd.y - shoulder.y) * (hip.x - shoulder.x)) / lineLength;
        }

        // If body is oriented horizontally or vertically
        const isSagging = hipAngle < PUSHUP_THRESHOLDS.hipSagAngle && (signedOffset > 0.02 || hip.y > (shoulder.y + legEnd.y) / 2 + 0.03);
        const isPiked = hipAngle < PUSHUP_THRESHOLDS.hipPikeAngle && (signedOffset < -0.02 || hip.y < (shoulder.y + legEnd.y) / 2 - 0.03);

        // Rule 2: HIPS SAGGING
        if (isSagging) {
          candidateErrors.push({
            ruleId: PUSHUP_RULES.HIPS_SAGGING.id,
            message: PUSHUP_RULES.HIPS_SAGGING.voiceMessage,
            visualMessage: PUSHUP_RULES.HIPS_SAGGING.visualMessage,
            severity: 'warning',
            priority: PUSHUP_RULES.HIPS_SAGGING.priority,
            highlightJoints: PUSHUP_RULES.HIPS_SAGGING.highlightJoints,
          });
        }
        // Rule 3: HIPS TOO HIGH (Pike)
        else if (isPiked) {
          candidateErrors.push({
            ruleId: PUSHUP_RULES.HIPS_TOO_HIGH.id,
            message: PUSHUP_RULES.HIPS_TOO_HIGH.voiceMessage,
            visualMessage: PUSHUP_RULES.HIPS_TOO_HIGH.visualMessage,
            severity: 'warning',
            priority: PUSHUP_RULES.HIPS_TOO_HIGH.priority,
            highlightJoints: PUSHUP_RULES.HIPS_TOO_HIGH.highlightJoints,
          });
        }
      }
    }

    // Rule 4: INSUFFICIENT DEPTH
    // Triggered when user begins ascending from bottom without hitting deep elbow flexion
    if (isRepTransitioningUp && lowestAngleInRep > PUSHUP_THRESHOLDS.insufficientDepthMaxAngle) {
      candidateErrors.push({
        ruleId: PUSHUP_RULES.INSUFFICIENT_DEPTH.id,
        message: PUSHUP_RULES.INSUFFICIENT_DEPTH.voiceMessage,
        visualMessage: PUSHUP_RULES.INSUFFICIENT_DEPTH.visualMessage,
        severity: 'info',
        priority: PUSHUP_RULES.INSUFFICIENT_DEPTH.priority,
        highlightJoints: PUSHUP_RULES.INSUFFICIENT_DEPTH.highlightJoints,
      });
    }

    // Rule 5: UNEVEN BODY POSITION / ASYMMETRY
    if (bothShouldersVisible && bodyMetrics.torsoLength > 0.1) {
      const shoulderTilt = Math.abs(leftShoulder.y - rightShoulder.y);
      const normalizedTilt = shoulderTilt / bodyMetrics.torsoLength;

      if (normalizedTilt > PUSHUP_THRESHOLDS.maxAsymmetryRatio) {
        candidateErrors.push({
          ruleId: PUSHUP_RULES.UNEVEN_BODY.id,
          message: PUSHUP_RULES.UNEVEN_BODY.voiceMessage,
          visualMessage: PUSHUP_RULES.UNEVEN_BODY.visualMessage,
          severity: 'warning',
          priority: PUSHUP_RULES.UNEVEN_BODY.priority,
          highlightJoints: PUSHUP_RULES.UNEVEN_BODY.highlightJoints,
        });
      }
    }

    return {
      candidateErrors,
      hipAngle,
      elbowWidthRatio,
      elbowFlareAngle,
    };
  }
}
