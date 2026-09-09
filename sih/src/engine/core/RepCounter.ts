import { ExercisePhase } from '../types';

export interface RepCounterConfig {
  /** Angle threshold at starting / lockout position (e.g. 160° for squat/pushup) */
  startAngle: number;
  /** Angle threshold that triggers the initiation of movement (e.g. 140°) */
  triggerAngle: number;
  /** Angle threshold for full inflection / depth / peak contraction (e.g. <= 90°) */
  inflectionAngle: number;
  /** Incomplete range threshold (e.g. turnaround before 115° is rejected or bad rep) */
  incompleteAngleThreshold?: number;
  /** Minimum range of motion delta in degrees required to count (e.g. 40°) */
  minRangeOfMotionDelta: number;
  /** Direction: 'descending' if angle decreases during work (squat, pushup), 'ascending' if angle increases */
  movementDirection?: 'decreasing_angle' | 'increasing_angle';
  /** Minimum time in ms a rep must take to be valid (rejects noise spikes) */
  minRepDurationMs?: number;
  /** Maximum time in ms before resetting stuck rep state */
  maxRepDurationMs?: number;
  /** Lockout cooldown in ms after a rep before next rep can be registered */
  cooldownBetweenRepsMs?: number;
}

export interface RepEvaluationResult {
  isNewRep: boolean;
  isGoodRep: boolean;
  repCount: number;
  goodReps: number;
  badReps: number;
  formScore: number;
  phase: ExercisePhase;
  lowestAngle: number;
  highestAngle: number;
  currentProgressPercent: number;
}

export class RepCounter {
  private config: Required<RepCounterConfig>;
  private phase: ExercisePhase = 'IDLE';

  private totalReps: number = 0;
  private goodReps: number = 0;
  private badReps: number = 0;

  private peakAngleInCurrentRep: number = 180;
  private valleyAngleInCurrentRep: number = 180;
  private repStartTimestamp: number = 0;
  private lastRepCompletedTimestamp: number = 0;
  private hadErrorsInCurrentRep: boolean = false;

  constructor(config: RepCounterConfig) {
    this.config = {
      startAngle: config.startAngle,
      triggerAngle: config.triggerAngle,
      inflectionAngle: config.inflectionAngle,
      incompleteAngleThreshold: config.incompleteAngleThreshold ?? (config.inflectionAngle + 20),
      minRangeOfMotionDelta: config.minRangeOfMotionDelta,
      movementDirection: config.movementDirection ?? 'decreasing_angle',
      minRepDurationMs: config.minRepDurationMs ?? 350,
      maxRepDurationMs: config.maxRepDurationMs ?? 10000,
      cooldownBetweenRepsMs: config.cooldownBetweenRepsMs ?? 250,
    };
    this.reset();
  }

  public reset(): void {
    this.phase = 'IDLE';
    this.totalReps = 0;
    this.goodReps = 0;
    this.badReps = 0;
    this.peakAngleInCurrentRep = this.config.startAngle;
    this.valleyAngleInCurrentRep = this.config.startAngle;
    this.repStartTimestamp = 0;
    this.lastRepCompletedTimestamp = 0;
    this.hadErrorsInCurrentRep = false;
  }

  public recordFormError(): void {
    this.hadErrorsInCurrentRep = true;
  }

  public update(currentAngle: number, timestamp: number = Date.now()): RepEvaluationResult {
    let isNewRep = false;
    let isGoodRep = false;

    if (currentAngle <= 0 || isNaN(currentAngle)) {
      return this.getResult(false, false);
    }

    const isDecreasing = this.config.movementDirection === 'decreasing_angle';

    // Anti-timeout check: if rep takes too long (e.g. resting halfway), reset to IDLE/START
    if (this.phase !== 'IDLE' && this.phase !== 'START' && this.repStartTimestamp > 0) {
      if (timestamp - this.repStartTimestamp > this.config.maxRepDurationMs) {
        this.phase = 'START';
        this.repStartTimestamp = 0;
        this.hadErrorsInCurrentRep = false;
      }
    }

    // Cooldown gate: prevent duplicate counting immediately after completing a rep
    if (timestamp - this.lastRepCompletedTimestamp < this.config.cooldownBetweenRepsMs) {
      return this.getResult(false, false);
    }

    switch (this.phase) {
      case 'IDLE':
      case 'START':
        // Ready position (e.g. standing / lockout)
        const isAtStart = isDecreasing
          ? currentAngle >= this.config.startAngle
          : currentAngle <= this.config.startAngle;

        if (isAtStart) {
          this.phase = 'START';
          this.peakAngleInCurrentRep = currentAngle;
          this.valleyAngleInCurrentRep = currentAngle;
          this.hadErrorsInCurrentRep = false;
        } else {
          // Trigger movement initiation
          const isTriggered = isDecreasing
            ? currentAngle < this.config.triggerAngle
            : currentAngle > this.config.triggerAngle;

          if (isTriggered) {
            this.phase = 'DESCENDING';
            this.repStartTimestamp = timestamp;
            this.peakAngleInCurrentRep = currentAngle;
            this.valleyAngleInCurrentRep = currentAngle;
          }
        }
        break;

      case 'DESCENDING':
        // Update extremes
        if (currentAngle < this.valleyAngleInCurrentRep) this.valleyAngleInCurrentRep = currentAngle;
        if (currentAngle > this.peakAngleInCurrentRep) this.peakAngleInCurrentRep = currentAngle;

        const reachedInflection = isDecreasing
          ? currentAngle <= this.config.inflectionAngle
          : currentAngle >= this.config.inflectionAngle;

        if (reachedInflection) {
          this.phase = 'BOTTOM';
        } else {
          // Early turnaround detection (e.g., partial rep returning early)
          const isTurningBackEarly = isDecreasing
            ? currentAngle > this.valleyAngleInCurrentRep + 14 && this.valleyAngleInCurrentRep <= this.config.incompleteAngleThreshold
            : currentAngle < this.peakAngleInCurrentRep - 14 && this.peakAngleInCurrentRep >= this.config.incompleteAngleThreshold;

          if (isTurningBackEarly) {
            this.phase = 'ASCENDING';
          }
        }
        break;

      case 'BOTTOM':
        if (currentAngle < this.valleyAngleInCurrentRep) this.valleyAngleInCurrentRep = currentAngle;
        if (currentAngle > this.peakAngleInCurrentRep) this.peakAngleInCurrentRep = currentAngle;

        // Transition back towards start
        const leftBottom = isDecreasing
          ? currentAngle > this.config.inflectionAngle + 12
          : currentAngle < this.config.inflectionAngle - 12;

        if (leftBottom) {
          this.phase = 'ASCENDING';
        }
        break;

      case 'ASCENDING':
        const returnedToStart = isDecreasing
          ? currentAngle >= this.config.startAngle
          : currentAngle <= this.config.startAngle;

        if (returnedToStart) {
          const repDuration = timestamp - this.repStartTimestamp;
          const romDelta = Math.abs(this.peakAngleInCurrentRep - this.valleyAngleInCurrentRep);

          // Verification: Minimum Range of Motion & Minimum Duration to reject fidgeting/jitter
          if (romDelta >= this.config.minRangeOfMotionDelta && repDuration >= this.config.minRepDurationMs) {
            const reachedFullDepth = isDecreasing
              ? this.valleyAngleInCurrentRep <= this.config.inflectionAngle
              : this.peakAngleInCurrentRep >= this.config.inflectionAngle;

            isGoodRep = reachedFullDepth && !this.hadErrorsInCurrentRep;
            this.totalReps++;

            if (isGoodRep) {
              this.goodReps++;
            } else {
              this.badReps++;
            }

            isNewRep = true;
            this.lastRepCompletedTimestamp = timestamp;
            this.phase = 'COMPLETED';
          }

          // Reset trackers for next rep
          this.phase = 'START';
          this.repStartTimestamp = 0;
          this.hadErrorsInCurrentRep = false;
        }
        break;

      case 'COMPLETED':
        this.phase = 'START';
        this.repStartTimestamp = 0;
        this.hadErrorsInCurrentRep = false;
        break;
    }

    return this.getResult(isNewRep, isGoodRep);
  }

  private getResult(isNewRep: boolean, isGoodRep: boolean): RepEvaluationResult {
    const formScore = this.totalReps === 0
      ? 100
      : Math.round((this.goodReps / this.totalReps) * 100);

    return {
      isNewRep,
      isGoodRep,
      repCount: this.totalReps,
      goodReps: this.goodReps,
      badReps: this.badReps,
      formScore,
      phase: this.phase,
      lowestAngle: this.valleyAngleInCurrentRep,
      highestAngle: this.peakAngleInCurrentRep,
      currentProgressPercent: this.calculateProgress(),
    };
  }

  private calculateProgress(): number {
    const isDecreasing = this.config.movementDirection === 'decreasing_angle';
    const totalRom = Math.abs(this.config.startAngle - this.config.inflectionAngle);
    if (totalRom <= 0) return 0;

    const currentRom = isDecreasing
      ? Math.max(0, this.config.startAngle - this.valleyAngleInCurrentRep)
      : Math.max(0, this.peakAngleInCurrentRep - this.config.startAngle);

    return Math.min(100, Math.round((currentRom / totalRom) * 100));
  }

  public getRepCount(): number {
    return this.totalReps;
  }

  public getGoodReps(): number {
    return this.goodReps;
  }

  public getBadReps(): number {
    return this.badReps;
  }

  public getFormScore(): number {
    return this.totalReps === 0 ? 100 : Math.round((this.goodReps / this.totalReps) * 100);
  }

  public getPhase(): ExercisePhase {
    return this.phase;
  }

  public getLowestAngle(): number {
    return this.valleyAngleInCurrentRep;
  }
}
