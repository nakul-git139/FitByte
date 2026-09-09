import { PoseLandmark, PoseLandmarkIndex, ExerciseAnalysisResult } from '../../types';
import { BaseExerciseEngine } from '../../core/BaseExerciseEngine';
import { JumpingJackDetector } from './JumpingJackDetector';
import { JumpingJackFormAnalyzer } from './JumpingJackFormAnalyzer';

export class JumpingJackEngine extends BaseExerciseEngine {
  private detector: JumpingJackDetector;
  private formAnalyzer: JumpingJackFormAnalyzer;

  private readonly requiredLandmarks = [
    PoseLandmarkIndex.LEFT_SHOULDER,
    PoseLandmarkIndex.RIGHT_SHOULDER,
    PoseLandmarkIndex.LEFT_WRIST,
    PoseLandmarkIndex.RIGHT_WRIST,
    PoseLandmarkIndex.LEFT_HIP,
    PoseLandmarkIndex.RIGHT_HIP,
    PoseLandmarkIndex.LEFT_ANKLE,
    PoseLandmarkIndex.RIGHT_ANKLE,
  ];

  constructor() {
    super('Jumping Jacks');
    this.detector = new JumpingJackDetector();
    this.formAnalyzer = new JumpingJackFormAnalyzer(this.landmarkProcessor);
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

    // Arm angle with torso
    const leftArmAngle = this.landmarkProcessor.calculateAbductionAngle(
      landmarks[PoseLandmarkIndex.LEFT_HIP],
      landmarks[PoseLandmarkIndex.LEFT_SHOULDER],
      landmarks[PoseLandmarkIndex.LEFT_WRIST]
    );

    const rightArmAngle = this.landmarkProcessor.calculateAbductionAngle(
      landmarks[PoseLandmarkIndex.RIGHT_HIP],
      landmarks[PoseLandmarkIndex.RIGHT_SHOULDER],
      landmarks[PoseLandmarkIndex.RIGHT_WRIST]
    );

    const avgArmAngle = Math.round((leftArmAngle + rightArmAngle) / 2);

    // Feet span ratio
    let feetSpanRatio = 0;
    const leftAnkle = landmarks[PoseLandmarkIndex.LEFT_ANKLE];
    const rightAnkle = landmarks[PoseLandmarkIndex.RIGHT_ANKLE];
    if (this.landmarkProcessor.isVisible(leftAnkle) && this.landmarkProcessor.isVisible(rightAnkle) && bodyMetrics.shoulderWidth > 0.05) {
      const feetDistance = this.landmarkProcessor.getDistance2D(leftAnkle, rightAnkle);
      feetSpanRatio = parseFloat((feetDistance / bodyMetrics.shoulderWidth).toFixed(2));
    }

    const repEvent = this.detector.update(avgArmAngle, feetSpanRatio);
    this.currentPhase = repEvent.phase;
    this.repCount = this.detector.getRepCount();
    this.perfectReps = this.detector.getPerfectReps();

    const formAnalysis = this.formAnalyzer.analyzeForm(
      landmarks,
      bodyMetrics,
      avgArmAngle,
      feetSpanRatio,
      this.detector.isOpenPhase()
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
        primaryAngle: avgArmAngle,
        feetSpanRatio: feetSpanRatio,
      },
      highlightJoints: feedbackResult.highlightJoints,
    };
  }
}
