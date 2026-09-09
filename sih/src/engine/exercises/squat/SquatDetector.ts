import { ExercisePhase } from '../../types';
import { SQUAT_THRESHOLDS } from './SquatRules';

export interface SquatTransitionEvent {
  isNewRep: boolean;
  isPerfect: boolean;
  lowestAngle: number;
  phase: ExercisePhase;
}

export class SquatDetector {
  private phase: ExercisePhase = 'IDLE';
  private repCount: number = 0;
  private perfectReps: number = 0;
  private lowestAngleInCurrentRep: number = 180;
  private hadErrorsInCurrentRep: boolean = false;

  public reset(): void {
    this.phase = 'IDLE';
    this.repCount = 0;
    this.perfectReps = 0;
    this.lowestAngleInCurrentRep = 180;
    this.hadErrorsInCurrentRep = false;
  }

  public recordRepError(): void {
    this.hadErrorsInCurrentRep = true;
  }

  public update(kneeAngle: number, timestamp: number = Date.now()): SquatTransitionEvent {
    let isNewRep = false;
    let isPerfect = false;

    if (kneeAngle <= 0) {
      return { isNewRep: false, isPerfect: false, lowestAngle: this.lowestAngleInCurrentRep, phase: this.phase };
    }

    switch (this.phase) {
      case 'IDLE':
        if (kneeAngle >= SQUAT_THRESHOLDS.standingMinAngle) {
          this.phase = 'START';
          this.lowestAngleInCurrentRep = 180;
          this.hadErrorsInCurrentRep = false;
        }
        break;

      case 'START':
        if (kneeAngle < SQUAT_THRESHOLDS.descentTriggerAngle) {
          this.phase = 'DESCENDING';
          this.lowestAngleInCurrentRep = kneeAngle;
        }
        break;

      case 'DESCENDING':
        if (kneeAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = kneeAngle;
        }

        if (kneeAngle <= SQUAT_THRESHOLDS.deepSquatMaxAngle) {
          this.phase = 'BOTTOM';
        } else if (kneeAngle > this.lowestAngleInCurrentRep + 15 && this.lowestAngleInCurrentRep <= SQUAT_THRESHOLDS.insufficientDepthMaxAngle) {
          this.phase = 'ASCENDING';
        }
        break;

      case 'BOTTOM':
        if (kneeAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = kneeAngle;
        }

        if (kneeAngle > SQUAT_THRESHOLDS.deepSquatMaxAngle + 12) {
          this.phase = 'ASCENDING';
        }
        break;

      case 'ASCENDING':
        if (kneeAngle >= SQUAT_THRESHOLDS.standingMinAngle) {
          this.phase = 'COMPLETED';
          this.repCount++;

          const isDeepRep = this.lowestAngleInCurrentRep <= SQUAT_THRESHOLDS.deepSquatMaxAngle;
          isPerfect = isDeepRep && !this.hadErrorsInCurrentRep;

          if (isPerfect) {
            this.perfectReps++;
          }

          isNewRep = true;

          // Ready for next rep
          this.phase = 'START';
          this.lowestAngleInCurrentRep = 180;
          this.hadErrorsInCurrentRep = false;
        }
        break;

      case 'COMPLETED':
        this.phase = 'START';
        this.lowestAngleInCurrentRep = 180;
        this.hadErrorsInCurrentRep = false;
        break;
    }

    return {
      isNewRep,
      isPerfect,
      lowestAngle: this.lowestAngleInCurrentRep,
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

  public getLowestAngle(): number {
    return this.lowestAngleInCurrentRep;
  }

  public isDescendingOrBottom(): boolean {
    return this.phase === 'DESCENDING' || this.phase === 'BOTTOM';
  }

  public isAscending(): boolean {
    return this.phase === 'ASCENDING';
  }
}
