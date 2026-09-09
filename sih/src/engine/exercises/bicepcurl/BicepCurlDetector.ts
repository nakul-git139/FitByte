import { ExercisePhase } from '../../types';
import { BICEP_CURL_THRESHOLDS } from './BicepCurlRules';

export interface BicepCurlTransitionEvent {
  isNewRep: boolean;
  isPerfect: boolean;
  lowestAngle: number;
  phase: ExercisePhase;
}

export class BicepCurlDetector {
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

  public update(elbowAngle: number, timestamp: number = Date.now()): BicepCurlTransitionEvent {
    let isNewRep = false;
    let isPerfect = false;

    if (elbowAngle <= 0) {
      return { isNewRep: false, isPerfect: false, lowestAngle: this.lowestAngleInCurrentRep, phase: this.phase };
    }

    switch (this.phase) {
      case 'IDLE':
        if (elbowAngle >= BICEP_CURL_THRESHOLDS.armExtensionMinAngle) {
          this.phase = 'START';
          this.lowestAngleInCurrentRep = 180;
          this.hadErrorsInCurrentRep = false;
        }
        break;

      case 'START':
        if (elbowAngle < BICEP_CURL_THRESHOLDS.curlTriggerAngle) {
          this.phase = 'ASCENDING';
          this.lowestAngleInCurrentRep = elbowAngle;
        }
        break;

      case 'ASCENDING':
        if (elbowAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = elbowAngle;
        }

        if (elbowAngle <= BICEP_CURL_THRESHOLDS.peakContractionAngle) {
          this.phase = 'BOTTOM'; // Peak top squeeze
        } else if (elbowAngle > this.lowestAngleInCurrentRep + 15 && this.lowestAngleInCurrentRep <= BICEP_CURL_THRESHOLDS.insufficientRangeMaxAngle) {
          this.phase = 'DESCENDING';
        }
        break;

      case 'BOTTOM':
        if (elbowAngle < this.lowestAngleInCurrentRep) {
          this.lowestAngleInCurrentRep = elbowAngle;
        }

        if (elbowAngle > BICEP_CURL_THRESHOLDS.peakContractionAngle + 12) {
          this.phase = 'DESCENDING';
        }
        break;

      case 'DESCENDING':
        if (elbowAngle >= BICEP_CURL_THRESHOLDS.armExtensionMinAngle) {
          this.phase = 'COMPLETED';
          this.repCount++;

          const isFullRange = this.lowestAngleInCurrentRep <= BICEP_CURL_THRESHOLDS.peakContractionAngle;
          isPerfect = isFullRange && !this.hadErrorsInCurrentRep;

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

  public isCurling(): boolean {
    return this.phase === 'ASCENDING' || this.phase === 'BOTTOM';
  }

  public isDescending(): boolean {
    return this.phase === 'DESCENDING';
  }
}
