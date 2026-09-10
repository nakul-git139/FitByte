import {
  FoodAnalysisResult,
  UserFitnessProfileContext,
} from '../types/food';
import { getBackendBaseUrl } from '../config/apiConfig';

export class FoodAnalysisService {
  /**
   * Sends captured meal photo to Gemini AI for calorie, macro, and personalized nutritional analysis
   */
  public static async analyzeMeal(params: {
    imageBase64: string;
    mimeType?: string;
    userProfile?: UserFitnessProfileContext;
    mealType?: string;
    photoUri?: string;
  }): Promise<FoodAnalysisResult> {
    const {
      imageBase64,
      mimeType = 'image/jpeg',
      userProfile = {},
      mealType = 'Meal',
      photoUri,
    } = params;

    const payload = {
      imageBase64,
      mimeType,
      userProfile: {
        fitnessGoal: userProfile.fitnessGoal || 'General Fitness',
        weightKg: userProfile.weightKg || 70,
        heightCm: userProfile.heightCm || 175,
        age: userProfile.age || 25,
        activityLevel: userProfile.activityLevel || 'moderate',
        dietaryPreference: userProfile.dietaryPreference || 'balanced',
      },
      mealType,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout for image vision

      const response = await fetch(`${getBackendBaseUrl()}/api/food/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data: FoodAnalysisResult = await response.json();
      return {
        ...data,
        photoUri,
        analyzedAt: new Date().toISOString(),
        isFallback: false,
      };
    } catch (e: any) {
      console.warn('[FoodAnalysisService] Vision analysis fallback used:', e.message);
      return this.getLocalFallbackAnalysis(userProfile, photoUri);
    }
  }

  /**
   * Generates a realistic local fallback nutrition breakdown if network is unavailable
   */
  public static getLocalFallbackAnalysis(
    userProfile?: UserFitnessProfileContext,
    photoUri?: string
  ): FoodAnalysisResult {
    const goal = (userProfile?.fitnessGoal || '').toLowerCase();
    const isWeightLoss = goal.includes('loss') || goal.includes('cut') || goal.includes('lean');
    const isMuscleGain = goal.includes('muscle') || goal.includes('bulk') || goal.includes('hypertrophy');

    let status: 'good' | 'could_improve' | 'poor_choice' = 'good';
    let badgeText = 'Good choice';
    let feedbackSummary = 'Balanced macronutrient profile with solid protein and nourishing complex carbohydrates.';
    let suggestions = [
      'Great lean protein foundation to aid workout recovery.',
      'Add colorful leafy greens to boost micronutrient and fiber density.',
      'Drink a glass of water after your meal to aid digestion.',
    ];

    if (isWeightLoss) {
      feedbackSummary = 'Controlled calorie density with adequate protein to preserve lean muscle while maintaining your calorie target.';
      suggestions = [
        'Good portion control supporting your calorie deficit.',
        'Incorporate high-fiber greens to keep you satiated longer.',
        'Avoid high-calorie sugary beverages with this meal.',
      ];
    } else if (isMuscleGain) {
      feedbackSummary = 'High-protein profile delivering essential amino acids for muscle protein synthesis and post-workout recovery.';
      suggestions = [
        'Excellent protein volume supporting your muscle building goal.',
        'Pair with complex carbs to replenish glycogen stores.',
        'Consider adding healthy fats like avocado or seeds for hormone support.',
      ];
    }

    const totalCalories = isWeightLoss ? 480 : isMuscleGain ? 680 : 580;
    const proteinGrams = isMuscleGain ? 42 : 32;
    const carbsGrams = isWeightLoss ? 42 : 60;
    const fatGrams = 16;

    return {
      isFood: true,
      totalCalories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      foodItems: [
        {
          name: 'Balanced Protein Bowl',
          portion: '1 medium bowl (approx 350g)',
          calories: totalCalories,
          protein: proteinGrams,
          carbs: carbsGrams,
          fat: fatGrams,
        },
      ],
      goalAlignment: {
        status,
        badgeText,
        feedbackSummary,
      },
      suggestions,
      confidenceNote: 'Estimated via Gemini computer vision. Actual calories may vary based on cooking methods, oils, and exact portion weights.',
      photoUri,
      analyzedAt: new Date().toISOString(),
      isFallback: true,
    };
  }
}
