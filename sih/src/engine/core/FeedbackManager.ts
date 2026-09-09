import { FormError, FeedbackEvent } from '../types';
import { SpeechService } from './SpeechService';

interface RuleTrackingState {
  firstDetectedAt: number;
  lastDetectedAt: number;
  lastTriggeredAt: number;
  isTriggered: boolean;
  wasResolved: boolean;
}

export class FeedbackManager {
  private ruleStates: Map<string, RuleTrackingState> = new Map();
  private lastSpokenRuleId: string | null = null;
  private lastSpokenTime: number = 0;
  private activeVisualFeedback: FormError | null = null;
  private visualFeedbackExpiry: number = 0;

  private defaultPersistenceMs: number = 300; // 200-400 ms persistence window
  private defaultCooldownMs: number = 2000;    // 2s cooldown between repeated alerts

  constructor(persistenceMs?: number, cooldownMs?: number) {
    if (persistenceMs) this.defaultPersistenceMs = persistenceMs;
    if (cooldownMs) this.defaultCooldownMs = cooldownMs;
  }

  public reset(): void {
    this.ruleStates.clear();
    this.lastSpokenRuleId = null;
    this.lastSpokenTime = 0;
    this.activeVisualFeedback = null;
    this.visualFeedbackExpiry = 0;
    SpeechService.stop();
  }

  /**
   * Evaluates candidate form errors from the current frame against persistence, priority, and cooldown rules.
   * Returns filtered active errors and the highest priority error to show/speak.
   */
  public processFrameErrors(
    candidateErrors: FormError[],
    timestamp: number = Date.now(),
    options?: {
      cooldownMs?: number;
      persistenceMs?: number;
      enableVoice?: boolean;
    }
  ): {
    activeErrors: FormError[];
    primaryFeedback: FormError | null;
    highlightJoints: number[];
  } {
    const activeCooldownMs = options?.cooldownMs ?? this.defaultCooldownMs;
    const activePersistenceMs = options?.persistenceMs ?? this.defaultPersistenceMs;
    const enableVoice = options?.enableVoice ?? true;

    const currentCandidateRuleIds = new Set(candidateErrors.map((e) => e.ruleId));

    // 1. Mark missing rules as resolved if they were previously tracked
    this.ruleStates.forEach((state, ruleId) => {
      if (!currentCandidateRuleIds.has(ruleId)) {
        if (timestamp - state.lastDetectedAt > 150) {
          state.wasResolved = true;
          state.firstDetectedAt = 0;
          state.isTriggered = false;
        }
      }
    });

    const validatedErrors: FormError[] = [];
    const highlightJointsSet = new Set<number>();

    // 2. Process each candidate error for persistence and debouncing
    for (const error of candidateErrors) {
      let state = this.ruleStates.get(error.ruleId);
      if (!state) {
        state = {
          firstDetectedAt: timestamp,
          lastDetectedAt: timestamp,
          lastTriggeredAt: 0,
          isTriggered: false,
          wasResolved: false,
        };
        this.ruleStates.set(error.ruleId, state);
      } else {
        if (state.firstDetectedAt === 0) {
          state.firstDetectedAt = timestamp;
        }
        state.lastDetectedAt = timestamp;
      }

      // Add to joints highlight
      if (error.highlightJoints) {
        error.highlightJoints.forEach((j) => highlightJointsSet.add(j));
      }

      const activeDuration = timestamp - state.firstDetectedAt;

      // Persistence check: Must persist for ~200-400 ms before being considered active
      if (activeDuration >= activePersistenceMs) {
        validatedErrors.push(error);
      }
    }

    if (validatedErrors.length === 0) {
      // If visual feedback has expired, clear it
      if (this.activeVisualFeedback && timestamp > this.visualFeedbackExpiry) {
        this.activeVisualFeedback = null;
      }

      return {
        activeErrors: [],
        primaryFeedback: this.activeVisualFeedback,
        highlightJoints: Array.from(highlightJointsSet),
      };
    }

    // 3. Sort by priority descending (highest priority first)
    validatedErrors.sort((a, b) => b.priority - a.priority);
    const topError = validatedErrors[0];

    // 4. Check voice trigger eligibility (Cooldown + No Speech Overlap)
    const topRuleState = this.ruleStates.get(topError.ruleId)!;
    const timeSinceLastTrigger = timestamp - topRuleState.lastTriggeredAt;
    const canTriggerAgain = topRuleState.wasResolved || timeSinceLastTrigger >= activeCooldownMs;

    if (canTriggerAgain) {
      topRuleState.lastTriggeredAt = timestamp;
      topRuleState.wasResolved = false;
      topRuleState.isTriggered = true;

      this.activeVisualFeedback = topError;
      this.visualFeedbackExpiry = timestamp + Math.max(activeCooldownMs, 2200);

      if (enableVoice) {
        SpeechService.speak(topError.message, {
          rate: 1.05,
          pitch: 1.0,
          force: false,
        });
      }
    } else {
      // Still show visually while active
      this.activeVisualFeedback = topError;
      this.visualFeedbackExpiry = timestamp + 1500;
    }

    return {
      activeErrors: validatedErrors,
      primaryFeedback: this.activeVisualFeedback,
      highlightJoints: Array.from(highlightJointsSet),
    };
  }

  public getActiveVisualFeedback(): FormError | null {
    return this.activeVisualFeedback;
  }
}
