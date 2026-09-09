import { PoseLandmark, ExerciseAnalysisResult, ExercisePhase, FormError } from '../types';
import { LandmarkProcessor } from './LandmarkProcessor';
import { FeedbackManager } from './FeedbackManager';

export abstract class BaseExerciseEngine {
  protected landmarkProcessor: LandmarkProcessor;
  protected feedbackManager: FeedbackManager;
  public exerciseName: string;

  protected repCount: number = 0;
  protected perfectReps: number = 0;
  protected currentPhase: ExercisePhase = 'IDLE';

  constructor(exerciseName: string) {
    this.exerciseName = exerciseName;
    this.landmarkProcessor = new LandmarkProcessor();
    this.feedbackManager = new FeedbackManager();
  }

  public abstract processFrame(
    rawLandmarks: PoseLandmark[],
    timestamp?: number
  ): ExerciseAnalysisResult;

  public reset(): void {
    this.repCount = 0;
    this.perfectReps = 0;
    this.currentPhase = 'IDLE';
    this.landmarkProcessor.reset();
    this.feedbackManager.reset();
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public getPerfectReps(): number {
    return this.perfectReps;
  }

  public getAccuracyScore(): number {
    if (this.repCount === 0) return 100;
    return Math.round((this.perfectReps / this.repCount) * 100);
  }

  public getPhase(): ExercisePhase {
    return this.currentPhase;
  }
}
