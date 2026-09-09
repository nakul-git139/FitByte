import { ExercisePhase } from '../../types';
import { PLANK_THRESHOLDS } from './PlankRules';

export class PlankDetector {
  private phase: ExercisePhase = 'IDLE';
  private holdSeconds: number = 0;
  private perfectSeconds: number = 0;
  private lastTickTimestamp: number = 0;

  public reset(): void {
    this.phase = 'IDLE';
    this.holdSeconds = 0;
    this.perfectSeconds = 0;
    this.lastTickTimestamp = 0;
  }

  public update(hipAngle: number, hasErrors: boolean, timestamp: number = Date.now()): void {
    if (hipAngle >= PLANK_THRESHOLDS.hipSaggingAngle) {
      if (this.phase === 'IDLE') {
        this.phase = 'START';
        this.lastTickTimestamp = timestamp;
      }

      if (this.lastTickTimestamp > 0 && timestamp - this.lastTickTimestamp >= 1000) {
        const elapsedSec = Math.floor((timestamp - this.lastTickTimestamp) / 1000);
        this.holdSeconds += elapsedSec;
        if (!hasErrors) {
          this.perfectSeconds += elapsedSec;
        }
        this.lastTickTimestamp += elapsedSec * 1000;
      }
    } else {
      if (this.phase === 'START') {
        this.phase = 'IDLE';
        this.lastTickTimestamp = 0;
      }
    }
  }

  public getPhase(): ExercisePhase {
    return this.phase;
  }

  public getHoldSeconds(): number {
    return this.holdSeconds;
  }

  public getPerfectSeconds(): number {
    return this.perfectSeconds;
  }
}
