import { PoseLandmark, PoseLandmarkIndex, ExerciseAnalysisResult } from '../../types';
import { BaseExerciseEngine } from '../../core/BaseExerciseEngine';
import { BicepCurlDetector } from './BicepCurlDetector';
import { BicepCurlFormAnalyzer } from './BicepCurlFormAnalyzer';

export class BicepCurlEngine extends BaseExerciseEngine {
  private detector: BicepCurlDetector;
  private formAnalyzer: BicepCurlFormAnalyzer;

  private readonly requiredLandmarks = [
    PoseLandmarkIndex.LEFT_SHOULDER,
    PoseLandmarkIndex.RIGHT_SHOULDER,
    PoseLandmarkIndex.LEFT_ELBOW,
    PoseLandmarkIndex.RIGHT_ELBOW,
    PoseLandmarkIndex.LEFT_WRIST,
    PoseLandmarkIndex.RIGHT_WRIST,
    PoseLandmarkIndex.LEFT_HIP,
    PoseLandmarkIndex.RIGHT_HIP,
  ];

  constructor() {
    super('Bicep Curls');
    this.detector = new BicepCurlDetector();
    this.formAnalyzer = new BicepCurlFormAnalyzer(this.landmarkProcessor);
  }

  public reset(): void {
    super.reset();
    this.detector.reset();
  }

  public processFrame(
    rawLandmarks: PoseLandmark[],
    timestamp: number = Date.now()
  ): ExerciseAnalysisResult {
    const landmarks = this.landmarkProcessor.smooth(rawLandmarks);

    const visibilityStatus = this.landmarkProcessor.checkVisibility(
      landmarks,
      this.requiredLandmarks,
      0.3
    );

    if (!visibilityStatus.isFullyVisible || landmarks.length === 0) {
      return {
        exerciseName: this.exerciseName,
        phase: this.currentPhase,
        repCount: this.repCount,
        perfectReps: this.perfectReps,
        formAccuracyScore: this.getAccuracyScore(),
        activeErrors: [],
        primaryFeedback: null,
        isGoodForm: true,
        visibilityStatus,
        metrics: {
          primaryAngle: 0,
        },
        highlightJoints: [],
      };
    }

    const bodyMetrics = this.landmarkProcessor.extractBodyMetrics(landmarks);

    const leftElbowAngle = this.landmarkProcessor.calculateAngle(
      landmarks[PoseLandmarkIndex.LEFT_SHOULDER],
      landmarks[PoseLandmarkIndex.LEFT_ELBOW],
      landmarks[PoseLandmarkIndex.LEFT_WRIST]
    );

    const rightElbowAngle = this.landmarkProcessor.calculateAngle(
      landmarks[PoseLandmarkIndex.RIGHT_SHOULDER],
      landmarks[PoseLandmarkIndex.RIGHT_ELBOW],
      landmarks[PoseLandmarkIndex.RIGHT_WRIST]
    );

    let primaryAngle = 0;
    if (leftElbowAngle > 0 && rightElbowAngle > 0) {
      primaryAngle = Math.round((leftElbowAngle + rightElbowAngle) / 2);
    } else if (leftElbowAngle > 0) {
      primaryAngle = leftElbowAngle;
    } else {
      primaryAngle = rightElbowAngle;
    }

    const repEvent = this.detector.update(primaryAngle, timestamp);
    this.currentPhase = repEvent.phase;
    this.repCount = this.detector.getRepCount();
    this.perfectReps = this.detector.getPerfectReps();

    const formAnalysis = this.formAnalyzer.analyzeForm(
      landmarks,
      bodyMetrics,
      this.detector.isCurling(),
      this.detector.getLowestAngle(),
      this.detector.isDescending()
    );

    if (formAnalysis.candidateErrors.length > 0) {
      this.detector.recordRepError();
    }

    const feedbackResult = this.feedbackManager.processFrameErrors(
      formAnalysis.candidateErrors,
      timestamp
    );

    return {
      exerciseName: this.exerciseName,
      phase: this.currentPhase,
      repCount: this.repCount,
      perfectReps: this.perfectReps,
      formAccuracyScore: this.getAccuracyScore(),
      activeErrors: feedbackResult.activeErrors,
      primaryFeedback: feedbackResult.primaryFeedback,
      isGoodForm: feedbackResult.activeErrors.length === 0,
      visibilityStatus,
      metrics: {
        primaryAngle: primaryAngle,
        secondaryAngle: leftElbowAngle > 0 ? leftElbowAngle : rightElbowAngle,
        elbowDriftAngle: formAnalysis.elbowDriftAngle,
        lowestAngleInRep: this.detector.getLowestAngle(),
      },
      highlightJoints: feedbackResult.highlightJoints,
    };
  }
}
