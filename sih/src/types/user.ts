export type Gender = 'male' | 'female' | 'other';

export interface UserFitnessProfile {
  gender: Gender;
  age: number; // e.g. 24
  heightCm: number; // e.g. 175 cm
  weightKg: number; // e.g. 70 kg
  fitnessGoal: string; // 'Muscle Building & Hypertrophy' | 'Fat Loss & Calorie Burn' | 'Athletic Conditioning' | 'Mobility & Core Strength'
  experienceLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  updatedAt?: string;
}
