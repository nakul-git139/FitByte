import { PoseLandmark, PoseLandmarkIndex, ExerciseAnalysisResult } from '../../types';
import { BaseExerciseEngine } from '../../core/BaseExerciseEngine';
import { PushupDetector } from './PushupDetector';
import { PushupFormAnalyzer } from './PushupFormAnalyzer';

export class PushupEngine extends BaseExerciseEngine {
  private detector: PushupDetector;
  private formAnalyzer: PushupFormAnalyzer;

  private readonly requiredLandmarks = [
    PoseLandmarkIndex.LEFT_SHOULDER,
    PoseLandmarkIndex.RIGHT_SHOULDER,
    PoseLandmarkIndex.LEFT_ELBOW,
    PoseLandmarkIndex.RIGHT_ELBOW,
    PoseLandmarkIndex.LEFT_WRIST,
    PoseLandmarkIndex.RIGHT_WRIST,
    PoseLandmarkIndex.LEFT_HIP,
    PoseLandmarkIndex.RIGHT_HIP,
    PoseLandmarkIndex.LEFT_KNEE,
    PoseLandmarkIndex.RIGHT_KNEE,
  ];

  constructor() {
    super('Pushups');
    this.detector = new PushupDetector();
    this.formAnalyzer = new PushupFormAnalyzer(this.landmarkProcessor);
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
          hipAngle: 0,
          elbowWidthRatio: 0,
          elbowFlareAngle: 0,
        },
        highlightJoints: [],
      };
    }

    // 3. Extract Body Metrics & Scale Dimensions
    const bodyMetrics = this.landmarkProcessor.extractBodyMetrics(landmarks);

    // 4. Calculate Elbow Joint Angles (Left & Right)
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

    // Primary active elbow angle
    let primaryElbowAngle = 0;
    if (leftElbowAngle > 0 && rightElbowAngle > 0) {
      primaryElbowAngle = Math.round((leftElbowAngle + rightElbowAngle) / 2);
    } else if (leftElbowAngle > 0) {
      primaryElbowAngle = leftElbowAngle;
    } else {
      primaryElbowAngle = rightElbowAngle;
    }

    // 5. Update Repetition State Machine
    const repEvent = this.detector.update(primaryElbowAngle, timestamp);
    this.currentPhase = repEvent.phase;
    this.repCount = this.detector.getRepCount();
    this.perfectReps = this.detector.getPerfectReps();

    // 6. Form Analysis Layer
    const formAnalysis = this.formAnalyzer.analyzeForm(
      landmarks,
      bodyMetrics,
      primaryElbowAngle,
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
        primaryAngle: primaryElbowAngle,
        secondaryAngle: leftElbowAngle > 0 ? leftElbowAngle : rightElbowAngle,
        hipAngle: formAnalysis.hipAngle,
        elbowWidthRatio: formAnalysis.elbowWidthRatio,
        elbowFlareAngle: formAnalysis.elbowFlareAngle,
        lowestAngleInRep: this.detector.getLowestAngle(),
      },
      highlightJoints: feedbackResult.highlightJoints,
    };
  }
}
