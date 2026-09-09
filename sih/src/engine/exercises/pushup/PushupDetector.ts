import { ExercisePhase } from '../../types';
import { PUSHUP_THRESHOLDS } from './PushupRules';

export interface RepTransitionEvent {
  isNewRep: boolean;
  isPerfect: boolean;
  lowestAngle: number;
  phase: ExercisePhase;
}

export class PushupDetector {
  private phase: ExercisePhase = 'IDLE';
  private repCount: number = 0;
  private perfectReps: number = 0;
  private lowestAngleInCurrentRep: number = 180;
  private hadErrorsInCurrentRep: boolean = false;
  private lastPhaseChangeTimestamp: number = 0;

  public reset(): void {
    this.phase = 'IDLE';
    this.repCount = 0;
    this.perfectReps = 0;
    this.lowestAngleInCurrentRep = 180;
    this.hadErrorsInCurrentRep = false;
    this.lastPhaseChangeTimestamp = Date.now();
  }

  public recordRepError(): void {
    this.hadErrorsInCurrentRep = true;
  }

  public update(elbowAngle: number, timestamp: number = Date.now()): RepTransitionEvent {
    let isNewRep = false;
    let isPerfect = false;

    if (elbowAngle <= 0) {
      return { isNewRep: false, isPerfect: false, lowestAngle: this.lowestAngleInCurrentRep, phase: this.phase };
    }

    switch (this.phase) {
      case 'IDLE':
        if (elbowAngle >= PUSHUP_THRESHOLDS.armLockoutMinAngle) {
          this.phase = 'START';
          this.lowestAngleInCurrentRep = 180;
          this.hadErrorsInCurrentRep = false;
          this.lastPhaseChangeTimestamp = timestamp;
        }
        break;

      case 'START':
        if (elbowAngle < PUSHUP_THRESHOLDS.descentTriggerAngle) {
          this.phase = 'DESCENDING';
          this.lowestAngleInCurrentRep = elbowAngle;
          this.lastPhaseChangeTimestamp = timestamp;
        }
        break;

      case 'DESCENDING':
        if (elbowAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = elbowAngle;
        }

        if (elbowAngle <= PUSHUP_THRESHOLDS.bottomInflectionAngle) {
          this.phase = 'BOTTOM';
          this.lastPhaseChangeTimestamp = timestamp;
        } else if (elbowAngle > this.lowestAngleInCurrentRep + 15 && this.lowestAngleInCurrentRep <= PUSHUP_THRESHOLDS.insufficientDepthMaxAngle) {
          // Began ascending before full 90°
          this.phase = 'ASCENDING';
          this.lastPhaseChangeTimestamp = timestamp;
        }
        break;

      case 'BOTTOM':
        if (elbowAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = elbowAngle;
        }

        if (elbowAngle > PUSHUP_THRESHOLDS.bottomInflectionAngle + 12) {
          this.phase = 'ASCENDING';
          this.lastPhaseChangeTimestamp = timestamp;
        }
        break;

      case 'ASCENDING':
        if (elbowAngle >= PUSHUP_THRESHOLDS.armLockoutMinAngle) {
          const romDelta = 180 - this.lowestAngleInCurrentRep;
          // Guard: Minimum ROM delta of 40 degrees required to complete a rep
          if (romDelta >= 40) {
            this.repCount++;

            const isDeepRep = this.lowestAngleInCurrentRep <= PUSHUP_THRESHOLDS.bottomInflectionAngle;
            isPerfect = isDeepRep && !this.hadErrorsInCurrentRep;

            if (isPerfect) {
              this.perfectReps++;
            }

            isNewRep = true;
            this.lastPhaseChangeTimestamp = timestamp;
            this.phase = 'COMPLETED';
          }

          // Transition back to START for next rep
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
