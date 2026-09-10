export type MoodType =
  | 'Great'
  | 'Good'
  | 'Okay'
  | 'Tired'
  | 'Low Energy'
  | 'Stressed'
  | 'Motivated';

export interface MoodOption {
  type: MoodType;
  emoji: string;
  label: string;
  description: string;
}

export interface MoodCheckInData {
  mood: MoodType;
  emoji: string;
  energyLevel: number; // 1 to 5
  durationMinutes?: number; // e.g. 10, 15, 20, 30, 45
  timestamp: Date;
}
