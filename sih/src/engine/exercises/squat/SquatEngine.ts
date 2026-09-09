import { PoseLandmark, PoseLandmarkIndex, ExerciseAnalysisResult } from '../../types';
import { BaseExerciseEngine } from '../../core/BaseExerciseEngine';
import { SquatDetector } from './SquatDetector';
import { SquatFormAnalyzer } from './SquatFormAnalyzer';

export class SquatEngine extends BaseExerciseEngine {
  private detector: SquatDetector;
  private formAnalyzer: SquatFormAnalyzer;

  private readonly requiredLandmarks = [
    PoseLandmarkIndex.LEFT_HIP,
    PoseLandmarkIndex.RIGHT_HIP,
    PoseLandmarkIndex.LEFT_KNEE,
    PoseLandmarkIndex.RIGHT_KNEE,
    PoseLandmarkIndex.LEFT_ANKLE,
    PoseLandmarkIndex.RIGHT_ANKLE,
    PoseLandmarkIndex.LEFT_SHOULDER,
    PoseLandmarkIndex.RIGHT_SHOULDER,
  ];

  constructor() {
    super('Squats');
    this.detector = new SquatDetector();
    this.formAnalyzer = new SquatFormAnalyzer(this.landmarkProcessor);
  }

  public reset(): void {
    super.reset();
    this.detector.reset();
  }

  public processFrame(
    rawLandmarks: PoseLandmark[],
    timestamp: number = Date.now()
  ): ExerciseAnalysisResult {
    // 1. Landmark smoothing
    const landmarks = this.landmarkProcessor.smooth(rawLandmarks);

    // 2. Visibility & Framing Check
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
          kneeCaveRatio: 1.0,
          torsoAngle: 0,
        },
        highlightJoints: [],
      };
    }

    // 3. Extract Body Metrics & Scale Dimensions
    const bodyMetrics = this.landmarkProcessor.extractBodyMetrics(landmarks);

    // 4. Calculate Knee Joint Angles (Left & Right)
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

    let primaryKneeAngle = 0;
    if (leftKneeAngle > 0 && rightKneeAngle > 0) {
      primaryKneeAngle = Math.round((leftKneeAngle + rightKneeAngle) / 2);
    } else if (leftKneeAngle > 0) {
      primaryKneeAngle = leftKneeAngle;
    } else {
      primaryKneeAngle = rightKneeAngle;
    }

    // 5. Update Repetition State Machine
    const repEvent = this.detector.update(primaryKneeAngle, timestamp);
    this.currentPhase = repEvent.phase;
    this.repCount = this.detector.getRepCount();
    this.perfectReps = this.detector.getPerfectReps();

    // 6. Form Analysis Layer
    const formAnalysis = this.formAnalyzer.analyzeForm(
      landmarks,
      bodyMetrics,
      primaryKneeAngle,
      this.detector.isDescendingOrBottom(),
      this.detector.getLowestAngle(),
      this.detector.isAscending()
    );

    if (formAnalysis.candidateErrors.length > 0) {
      this.detector.recordRepError();
    }

    // 7. Feedback Processing (Debounce, Persistence, Cooldown, Audio Dispatch)
    const feedbackResult = this.feedbackManager.processFrameErrors(
      formAnalysis.candidateErrors,
      timestamp
    );

    const isGoodForm = feedbackResult.activeErrors.length === 0;

    return {
      exerciseName: this.exerciseName,
      phase: this.currentPhase,
      repCount: this.repCount,
      perfectReps: this.perfectReps,
      formAccuracyScore: this.getAccuracyScore(),
      activeErrors: feedbackResult.activeErrors,
      primaryFeedback: feedbackResult.primaryFeedback,
      isGoodForm,
      visibilityStatus,
      metrics: {
        primaryAngle: primaryKneeAngle,
        secondaryAngle: leftKneeAngle > 0 ? leftKneeAngle : rightKneeAngle,
        kneeCaveRatio: formAnalysis.kneeCaveRatio,
        torsoAngle: formAnalysis.torsoAngle,
        lowestAngleInRep: this.detector.getLowestAngle(),
      },
      highlightJoints: feedbackResult.highlightJoints,
    };
  }
}
