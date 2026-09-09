import { ExercisePhase } from '../../types';
import { MOUNTAIN_CLIMBER_THRESHOLDS } from './MountainClimberRules';

export interface MountainClimberTransitionEvent {
  isNewRep: boolean;
  isPerfect: boolean;
  phase: ExercisePhase;
}

export class MountainClimberDetector {
  private phase: ExercisePhase = 'IDLE';
  private repCount: number = 0;
  private perfectReps: number = 0;
  private activeLeg: 'left' | 'right' = 'left';
  private hadErrorsInCurrentRep: boolean = false;

  public reset(): void {
    this.phase = 'IDLE';
    this.repCount = 0;
    this.perfectReps = 0;
    this.activeLeg = 'left';
    this.hadErrorsInCurrentRep = false;
  }

  public recordRepError(): void {
    this.hadErrorsInCurrentRep = true;
  }

  public update(leftKneeAngle: number, rightKneeAngle: number): MountainClimberTransitionEvent {
    let isNewRep = false;
    let isPerfect = false;

    const isLeftDriven = leftKneeAngle > 0 && leftKneeAngle <= MOUNTAIN_CLIMBER_THRESHOLDS.kneeDriveMaxAngle;
    const isRightDriven = rightKneeAngle > 0 && rightKneeAngle <= MOUNTAIN_CLIMBER_THRESHOLDS.kneeDriveMaxAngle;

    switch (this.phase) {
      case 'IDLE':
      case 'START':
        if (isLeftDriven) {
          this.phase = 'DESCENDING';
          this.activeLeg = 'left';
        } else if (isRightDriven) {
          this.phase = 'DESCENDING';
          this.activeLeg = 'right';
        }
        break;

      case 'DESCENDING':
        if (this.activeLeg === 'left' && isRightDriven) {
          // Alternated leg drive completes full cycle
          this.phase = 'COMPLETED';
          this.repCount++;
          isPerfect = !this.hadErrorsInCurrentRep;
          if (isPerfect) this.perfectReps++;
          isNewRep = true;

          this.activeLeg = 'right';
          this.phase = 'START';
          this.hadErrorsInCurrentRep = false;
        } else if (this.activeLeg === 'right' && isLeftDriven) {
          this.phase = 'COMPLETED';
          this.repCount++;
          isPerfect = !this.hadErrorsInCurrentRep;
          if (isPerfect) this.perfectReps++;
          isNewRep = true;

          this.activeLeg = 'left';
          this.phase = 'START';
          this.hadErrorsInCurrentRep = false;
        }
        break;

      case 'COMPLETED':
        this.phase = 'START';
        this.hadErrorsInCurrentRep = false;
        break;
    }

    return {
      isNewRep,
      isPerfect,
      phase: this.phase,
    };
  }

  public getPhase(): ExercisePhase {
    return this.phase;
  }

  public getRepCount(): number {
    return this.repCount;
  }

  public getPerfectReps(): number {
    return this.perfectReps;
  }
}
