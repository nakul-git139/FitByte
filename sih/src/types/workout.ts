export type WorkoutStatus = 'idle' | 'active' | 'paused' | 'completed';

export type CameraFacing = 'front' | 'back';

export interface WorkoutStats {
  durationSeconds: number;
  activeSeconds: number;
  caloriesBurned: number;
  repCount: number;
  perfectReps: number;
  formAccuracyScore: number;
  startTime: Date | null;
  endTime: Date | null;
}

export interface WorkoutSummary {
  id: string;
  workoutType: string;
  durationSeconds: number;
  activeSeconds: number;
  caloriesBurned: number;
  repCount: number;
  perfectReps: number;
  formAccuracyScore: number;
  completedAt: Date;
}
