import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutSessionRecord } from '../types/workout';
import { User } from '../types/auth';
import { FoodLogRecord, DailyNutritionSummary } from '../types/nutrition';
import { UserFitnessProfile } from '../types/user';
import { StreakData } from '../types/streak';
import { CommunityPost, CommunityComment } from '../types/community';

const STORAGE_KEY = 'FITPILOT_WORKOUT_HISTORY_V1';
const FOOD_STORAGE_KEY = 'FITPILOT_FOOD_LOGS_V1';
const AUTH_STORAGE_KEY = 'FITPILOT_AUTH_SESSION_V1';
const LEGACY_AUTH_STORAGE_KEY = 'FITBYTE_AUTH_SESSION_V1';
const PROFILE_STORAGE_KEY = 'FITPILOT_USER_PROFILE_V1';
const STREAK_STORAGE_KEY = 'FITPILOT_DAILY_STREAK_V1';
const LOCAL_USERS_STORAGE_KEY = 'FITPILOT_LOCAL_USERS_V1';
const COMMUNITY_POSTS_STORAGE_KEY = 'FITPILOT_LOCAL_COMMUNITY_POSTS_V2';

// In-memory cache fallback
let memoryHistory: WorkoutSessionRecord[] = [];
let memoryFoodLogs: FoodLogRecord[] = [];
let memoryAuthSession: { token: string; user: User } | null = null;
let memoryLocalUsers: Array<{ user: User; password?: string }> = [];
let memoryCommunityPosts: CommunityPost[] = [];
let memoryIsProfileSetup = false;
let memoryUserProfile: UserFitnessProfile = {
  gender: 'male',
  age: 24,
  heightCm: 175,
  weightKg: 70,
  fitnessGoal: 'Muscle Building & Hypertrophy',
  experienceLevel: 'Intermediate',
};
let memoryStreakData: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
  updatedAt: new Date().toISOString(),
};

export interface DashboardStats {
  totalWorkouts: number;
  totalReps: number;
  totalCalories: number;
  averageFormScore: number;
  dayStreak: number;
  longestStreak: number;
  weekDayActive: boolean[]; // [M, T, W, T, F, S, S]
  recentWorkouts: WorkoutSessionRecord[];
}

/**
 * Returns YYYY-MM-DD string in user's local timezone using the built-in Date API
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns YYYY-MM-DD string for yesterday in user's local timezone
 */
export function getYesterdayDateString(date: Date = new Date()): string {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}

export class StorageService {
  /**
   * Retrieves all saved workout sessions sorted by date (newest first)
   */
  public static async getWorkoutHistory(): Promise<WorkoutSessionRecord[]> {
    try {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
      } catch {}
      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        try {
          raw = (globalThis as any).localStorage.getItem(STORAGE_KEY);
        } catch {}
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryHistory = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[StorageService] Error reading workout history:', e);
    }

    return [...memoryHistory];
  }

  /**
   * Saves a completed workout session to persistent history and updates the daily streak
   */
  public static async saveWorkoutSession(session: WorkoutSessionRecord): Promise<void> {
    try {
      const history = await this.getWorkoutHistory();
      // Prepend newest session
      const updated = [session, ...history.filter((s) => s.id !== session.id)].slice(0, 50); // Keep last 50
      memoryHistory = updated;

      const jsonStr = JSON.stringify(updated);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, jsonStr);
      } catch {}
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        try {
          (globalThis as any).localStorage.setItem(STORAGE_KEY, jsonStr);
        } catch {}
      }

      // Record streak completion
      const sessionDate = session.completedAt ? new Date(session.completedAt) : new Date();
      await this.recordWorkoutCompletion(sessionDate);
    } catch (e) {
      console.warn('[StorageService] Error saving workout session:', e);
      memoryHistory = [session, ...memoryHistory].slice(0, 50);
    }
  }

  /**
   * Retrieves the current persistent streak data with local date validation
   */
  public static async getStreakData(): Promise<StreakData> {
    try {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
      } catch {}
      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        try {
          raw = (globalThis as any).localStorage.getItem(STREAK_STORAGE_KEY);
        } catch {}
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.currentStreak === 'number') {
          memoryStreakData = {
            currentStreak: parsed.currentStreak,
            longestStreak: parsed.longestStreak ?? parsed.currentStreak ?? 0,
            lastCompletedDate: parsed.lastCompletedDate ?? null,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
          };
        }
      }
    } catch (e) {
      console.warn('[StorageService] Error reading streak data:', e);
    }

    const todayStr = getLocalDateString();
    const yesterdayStr = getYesterdayDateString();

    const result: StreakData = { ...memoryStreakData };

    // Validate if the streak is still active or expired due to missed days
    if (!result.lastCompletedDate) {
      result.currentStreak = 0;
    } else if (result.lastCompletedDate === todayStr) {
      // Completed workout today -> streak is active
    } else if (result.lastCompletedDate === yesterdayStr) {
      // Completed workout yesterday -> streak is still active for today (waiting for today's workout)
    } else {
      // Last workout was before yesterday -> missed 1 or more days -> current streak is 0
      result.currentStreak = 0;
    }

    return result;
  }

  /**
   * Updates and increments the local daily streak when a workout is completed
   * - Same day workout: preserves streak without double incrementing
   * - Yesterday workout: increments streak by 1
   * - Missed 1+ days / first workout: resets streak to 1
   * - Updates longestStreak
   */
  public static async recordWorkoutCompletion(completedDate: Date = new Date()): Promise<StreakData> {
    // 1. Fetch latest raw stored streak
    let storedStreak = 0;
    let storedLongest = 0;
    let storedLastDate: string | null = null;

    try {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STREAK_STORAGE_KEY);
      } catch {}
      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        try {
          raw = (globalThis as any).localStorage.getItem(STREAK_STORAGE_KEY);
        } catch {}
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.currentStreak === 'number') {
          storedStreak = parsed.currentStreak;
          storedLongest = parsed.longestStreak ?? parsed.currentStreak ?? 0;
          storedLastDate = parsed.lastCompletedDate ?? null;
        }
      } else if (memoryStreakData.lastCompletedDate) {
        storedStreak = memoryStreakData.currentStreak;
        storedLongest = memoryStreakData.longestStreak;
        storedLastDate = memoryStreakData.lastCompletedDate;
      }
    } catch (e) {
      console.warn('[StorageService] Error reading streak for recording:', e);
    }

    const workoutDateStr = getLocalDateString(completedDate);
    const dayBeforeWorkoutStr = getYesterdayDateString(completedDate);

    let newStreak = storedStreak;
    let newLongest = storedLongest;

    if (storedLastDate === workoutDateStr) {
      // Already completed a workout on this day -> do not increase again
      newStreak = Math.max(1, storedStreak);
    } else if (storedLastDate === dayBeforeWorkoutStr) {
      // Previous workout was yesterday -> increment streak by 1
      newStreak = storedStreak + 1;
    } else {
      // Missed 1 or more days (or first ever workout) -> reset current streak to 1
      newStreak = 1;
    }

    newLongest = Math.max(newLongest, newStreak);

    const updated: StreakData = {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastCompletedDate: workoutDateStr,
      updatedAt: new Date().toISOString(),
    };

    memoryStreakData = updated;

    // Persist to AsyncStorage and localStorage
    const jsonStr = JSON.stringify(updated);
    try {
      await AsyncStorage.setItem(STREAK_STORAGE_KEY, jsonStr);
    } catch {}
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(STREAK_STORAGE_KEY, jsonStr);
      }
    } catch {}

    return updated;
  }

  /**
   * Calculates the consecutive day workout streak from session history (fallback helper)
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
            uniqueDates.add(getLocalDateString(d));
          }
        } catch {}
      }
    }

    if (uniqueDates.size === 0) return 0;

    const todayStr = getLocalDateString();
    const yesterdayStr = getYesterdayDateString();

    let checkDate = new Date();
    // If no workout today, check if streak is alive from yesterday
    if (!uniqueDates.has(todayStr)) {
      if (!uniqueDates.has(yesterdayStr)) {
        return 0;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    let streak = 0;
    while (true) {
      const key = getLocalDateString(checkDate);
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
    const streakData = await this.getStreakData();

    if (history.length === 0) {
      return {
        totalWorkouts: 0,
        totalReps: 0,
        totalCalories: 0,
        averageFormScore: 0,
        dayStreak: streakData.currentStreak,
        longestStreak: streakData.longestStreak,
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
    const dayStreak = streakData.currentStreak;
    const longestStreak = Math.max(streakData.longestStreak, dayStreak);
    const weekDayActive = this.calculateWeekDayActive(history);

    return {
      totalWorkouts,
      totalReps,
      totalCalories,
      averageFormScore: avgScore,
      dayStreak,
      longestStreak,
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
   * Clears saved history and resets streak
   */
  public static async clearHistory(): Promise<void> {
    memoryHistory = [];
    memoryStreakData = {
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
      updatedAt: new Date().toISOString(),
    };
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(STREAK_STORAGE_KEY);
    } catch {}
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(STORAGE_KEY);
        (globalThis as any).localStorage.removeItem(STREAK_STORAGE_KEY);
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
    const jsonStr = JSON.stringify(session);
    try {
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, jsonStr);
    } catch {}
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(AUTH_STORAGE_KEY, jsonStr);
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
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
          raw = await AsyncStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
        }
      } catch {}

      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        raw = (globalThis as any).localStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
          raw = (globalThis as any).localStorage.getItem(LEGACY_AUTH_STORAGE_KEY);
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.token && parsed.user) {
          memoryAuthSession = parsed;
          return parsed;
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
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(LEGACY_AUTH_STORAGE_KEY);
    } catch {}
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
   * Retrieves all offline / locally registered users
   */
  public static async getLocalUsers(): Promise<Array<{ user: User; password?: string }>> {
    try {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(LOCAL_USERS_STORAGE_KEY);
      } catch {}

      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        raw = (globalThis as any).localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryLocalUsers = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[StorageService] Error reading local users:', e);
    }
    return [...memoryLocalUsers];
  }

  /**
   * Saves or updates a local user account for offline authentication
   */
  public static async saveLocalAccount(user: User, password?: string): Promise<void> {
    try {
      const existing = await this.getLocalUsers();
      const filtered = existing.filter((u) => u.user.email.toLowerCase() !== user.email.toLowerCase());
      const updated = [...filtered, { user, password }];
      memoryLocalUsers = updated;

      const jsonStr = JSON.stringify(updated);
      try {
        await AsyncStorage.setItem(LOCAL_USERS_STORAGE_KEY, jsonStr);
      } catch {}
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(LOCAL_USERS_STORAGE_KEY, jsonStr);
      }
    } catch (e) {
      console.warn('[StorageService] Error saving local user account:', e);
    }
  }

  /**
   * Finds a local user by email address
   */
  public static async findLocalUserByEmail(email: string): Promise<{ user: User; password?: string } | null> {
    const cleanEmail = email.trim().toLowerCase();
    const users = await this.getLocalUsers();
    return users.find((u) => u.user.email.toLowerCase() === cleanEmail) || null;
  }

  /**
   * Retrieves locally persisted community posts
   */
  public static async getLocalCommunityPosts(): Promise<CommunityPost[]> {
    try {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(COMMUNITY_POSTS_STORAGE_KEY);
      } catch {}

      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        raw = (globalThis as any).localStorage.getItem(COMMUNITY_POSTS_STORAGE_KEY);
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryCommunityPosts = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[StorageService] Error reading local community posts:', e);
    }
    return [...memoryCommunityPosts];
  }

  /**
   * Saves or prepends a community post locally
   */
  public static async saveLocalCommunityPost(post: CommunityPost): Promise<void> {
    try {
      const existing = await this.getLocalCommunityPosts();
      const filtered = existing.filter((p) => p.id !== post.id);
      const updated = [post, ...filtered].slice(0, 100);
      memoryCommunityPosts = updated;

      const jsonStr = JSON.stringify(updated);
      try {
        await AsyncStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, jsonStr);
      } catch {}
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, jsonStr);
      }
    } catch (e) {
      console.warn('[StorageService] Error saving local community post:', e);
    }
  }

  /**
   * Deletes a community post locally
   */
  public static async deleteLocalCommunityPost(postId: string): Promise<void> {
    try {
      const existing = await this.getLocalCommunityPosts();
      const updated = existing.filter((p) => p.id !== postId);
      memoryCommunityPosts = updated;

      const jsonStr = JSON.stringify(updated);
      try {
        await AsyncStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, jsonStr);
      } catch {}
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, jsonStr);
      }
    } catch (e) {
      console.warn('[StorageService] Error deleting local community post:', e);
    }
  }

  /**
   * Updates like status on local post
   */
  public static async toggleLocalPostLike(postId: string, isLiked: boolean): Promise<{ isLiked: boolean; likesCount: number }> {
    const existing = await this.getLocalCommunityPosts();
    let newCount = 0;
    const updated = existing.map((p) => {
      if (p.id === postId) {
        newCount = isLiked ? (p.likesCount || 0) + 1 : Math.max(0, (p.likesCount || 0) - 1);
        return { ...p, isLikedByMe: isLiked, likesCount: newCount };
      }
      return p;
    });
    memoryCommunityPosts = updated;

    try {
      const jsonStr = JSON.stringify(updated);
      await AsyncStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, jsonStr);
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(COMMUNITY_POSTS_STORAGE_KEY, jsonStr);
      }
    } catch {}

    return { isLiked, likesCount: newCount };
  }


  /**
   * Retrieves all saved food intake logs sorted by date (newest first)
   */
  public static async getFoodLogs(): Promise<FoodLogRecord[]> {
    try {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(FOOD_STORAGE_KEY);
      } catch {}

      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        raw = (globalThis as any).localStorage.getItem(FOOD_STORAGE_KEY);
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryFoodLogs = parsed;
          return parsed;
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

      const jsonStr = JSON.stringify(updated);
      try {
        await AsyncStorage.setItem(FOOD_STORAGE_KEY, jsonStr);
      } catch {}
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(FOOD_STORAGE_KEY, jsonStr);
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
      await AsyncStorage.removeItem(FOOD_STORAGE_KEY);
    } catch {}
    try {
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(FOOD_STORAGE_KEY);
      }
    } catch (e) {
      console.warn('[StorageService] Error clearing food logs:', e);
    }
  }

  /**
   * Retrieves the user fitness profile (gender, age, height, weight, goal)
   */
  public static async getUserProfile(): Promise<UserFitnessProfile> {
    try {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      } catch {}

      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        raw = (globalThis as any).localStorage.getItem(PROFILE_STORAGE_KEY);
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.gender) {
          memoryUserProfile = parsed;
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[StorageService] Error reading user profile:', e);
    }

    return { ...memoryUserProfile };
  }

  /**
   * Saves user fitness profile to persistent storage
   */
  public static async saveUserProfile(profile: UserFitnessProfile): Promise<void> {
    try {
      const updated = {
        ...profile,
        updatedAt: new Date().toISOString(),
      };
      memoryUserProfile = updated;
      memoryIsProfileSetup = true;

      const jsonStr = JSON.stringify(updated);
      try {
        await AsyncStorage.setItem(PROFILE_STORAGE_KEY, jsonStr);
      } catch {}
      if (typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(PROFILE_STORAGE_KEY, jsonStr);
      }
    } catch (e) {
      console.warn('[StorageService] Error saving user profile:', e);
      memoryUserProfile = { ...profile };
      memoryIsProfileSetup = true;
    }
  }

  /**
   * Checks if the user has completed their profile setup
   */
  public static async isProfileSetup(): Promise<boolean> {
    if (memoryIsProfileSetup) return true;
    try {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
      } catch {}
      if (!raw && typeof globalThis !== 'undefined' && (globalThis as any).localStorage) {
        raw = (globalThis as any).localStorage.getItem(PROFILE_STORAGE_KEY);
      }
      if (raw) {
        memoryIsProfileSetup = true;
        return true;
      }
    } catch {}
    return false;
  }
}
