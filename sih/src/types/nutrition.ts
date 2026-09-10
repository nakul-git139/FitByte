export type NutritionQuality = 'excellent' | 'good' | 'moderate' | 'poor';

export interface FoodItem {
  name: string;
  portion?: string;
  calories: number;
}

export interface Macronutrients {
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  fiberGrams?: number;
}

export interface FoodNutritionAnalysis {
  mealName: string;
  foodItems: FoodItem[];
  totalCalories: number;
  macros: Macronutrients;
  quality: NutritionQuality; // 'excellent' | 'good' | 'moderate' | 'poor'
  qualityLabel: string; // e.g. "High Protein & Balanced" or "High Refined Sugar / Poor Nutrient Density"
  healthScore: number; // 0 - 100
  geminiSuggestions: string; // Tailored dietary coaching recommendations (especially for poor/low-nutrient meals!)
  healthySwaps: string[]; // e.g. ["Swap fries for roasted sweet potatoes", "Add grilled chicken for +25g protein"]
  confidence: number;
  isFallback?: boolean;
}

export interface FoodLogRecord {
  id: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
  imageUri?: string;
  mealName: string;
  totalCalories: number;
  macros: Macronutrients;
  quality: NutritionQuality;
  qualityLabel: string;
  healthScore: number;
  geminiSuggestions: string;
  healthySwaps: string[];
}

export interface DailyNutritionSummary {
  date: string;
  totalCaloriesConsumed: number;
  totalProteinGrams: number;
  totalCarbsGrams: number;
  totalFatsGrams: number;
  totalFiberGrams: number;
  mealCount: number;
  loggedMeals: FoodLogRecord[];
}
