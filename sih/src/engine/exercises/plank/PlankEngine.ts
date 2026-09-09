import { PoseLandmark, PoseLandmarkIndex, ExerciseAnalysisResult } from '../../types';
import { BaseExerciseEngine } from '../../core/BaseExerciseEngine';
import { PlankDetector } from './PlankDetector';
import { PlankFormAnalyzer } from './PlankFormAnalyzer';

export class PlankEngine extends BaseExerciseEngine {
  private detector: PlankDetector;
  private formAnalyzer: PlankFormAnalyzer;

  private readonly requiredLandmarks = [
    PoseLandmarkIndex.LEFT_SHOULDER,
    PoseLandmarkIndex.RIGHT_SHOULDER,
    PoseLandmarkIndex.LEFT_HIP,
    PoseLandmarkIndex.RIGHT_HIP,
    PoseLandmarkIndex.LEFT_KNEE,
    PoseLandmarkIndex.RIGHT_KNEE,
  ];

  constructor() {
    super('Plank');
    this.detector = new PlankDetector();
    this.formAnalyzer = new PlankFormAnalyzer(this.landmarkProcessor);
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
        repCount: this.detector.getHoldSeconds(),
        perfectReps: this.detector.getPerfectSeconds(),
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
    const formAnalysis = this.formAnalyzer.analyzeForm(landmarks, bodyMetrics);

    const feedbackResult = this.feedbackManager.processFrameErrors(
      formAnalysis.candidateErrors,
      timestamp
    );

    const hasErrors = feedbackResult.activeErrors.length > 0;
    this.detector.update(formAnalysis.hipAngle, hasErrors, timestamp);

    this.currentPhase = this.detector.getPhase();
    this.repCount = this.detector.getHoldSeconds();
    this.perfectReps = this.detector.getPerfectSeconds();

    return {
      exerciseName: this.exerciseName,
      phase: this.currentPhase,
      repCount: this.repCount,
      perfectReps: this.perfectReps,
      formAccuracyScore: this.getAccuracyScore(),
      activeErrors: feedbackResult.activeErrors,
      primaryFeedback: feedbackResult.primaryFeedback,
      isGoodForm: !hasErrors,
      visibilityStatus,
      metrics: {
        primaryAngle: formAnalysis.hipAngle,
        hipAngle: formAnalysis.hipAngle,
        holdSeconds: this.repCount,
      },
      highlightJoints: feedbackResult.highlightJoints,
    };
  }
}
