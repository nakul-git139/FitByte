import { WorkoutSessionRecord } from '../types/workout';
import { User } from '../types/auth';
import { FoodLogRecord, DailyNutritionSummary } from '../types/nutrition';

const STORAGE_KEY = 'FITPILOT_WORKOUT_HISTORY_V1';
const FOOD_STORAGE_KEY = 'FITPILOT_FOOD_LOGS_V1';
const AUTH_STORAGE_KEY = 'FITPILOT_AUTH_SESSION_V1';
const LEGACY_AUTH_STORAGE_KEY = 'FITBYTE_AUTH_SESSION_V1';

// In-memory cache fallback
let memoryHistory: WorkoutSessionRecord[] = [];
let memoryFoodLogs: FoodLogRecord[] = [];
let memoryAuthSession: { token: string; user: User } | null = null;

export interface DashboardStats {
  totalWorkouts: number;
  totalReps: number;
  totalCalories: number;
  averageFormScore: number;
  dayStreak: number;
  weekDayActive: boolean[]; // [M, T, W, T, F, S, S]
  recentWorkouts: WorkoutSessionRecord[];
}

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
   * Calculates the consecutive day workout streak from session history
   */
  public static calculateDayStreak(history: WorkoutSessionRecord[]): number {
    if (!history || history.length === 0) return 0;

    const uniqueDates = new Set<string>();
    for (const session of history) {
      const rawDate = session.completedAt || session.date;
      if (rawDate) {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            uniqueDates.add(key);
          }
        } catch {}
      }
    }

    if (uniqueDates.size === 0) return 0;

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    let checkDate = new Date(today);
    // If no workout today, check if streak is alive from yesterday
    if (!uniqueDates.has(todayKey)) {
      if (!uniqueDates.has(yesterdayKey)) {
        return 0;
      }
      checkDate = new Date(yesterday);
    }

    let streak = 0;
    while (true) {
      const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (uniqueDates.has(key)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }

  /**
   * Calculates active workout days for the current week (Monday to Sunday)
   */
  public static calculateWeekDayActive(history: WorkoutSessionRecord[]): boolean[] {
    const weekDayActive = [false, false, false, false, false, false, false];
    if (!history || history.length === 0) return weekDayActive;

    const now = new Date();
    const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday

    // Find Monday of the current week at 00:00:00
    const monday = new Date(now);
    monday.setDate(now.getDate() - currentDayOfWeek);
    monday.setHours(0, 0, 0, 0);

    // Find Sunday of the current week at 23:59:59
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    for (const session of history) {
      const rawDate = session.completedAt || session.date;
      if (rawDate) {
        try {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime()) && d >= monday && d <= sunday) {
            const dayIndex = (d.getDay() + 6) % 7;
            weekDayActive[dayIndex] = true;
          }
        } catch {}
      }
    }

    return weekDayActive;
  }

  /**
   * Computes aggregated dashboard metrics for Home, Progress, and Profile screens
   */
  public static async getDashboardStats(): Promise<DashboardStats> {
    const history = await this.getWorkoutHistory();

    if (history.length === 0) {
      return {
        totalWorkouts: 0,
        totalReps: 0,
        totalCalories: 0,
        averageFormScore: 0,
        dayStreak: 0,
        weekDayActive: [false, false, false, false, false, false, false],
        recentWorkouts: [],
      };
    }

    const totalWorkouts = history.length;
    const totalReps = history.reduce((sum, s) => sum + (s.actualReps || 0), 0);
    const totalCalories = history.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
    const avgScore = Math.round(
      history.reduce((sum, s) => sum + (s.formAccuracyScore || 100), 0) / history.length
    );
    const dayStreak = this.calculateDayStreak(history);
    const weekDayActive = this.calculateWeekDayActive(history);

    return {
      totalWorkouts,
      totalReps,
      totalCalories,
      averageFormScore: avgScore,
      dayStreak,
      weekDayActive,
      recentWorkouts: history.slice(0, 10),
    };
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

  /**
   * Saves authenticated user session and JWT token
   */
  public static async saveAuthSession(token: string, user: User): Promise<void> {
    const session = { token, user };
    memoryAuthSession = session;
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
      }
    } catch (e) {
      console.warn('[StorageService] Error saving auth session:', e);
    }
  }

  /**
   * Retrieves stored authenticated user session and JWT token
   */
  public static async getAuthSession(): Promise<{ token: string; user: User } | null> {
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        let raw = (globalThis as any).localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
          raw = (globalThis as any).localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
        }
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.token && parsed.user) {
            memoryAuthSession = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[StorageService] Error reading auth session:', e);
    }
    return memoryAuthSession;
  }

  /**
   * Clears the stored auth session (logout)
   */
  public static async clearAuthSession(): Promise<void> {
    memoryAuthSession = null;
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(AUTH_STORAGE_KEY);
        (globalThis as any).localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[StorageService] Error clearing auth session:', e);
    }
  }

  /**
   * Retrieves all saved food intake logs sorted by date (newest first)
   */
  public static async getFoodLogs(): Promise<FoodLogRecord[]> {
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        const raw = (globalThis as any).localStorage.getItem(FOOD_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            memoryFoodLogs = parsed;
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('[StorageService] Error reading food logs:', e);
    }
    return [...memoryFoodLogs];
  }

  /**
   * Saves a food log entry to persistent history
   */
  public static async saveFoodLog(log: FoodLogRecord): Promise<void> {
    try {
      const existing = await this.getFoodLogs();
      const updated = [log, ...existing.filter((item) => item.id !== log.id)].slice(0, 100);
      memoryFoodLogs = updated;

      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(FOOD_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('[StorageService] Error saving food log:', e);
      memoryFoodLogs = [log, ...memoryFoodLogs].slice(0, 100);
    }
  }

  /**
   * Computes today's (or given date's) nutrition summary
   */
  public static async getDailyNutritionSummary(targetDateStr?: string): Promise<DailyNutritionSummary> {
    const today = new Date();
    const targetDate = targetDateStr || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const logs = await this.getFoodLogs();
    const todayLogs = logs.filter((log) => log.date === targetDate);

    const totalCaloriesConsumed = todayLogs.reduce((sum, item) => sum + (item.totalCalories || 0), 0);
    const totalProteinGrams = todayLogs.reduce((sum, item) => sum + (item.macros?.proteinGrams || 0), 0);
    const totalCarbsGrams = todayLogs.reduce((sum, item) => sum + (item.macros?.carbsGrams || 0), 0);
    const totalFatsGrams = todayLogs.reduce((sum, item) => sum + (item.macros?.fatsGrams || 0), 0);
    const totalFiberGrams = todayLogs.reduce((sum, item) => sum + (item.macros?.fiberGrams || 0), 0);

    return {
      date: targetDate,
      totalCaloriesConsumed,
      totalProteinGrams,
      totalCarbsGrams,
      totalFatsGrams,
      totalFiberGrams,
      mealCount: todayLogs.length,
      loggedMeals: todayLogs,
    };
  }

  /**
   * Clears saved food logs
   */
  public static async clearFoodLogs(): Promise<void> {
    memoryFoodLogs = [];
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(FOOD_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[StorageService] Error clearing food logs:', e);
    }
  }
}
