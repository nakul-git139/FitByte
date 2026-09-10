export interface FoodItemDetail {
  name: string;
  portion: string;
  calories: number;
  protein: number; // in grams
  carbs: number;   // in grams
  fat: number;     // in grams
}

export type GoalAlignmentStatus = 'good' | 'could_improve' | 'poor_choice';

export interface GoalAlignmentFeedback {
  status: GoalAlignmentStatus;
  badgeText: string;
  feedbackSummary: string;
}

export interface FoodAnalysisResult {
  isFood: boolean;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  foodItems: FoodItemDetail[];
  goalAlignment: GoalAlignmentFeedback;
  suggestions: string[];
  confidenceNote: string;
  photoUri?: string;
  analyzedAt?: string;
  isFallback?: boolean;
}

export interface MealLogRecord {
  id: string;
  timestamp: string;
  mealName: string;
  totalCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  foodItems: FoodItemDetail[];
  status: GoalAlignmentStatus;
  badgeText: string;
  photoUri?: string;
}

export interface UserFitnessProfileContext {
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  fitnessGoal?: 'muscle_gain' | 'weight_loss' | 'maintenance' | 'endurance' | string;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'very_active' | string;
  dailyCalorieTarget?: number;
  dietaryPreference?: string;
}
