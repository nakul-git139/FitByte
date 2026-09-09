import { BaseExerciseEngine } from './core/BaseExerciseEngine';
import { PushupEngine } from './exercises/pushup/PushupEngine';
import { SquatEngine } from './exercises/squat/SquatEngine';
import { PullupEngine } from './exercises/pullup/PullupEngine';
import { PlankEngine } from './exercises/plank/PlankEngine';
import { BicepCurlEngine } from './exercises/bicepcurl/BicepCurlEngine';
import { JumpingJackEngine } from './exercises/jumpingjack/JumpingJackEngine';
import { MountainClimberEngine } from './exercises/mountainclimber/MountainClimberEngine';
import { LungeEngine } from './exercises/lunge/LungeEngine';

export const SUPPORTED_EXERCISES = [
  'Pushups',
  'Squats',
  'Pullups',
  'Plank',
  'Bicep Curls',
  'Jumping Jacks',
  'Mountain Climbers',
  'Lunges',
] as const;

export type SupportedExercise = typeof SUPPORTED_EXERCISES[number];

export class ExerciseEngineRegistry {
  private static engines: Map<string, BaseExerciseEngine> = new Map();

  public static getEngine(exerciseName: string): BaseExerciseEngine {
    const normalizedName = exerciseName.toLowerCase().replace(/[-_ ]/g, '');

    if (normalizedName.includes('pushup')) {
      if (!this.engines.has('Pushups')) this.engines.set('Pushups', new PushupEngine());
      return this.engines.get('Pushups')!;
    }

    if (normalizedName.includes('squat')) {
      if (!this.engines.has('Squats')) this.engines.set('Squats', new SquatEngine());
      return this.engines.get('Squats')!;
    }

    if (normalizedName.includes('pullup') || normalizedName.includes('chinup')) {
      if (!this.engines.has('Pullups')) this.engines.set('Pullups', new PullupEngine());
      return this.engines.get('Pullups')!;
    }

    if (normalizedName.includes('plank')) {
      if (!this.engines.has('Plank')) this.engines.set('Plank', new PlankEngine());
      return this.engines.get('Plank')!;
    }

    if (normalizedName.includes('bicep') || normalizedName.includes('curl')) {
      if (!this.engines.has('Bicep Curls')) this.engines.set('Bicep Curls', new BicepCurlEngine());
      return this.engines.get('Bicep Curls')!;
    }

    if (normalizedName.includes('jumping') || normalizedName.includes('jack')) {
      if (!this.engines.has('Jumping Jacks')) this.engines.set('Jumping Jacks', new JumpingJackEngine());
      return this.engines.get('Jumping Jacks')!;
    }

    if (normalizedName.includes('mountain') || normalizedName.includes('climber')) {
      if (!this.engines.has('Mountain Climbers')) this.engines.set('Mountain Climbers', new MountainClimberEngine());
      return this.engines.get('Mountain Climbers')!;
    }

    if (normalizedName.includes('lunge')) {
      if (!this.engines.has('Lunges')) this.engines.set('Lunges', new LungeEngine());
      return this.engines.get('Lunges')!;
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
