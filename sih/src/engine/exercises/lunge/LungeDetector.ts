import { ExercisePhase } from '../../types';
import { LUNGE_THRESHOLDS } from './LungeRules';

export interface LungeTransitionEvent {
  isNewRep: boolean;
  isPerfect: boolean;
  lowestAngle: number;
  phase: ExercisePhase;
}

export class LungeDetector {
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

  public update(kneeAngle: number): LungeTransitionEvent {
    let isNewRep = false;
    let isPerfect = false;

    if (kneeAngle <= 0) {
      return { isNewRep: false, isPerfect: false, lowestAngle: this.lowestAngleInCurrentRep, phase: this.phase };
    }

    switch (this.phase) {
      case 'IDLE':
        if (kneeAngle >= LUNGE_THRESHOLDS.standingMinAngle) {
          this.phase = 'START';
          this.lowestAngleInCurrentRep = 180;
          this.hadErrorsInCurrentRep = false;
        }
        break;

      case 'START':
        if (kneeAngle < LUNGE_THRESHOLDS.lungeTriggerAngle) {
          this.phase = 'DESCENDING';
          this.lowestAngleInCurrentRep = kneeAngle;
        }
        break;

      case 'DESCENDING':
        if (kneeAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = kneeAngle;
        }

        if (kneeAngle <= LUNGE_THRESHOLDS.bottomLungeMaxAngle) {
          this.phase = 'BOTTOM';
        } else if (kneeAngle > this.lowestAngleInCurrentRep + 15 && this.lowestAngleInCurrentRep <= LUNGE_THRESHOLDS.insufficientDepthMaxAngle) {
          this.phase = 'ASCENDING';
        }
        break;

      case 'BOTTOM':
        if (kneeAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = kneeAngle;
        }

        if (kneeAngle > LUNGE_THRESHOLDS.bottomLungeMaxAngle + 12) {
          this.phase = 'ASCENDING';
        }
        break;

      case 'ASCENDING':
        if (kneeAngle >= LUNGE_THRESHOLDS.standingMinAngle) {
          this.phase = 'COMPLETED';
          this.repCount++;

          const isDeep = this.lowestAngleInCurrentRep <= LUNGE_THRESHOLDS.bottomLungeMaxAngle;
          isPerfect = isDeep && !this.hadErrorsInCurrentRep;
          if (isPerfect) this.perfectReps++;

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

  public isAscending(): boolean {
    return this.phase === 'ASCENDING';
  }
}
