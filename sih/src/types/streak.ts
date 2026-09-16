export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null; // Local YYYY-MM-DD date string e.g. "2026-09-15"
  updatedAt: string;
}
