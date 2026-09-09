export type WorkoutStatus = 'idle' | 'active' | 'paused' | 'completed';

export type CameraFacing = 'front' | 'back';

export interface WorkoutStats {
  durationSeconds: number;
  activeSeconds: number;
  caloriesBurned: number;
  repCount: number;
  perfectReps: number;
  goodReps?: number;
  badReps?: number;
  targetReps?: number;
  formAccuracyScore: number;
  startTime: Date | null;
  endTime: Date | null;
}

export interface PostWorkoutAiAnalysis {
  summary: string;
  strengths: string[];
  areasToImprove: string[];
  nextWorkoutSuggestion: string;
  isFallback?: boolean;
}

export interface CompletedExerciseDetail {
  name: string;
  plannedReps?: number;
  actualReps: number;
  goodReps: number;
  badReps: number;
  formScore: number;
}

export interface WorkoutSummary {
  id: string;
  workoutType: string;
  workoutName?: string;
  mood?: string;
  energyLevel?: number;
  durationSeconds: number;
  activeSeconds: number;
  caloriesBurned: number;
  repCount: number;
  perfectReps: number;
  goodReps?: number;
  badReps?: number;
  targetReps?: number;
  formAccuracyScore: number;
  geminiObservations?: string[];
  aiAnalysis?: PostWorkoutAiAnalysis | null;
  completedAt: Date;
}

export interface WorkoutSessionRecord {
  id: string;
  date: string;
  completedAt: string;
  mood?: string;
  energyLevel?: number;
  workoutName: string;
  workoutType: string;
  exercises: CompletedExerciseDetail[];
  plannedReps: number;
  actualReps: number;
  goodReps: number;
  badReps: number;
  formAccuracyScore: number;
  durationSeconds: number;
  activeSeconds: number;
  caloriesBurned: number;
  geminiObservations: string[];
  aiAnalysis?: PostWorkoutAiAnalysis;
}
