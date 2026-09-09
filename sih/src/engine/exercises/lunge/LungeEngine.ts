import { PoseLandmark, PoseLandmarkIndex, ExerciseAnalysisResult } from '../../types';
import { BaseExerciseEngine } from '../../core/BaseExerciseEngine';
import { LungeDetector } from './LungeDetector';
import { LungeFormAnalyzer } from './LungeFormAnalyzer';

export class LungeEngine extends BaseExerciseEngine {
  private detector: LungeDetector;
  private formAnalyzer: LungeFormAnalyzer;

  private readonly requiredLandmarks = [
    PoseLandmarkIndex.LEFT_HIP,
    PoseLandmarkIndex.RIGHT_HIP,
    PoseLandmarkIndex.LEFT_KNEE,
    PoseLandmarkIndex.RIGHT_KNEE,
    PoseLandmarkIndex.LEFT_ANKLE,
    PoseLandmarkIndex.RIGHT_ANKLE,
  ];

  constructor() {
    super('Lunges');
    this.detector = new LungeDetector();
    this.formAnalyzer = new LungeFormAnalyzer(this.landmarkProcessor);
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

    const leftKneeAngle = this.landmarkProcessor.calculateAngle(
      landmarks[PoseLandmarkIndex.LEFT_HIP],
      landmarks[PoseLandmarkIndex.LEFT_KNEE],
      landmarks[PoseLandmarkIndex.LEFT_ANKLE]
    );

    const rightKneeAngle = this.landmarkProcessor.calculateAngle(
      landmarks[PoseLandmarkIndex.RIGHT_HIP],
      landmarks[PoseLandmarkIndex.RIGHT_KNEE],
      landmarks[PoseLandmarkIndex.RIGHT_ANKLE]
    );

    // Front/active knee angle is the deeper flexed knee
    const frontKneeAngle = Math.min(
      leftKneeAngle > 0 ? leftKneeAngle : 180,
      rightKneeAngle > 0 ? rightKneeAngle : 180
    );

    const primaryAngle = frontKneeAngle === 180 ? 0 : frontKneeAngle;

    const repEvent = this.detector.update(primaryAngle);
    this.currentPhase = repEvent.phase;
    this.repCount = this.detector.getRepCount();
    this.perfectReps = this.detector.getPerfectReps();

    const formAnalysis = this.formAnalyzer.analyzeForm(
      landmarks,
      bodyMetrics,
      this.detector.getLowestAngle(),
      this.detector.isAscending()
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
        secondaryAngle: Math.max(leftKneeAngle, rightKneeAngle),
        lowestAngleInRep: this.detector.getLowestAngle(),
      },
      highlightJoints: feedbackResult.highlightJoints,
    };
  }
}
