import { WorkoutSessionRecord } from '../types/workout';

const STORAGE_KEY = 'FITPILOT_WORKOUT_HISTORY_V1';

// In-memory cache fallback
let memoryHistory: WorkoutSessionRecord[] = [];

export class StorageService {
  /**
   * Retrieves all saved workout sessions sorted by date (newest first)
   */
  public static async getWorkoutHistory(): Promise<WorkoutSessionRecord[]> {
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        const raw = (globalThis as any).localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            memoryHistory = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[StorageService] Error reading localStorage:', e);
    }

    return [...memoryHistory];
  }

  /**
   * Saves a completed workout session to persistent history
   */
  public static async saveWorkoutSession(session: WorkoutSessionRecord): Promise<void> {
    try {
      const history = await this.getWorkoutHistory();
      // Prepend newest session
      const updated = [session, ...history.filter((s) => s.id !== session.id)].slice(0, 50); // Keep last 50
      memoryHistory = updated;

      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('[StorageService] Error saving workout session:', e);
      memoryHistory = [session, ...memoryHistory].slice(0, 50);
    }
  }

  /**
   * Computes recent form summary and biomechanics context for Gemini workout generation
   */
  public static async getRecentFormSummary(): Promise<{
    averageFormScore: number;
    totalSessions: number;
    lastExercise: string;
    lastFormScore: number;
    historySummaryText: string;
  }> {
    const history = await this.getWorkoutHistory();

    if (history.length === 0) {
      return {
        averageFormScore: 85,
        totalSessions: 0,
        lastExercise: 'Pushups',
        lastFormScore: 85,
        historySummaryText: 'First workout session - establish baseline volume and form.',
      };
    }

    const recent = history.slice(0, 5);
    const totalScore = recent.reduce((sum, item) => sum + (item.formAccuracyScore || 80), 0);
    const avgScore = Math.round(totalScore / recent.length);
    const lastSession = history[0];

    const exercisesSummary = recent
      .map((s) => `${s.workoutType || s.workoutName} (${s.actualReps} reps, ${s.formAccuracyScore}% form)`)
      .join(', ');

    return {
      averageFormScore: avgScore,
      totalSessions: history.length,
      lastExercise: lastSession.workoutType || 'Pushups',
      lastFormScore: lastSession.formAccuracyScore || 85,
      historySummaryText: `Completed ${history.length} sessions. Recent: ${exercisesSummary}. Average form score: ${avgScore}%.`,
    };
  }

  /**
   * Clears saved history
   */
  public static async clearHistory(): Promise<void> {
    memoryHistory = [];
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[StorageService] Error clearing storage:', e);
    }
  }
}
