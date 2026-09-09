import { ExercisePhase } from '../../types';
import { JUMPING_JACK_THRESHOLDS } from './JumpingJackRules';

export interface JumpingJackTransitionEvent {
  isNewRep: boolean;
  isPerfect: boolean;
  phase: ExercisePhase;
}

export class JumpingJackDetector {
  private phase: ExercisePhase = 'IDLE';
  private repCount: number = 0;
  private perfectReps: number = 0;
  private reachedFullOpen: boolean = false;
  private hadErrorsInCurrentRep: boolean = false;

  public reset(): void {
    this.phase = 'IDLE';
    this.repCount = 0;
    this.perfectReps = 0;
    this.reachedFullOpen = false;
    this.hadErrorsInCurrentRep = false;
  }

  public recordRepError(): void {
    this.hadErrorsInCurrentRep = true;
  }

  public update(armAngle: number, feetSpanRatio: number): JumpingJackTransitionEvent {
    let isNewRep = false;
    let isPerfect = false;

    const isFeetApart = feetSpanRatio >= JUMPING_JACK_THRESHOLDS.feetApartRatioMin;
    const isFeetClosed = feetSpanRatio <= JUMPING_JACK_THRESHOLDS.feetClosedRatioMax;
    const isArmsUp = armAngle >= JUMPING_JACK_THRESHOLDS.armOverheadMinAngle;
    const isArmsDown = armAngle <= 65;

    switch (this.phase) {
      case 'IDLE':
      case 'START':
        if (isFeetClosed && isArmsDown) {
          this.phase = 'START';
          this.reachedFullOpen = false;
          this.hadErrorsInCurrentRep = false;
        } else if (armAngle > 90 || feetSpanRatio > 0.9) {
          this.phase = 'DESCENDING'; // Opening phase
        }
        break;

      case 'DESCENDING': // Opening phase
        if (isArmsUp && isFeetApart) {
          this.phase = 'BOTTOM'; // Full open star position
          this.reachedFullOpen = true;
        }
        break;

      case 'BOTTOM': // Full open star position
        if (armAngle < 120 || feetSpanRatio < 1.0) {
          this.phase = 'ASCENDING'; // Closing phase
        }
        break;

      case 'ASCENDING': // Closing phase
        if (isFeetClosed && isArmsDown) {
          this.phase = 'COMPLETED';
          this.repCount++;

          isPerfect = this.reachedFullOpen && !this.hadErrorsInCurrentRep;
          if (isPerfect) {
            this.perfectReps++;
          }

          isNewRep = true;
          this.phase = 'START';
          this.reachedFullOpen = false;
          this.hadErrorsInCurrentRep = false;
        }
        break;

      case 'COMPLETED':
        this.phase = 'START';
        this.reachedFullOpen = false;
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

  public isOpenPhase(): boolean {
    return this.phase === 'BOTTOM';
  }
}
