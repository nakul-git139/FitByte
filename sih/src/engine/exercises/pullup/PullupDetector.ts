import { ExercisePhase } from '../../types';
import { PULLUP_THRESHOLDS } from './PullupRules';

export interface PullupTransitionEvent {
  isNewRep: boolean;
  isPerfect: boolean;
  lowestAngle: number;
  phase: ExercisePhase;
}

export class PullupDetector {
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

  public update(elbowAngle: number, timestamp: number = Date.now()): PullupTransitionEvent {
    let isNewRep = false;
    let isPerfect = false;

    if (elbowAngle <= 0) {
      return { isNewRep: false, isPerfect: false, lowestAngle: this.lowestAngleInCurrentRep, phase: this.phase };
    }

    switch (this.phase) {
      case 'IDLE':
        if (elbowAngle >= PULLUP_THRESHOLDS.deadHangMinAngle) {
          this.phase = 'START';
          this.lowestAngleInCurrentRep = 180;
          this.hadErrorsInCurrentRep = false;
        }
        break;

      case 'START':
        if (elbowAngle < PULLUP_THRESHOLDS.ascentTriggerAngle) {
          this.phase = 'ASCENDING';
          this.lowestAngleInCurrentRep = elbowAngle;
        }
        break;

      case 'ASCENDING':
        if (elbowAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = elbowAngle;
        }

        if (elbowAngle <= PULLUP_THRESHOLDS.chinOverBarAngle) {
          this.phase = 'BOTTOM'; // Peak top position
        } else if (elbowAngle > this.lowestAngleInCurrentRep + 15 && this.lowestAngleInCurrentRep <= PULLUP_THRESHOLDS.insufficientHeightMaxAngle) {
          this.phase = 'DESCENDING';
        }
        break;

      case 'BOTTOM':
        if (elbowAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = elbowAngle;
        }

        if (elbowAngle > PULLUP_THRESHOLDS.chinOverBarAngle + 12) {
          this.phase = 'DESCENDING';
        }
        break;

      case 'DESCENDING':
        if (elbowAngle >= PULLUP_THRESHOLDS.deadHangMinAngle) {
          this.phase = 'COMPLETED';
          this.repCount++;

          const isFullRep = this.lowestAngleInCurrentRep <= PULLUP_THRESHOLDS.chinOverBarAngle;
          isPerfect = isFullRep && !this.hadErrorsInCurrentRep;

          if (isPerfect) {
            this.perfectReps++;
          }

          isNewRep = true;
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

  public isAscendingOrTop(): boolean {
    return this.phase === 'ASCENDING' || this.phase === 'BOTTOM';
  }

  public isDescending(): boolean {
    return this.phase === 'DESCENDING';
  }
}
