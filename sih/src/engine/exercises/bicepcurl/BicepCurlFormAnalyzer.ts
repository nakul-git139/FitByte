import { PoseLandmark, PoseLandmarkIndex, FormError, BodyMetrics } from '../../types';
import { LandmarkProcessor } from '../../core/LandmarkProcessor';
import { BICEP_CURL_RULES, BICEP_CURL_THRESHOLDS } from './BicepCurlRules';

export class BicepCurlFormAnalyzer {
  private processor: LandmarkProcessor;

  constructor(processor: LandmarkProcessor) {
    this.processor = processor;
  }

  public analyzeForm(
    landmarks: PoseLandmark[],
    bodyMetrics: BodyMetrics,
    isCurling: boolean,
    lowestAngleInRep: number,
    isRepTransitioningDown: boolean
  ): {
    candidateErrors: FormError[];
    elbowDriftAngle: number;
  } {
    const candidateErrors: FormError[] = [];

    const leftShoulder = landmarks[PoseLandmarkIndex.LEFT_SHOULDER];
    const rightShoulder = landmarks[PoseLandmarkIndex.RIGHT_SHOULDER];
    const leftElbow = landmarks[PoseLandmarkIndex.LEFT_ELBOW];
    const rightElbow = landmarks[PoseLandmarkIndex.RIGHT_ELBOW];
    const leftHip = landmarks[PoseLandmarkIndex.LEFT_HIP];
    const rightHip = landmarks[PoseLandmarkIndex.RIGHT_HIP];

    // 1. Elbow Drift / Flare Angle
    let leftDrift = 0;
    let rightDrift = 0;

    if (this.processor.isVisible(leftHip) && this.processor.isVisible(leftShoulder) && this.processor.isVisible(leftElbow)) {
      leftDrift = this.processor.calculateAbductionAngle(leftHip, leftShoulder, leftElbow);
    }
    if (this.processor.isVisible(rightHip) && this.processor.isVisible(rightShoulder) && this.processor.isVisible(rightElbow)) {
      rightDrift = this.processor.calculateAbductionAngle(rightHip, rightShoulder, rightElbow);
    }

    const elbowDriftAngle = Math.max(leftDrift, rightDrift);

    if (isCurling && elbowDriftAngle > BICEP_CURL_THRESHOLDS.maxElbowDriftAngle) {
      candidateErrors.push({
        ruleId: BICEP_CURL_RULES.ELBOW_DRIFTING.id,
        message: BICEP_CURL_RULES.ELBOW_DRIFTING.voiceMessage,
        visualMessage: BICEP_CURL_RULES.ELBOW_DRIFTING.visualMessage,
        severity: 'warning',
        priority: BICEP_CURL_RULES.ELBOW_DRIFTING.priority,
        highlightJoints: BICEP_CURL_RULES.ELBOW_DRIFTING.highlightJoints,
      });
    }

    // 2. Incomplete Peak Contraction
    if (isRepTransitioningDown && lowestAngleInRep > BICEP_CURL_THRESHOLDS.insufficientRangeMaxAngle) {
      candidateErrors.push({
        ruleId: BICEP_CURL_RULES.INSUFFICIENT_RANGE.id,
        message: BICEP_CURL_RULES.INSUFFICIENT_RANGE.voiceMessage,
        visualMessage: BICEP_CURL_RULES.INSUFFICIENT_RANGE.visualMessage,
        severity: 'info',
        priority: BICEP_CURL_RULES.INSUFFICIENT_RANGE.priority,
        highlightJoints: BICEP_CURL_RULES.INSUFFICIENT_RANGE.highlightJoints,
      });
    }

    return {
      candidateErrors,
      elbowDriftAngle,
    };
  }
}
