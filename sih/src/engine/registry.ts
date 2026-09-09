import { BaseExerciseEngine } from './core/BaseExerciseEngine';
import { PushupEngine } from './exercises/pushup/PushupEngine';
import { SquatEngine } from './exercises/squat/SquatEngine';

export const SUPPORTED_EXERCISES = ['Pushups', 'Squats'] as const;
export type SupportedExercise = typeof SUPPORTED_EXERCISES[number];

export class ExerciseEngineRegistry {
  private static engines: Map<string, BaseExerciseEngine> = new Map();

  public static getEngine(exerciseName: string): BaseExerciseEngine {
    const normalizedName = exerciseName.toLowerCase();

    if (normalizedName.includes('pushup')) {
      if (!this.engines.has('Pushups')) {
        this.engines.set('Pushups', new PushupEngine());
      }
      return this.engines.get('Pushups')!;
    }

    if (normalizedName.includes('squat')) {
      if (!this.engines.has('Squats')) {
        this.engines.set('Squats', new SquatEngine());
      }
      return this.engines.get('Squats')!;
    }

    // Default to Pushups engine
    if (!this.engines.has('Pushups')) {
      this.engines.set('Pushups', new PushupEngine());
    }
    return this.engines.get('Pushups')!;
  }

  public static resetAll(): void {
    this.engines.forEach((engine) => engine.reset());
  }
}
