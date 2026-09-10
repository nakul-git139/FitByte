import { CompletedExerciseDetail, PostWorkoutAiAnalysis } from './workout';

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface GeneratedWorkout {
  workoutName: string;
  durationMinutes: number;
  difficulty: 'light' | 'moderate' | 'intense' | 'hard';
  reason: string;
  exercises: GeneratedExercise[];
  isFallback?: boolean;
}

export interface UserProfileData {
  gender?: string;
  age?: number;
  height?: string;
  weight?: string;
  fitnessGoal?: string;
  experienceLevel?: string;
  activityLevel?: string;
  duration?: string;
  equipment?: string;
  workoutHistory?: string;
  previousFormScores?: string;
}

export interface PostWorkoutAnalysisRequest {
  workoutType: string;
  workoutName: string;
  mood?: string;
  energyLevel?: number;
  durationSeconds: number;
  activeSeconds: number;
  caloriesBurned: number;
  repCount: number;
  goodReps: number;
  badReps: number;
  plannedReps?: number;
  formAccuracyScore: number;
  geminiObservations: string[];
  previousWorkoutHistory?: string;
}

export interface PostWorkoutAnalysisResponse extends PostWorkoutAiAnalysis {}
