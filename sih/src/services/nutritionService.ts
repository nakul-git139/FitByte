import { FoodNutritionAnalysis, FoodLogRecord, DailyNutritionSummary } from '../types/nutrition';
import { getBackendBaseUrl } from '../config/apiConfig';
import { StorageService } from './storageService';

const GEMINI_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-flash-lite-latest',
];

function getClientGeminiApiKey(): string {
  return (
    process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    ''
  );
}

export class NutritionService {
  /**
   * Main entry point: Sends a food photo (base64) or description to Google Gemini Vision AI
   * Uses Direct Client-to-Gemini HTTPS first, with Backend Proxy and Local heuristics as resilient fallbacks.
   */
  public static async analyzeFood(
    imageBase64?: string,
    mealDescription?: string,
    userGoal: string = 'Muscle building and balanced fitness'
  ): Promise<FoodNutritionAnalysis> {
    // 1. Try Direct Google Gemini Vision API call (works universally on all mobile devices & web)
    try {
      const directResult = await this.callDirectGeminiVision(imageBase64, mealDescription, userGoal);
      if (directResult && directResult.mealName && typeof directResult.totalCalories === 'number') {
        console.log(`[NutritionService] Live Gemini AI analysis success: ${directResult.mealName} (${directResult.totalCalories} kcal)`);
        return directResult;
      }
    } catch (directErr: any) {
      console.warn(`[NutritionService] Direct Gemini call failed: ${directErr.message}, attempting backend proxy...`);
    }

    // 2. Try Backend Server Proxy (/api/nutrition/analyze-food)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const payload = {
        imageBase64: imageBase64 || '',
        mealDescription: mealDescription || '',
        userFitnessGoal: userGoal,
      };

      const response = await fetch(`${getBackendBaseUrl()}/api/nutrition/analyze-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data: FoodNutritionAnalysis = await response.json();
        if (data && data.mealName && typeof data.totalCalories === 'number') {
          return data;
        }
      }
    } catch (proxyErr: any) {
      console.warn(`[NutritionService] Backend proxy call failed: ${proxyErr.message}`);
    }

    // 3. Dynamic Local Analysis Fallback
    return this.getLocalFallbackFoodAnalysis(mealDescription);
  }

  /**
   * Direct Client-to-Google Gemini REST API with Multi-Model Failover
   */
  private static async callDirectGeminiVision(
    imageBase64?: string,
    mealDescription?: string,
    userGoal?: string
  ): Promise<FoodNutritionAnalysis> {
    const apiKey = getClientGeminiApiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const systemInstruction = `You are an elite clinical sports nutritionist, registered dietitian, and Olympic biomechanics nutrition coach.
Your task is to analyze the provided food photograph or meal description with extreme precision.
1. ACCURATE CALORIE & PORTION ESTIMATION:
   - Detect every food item, dish, protein source, carb, vegetable, and sauce visible or described.
   - Estimate realistic portion sizes (e.g. 150g, 1 cup, 2 slices, 1 medium bowl) and calculate individual item calories accurately based on USDA nutritional science.
   - Sum total calories accurately to equal the sum of constituent food items.
2. MACRONUTRIENT BREAKDOWN:
   - Calculate exact proteinGrams, carbsGrams, fatsGrams, and fiberGrams.
3. DIETARY QUALITY & HEALTH SCORE (0-100):
   - Rate quality as 'excellent' (nutrient-dense whole foods), 'good' (balanced meal), 'moderate' (calorie-dense or refined carbs), or 'poor' (deep-fried, ultra-processed, high saturated fats/added sugars).
4. GEMINI SPORTS DIETITIAN SUGGESTIONS:
   - For healthy meals: explain metabolic benefits, muscle protein synthesis, and optimal pre/post-workout timing.
   - For poor/high-calorie meals: provide metabolic warnings (glycemic spikes, slow gastric emptying, fatigue) and actionable recovery tips (hydration, 15-min walk, fiber).
5. ACTIONABLE HEALTHY SWAPS:
   - Provide 2-3 specific, realistic food/ingredient substitutions to lower excess calories and boost nutritional value.

Return ONLY valid JSON matching this exact schema:
{
  "mealName": "string identified dish name",
  "foodItems": [
    { "name": "string item name", "portion": "string portion size", "calories": number }
  ],
  "totalCalories": number,
  "macros": {
    "proteinGrams": number,
    "carbsGrams": number,
    "fatsGrams": number,
    "fiberGrams": number
  },
  "quality": "excellent" | "good" | "moderate" | "poor",
  "qualityLabel": "string short quality badge",
  "healthScore": number,
  "geminiSuggestions": "string comprehensive sports nutrition coaching recommendations",
  "healthySwaps": ["string swap 1", "string swap 2"],
  "confidence": number
}`;

    const promptText = `Analyze this food for exact calories, macronutrients, and sports nutrition guidance.
User Fitness Goal: ${userGoal || 'Muscle building and balanced fitness'}.${mealDescription ? ` User meal notes: "${mealDescription}".` : ''}
Please recognize all food items visible or described, and calculate realistic calories and macros.`;

    const parts: any[] = [{ text: promptText }];

    // Attach image if base64 provided
    if (imageBase64 && imageBase64.length > 50) {
      let cleanBase64 = imageBase64;
      let mimeType = 'image/jpeg';
      if (imageBase64.includes(';base64,')) {
        const split = imageBase64.split(';base64,');
        mimeType = split[0].replace('data:', '') || 'image/jpeg';
        cleanBase64 = split[1];
      }
      parts.unshift({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }

    let lastErr = null;

    for (const model of GEMINI_MODELS) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = {
        contents: [{ role: 'user', parts }],
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          temperature: 0.2,
          topP: 0.95,
          responseMimeType: 'application/json',
        },
      };

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 18000);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`[NutritionService] Model ${model} returned ${response.status}: ${errText.slice(0, 100)}`);
          lastErr = new Error(`HTTP ${response.status} from ${model}`);
          continue;
        }

        const data = await response.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawJsonText) {
          lastErr = new Error(`Empty response from model ${model}`);
          continue;
        }

        const parsed: FoodNutritionAnalysis = JSON.parse(rawJsonText);
        parsed.isFallback = false;
        return parsed;
      } catch (err: any) {
        lastErr = err;
        console.warn(`[NutritionService] Model ${model} error: ${err.message}`);
      }
    }

    throw lastErr || new Error('All Gemini models failed');
  }

  /**
   * Saves a meal analysis to persistent food intake history
   */
  public static async logMeal(
    analysis: FoodNutritionAnalysis,
    imageUri?: string
  ): Promise<FoodLogRecord> {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const logRecord: FoodLogRecord = {
      id: `food-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: now.toISOString(),
      date: dateStr,
      imageUri,
      mealName: analysis.mealName,
      totalCalories: analysis.totalCalories,
      macros: analysis.macros,
      quality: analysis.quality,
      qualityLabel: analysis.qualityLabel,
      healthScore: analysis.healthScore,
      geminiSuggestions: analysis.geminiSuggestions,
      healthySwaps: analysis.healthySwaps || [],
    };

    await StorageService.saveFoodLog(logRecord);
    return logRecord;
  }

  /**
   * Retrieves today's total calories consumed and macronutrient breakdown
   */
  public static async getTodaySummary(): Promise<DailyNutritionSummary> {
    return StorageService.getDailyNutritionSummary();
  }

  /**
   * Dynamic fallback analysis if offline
   */
  public static getLocalFallbackFoodAnalysis(mealDesc?: string): FoodNutritionAnalysis {
    const desc = (mealDesc || '').toLowerCase();

    // 1. Junk Food / High Saturated Fat & Sugar
    if (
      desc.includes('burger') ||
      desc.includes('fries') ||
      desc.includes('pizza') ||
      desc.includes('donut') ||
      desc.includes('soda') ||
      desc.includes('fried') ||
      desc.includes('chips') ||
      desc.includes('candy')
    ) {
      return {
        mealName: 'Cheeseburger & French Fries',
        foodItems: [
          { name: 'Cheeseburger with Beef Patty', portion: '1 regular', calories: 540 },
          { name: 'French Fries', portion: '1 medium serving', calories: 365 },
          { name: 'Sauce & Condiments', portion: '2 tbsp', calories: 75 },
        ],
        totalCalories: 980,
        macros: {
          proteinGrams: 28,
          carbsGrams: 94,
          fatsGrams: 52,
          fiberGrams: 4,
        },
        quality: 'poor',
        qualityLabel: 'High Saturated Fats & Refined Carbs',
        healthScore: 38,
        geminiSuggestions: '⚠️ High in saturated fats, sodium, and refined carbohydrates with limited dietary fiber. This meal may lead to a quick glucose spike followed by sluggish energy and post-meal fatigue. To improve digestion and nutrient partitioning, drink 500ml of water and go for a light 15-minute walk.',
        healthySwaps: [
          'Swap deep-fried fries for a crisp garden salad or roasted sweet potato wedges (-240 kcal)',
          'Opt for grilled chicken or a turkey patty with avocado instead of double beef and processed cheese',
          'Replace soda with chilled sparkling water with lemon (-180 kcal)',
        ],
        confidence: 0.88,
        isFallback: true,
      };
    }

    // 2. High Protein / Balanced Meal
    if (
      desc.includes('chicken') ||
      desc.includes('salmon') ||
      desc.includes('quinoa') ||
      desc.includes('egg') ||
      desc.includes('avocado') ||
      desc.includes('salad') ||
      desc.includes('tuna') ||
      desc.includes('steak')
    ) {
      return {
        mealName: 'Grilled Chicken & Avocado Bowl',
        foodItems: [
          { name: 'Herb-Marinated Chicken Breast', portion: '160g', calories: 260 },
          { name: 'Steamed Brown Rice & Red Quinoa', portion: '1 cup', calories: 215 },
          { name: 'Sliced Fresh Avocado', portion: '1/2 medium', calories: 120 },
          { name: 'Steamed Broccoli & Baby Spinach', portion: '1.5 cups', calories: 35 },
        ],
        totalCalories: 630,
        macros: {
          proteinGrams: 44,
          carbsGrams: 52,
          fatsGrams: 22,
          fiberGrams: 8,
        },
        quality: 'excellent',
        qualityLabel: 'High Protein & Nutrient Dense',
        healthScore: 94,
        geminiSuggestions: '✓ Outstanding athletic nutrition! Provides 44g of complete, high-bioavailability protein to maximize muscle protein synthesis, complex slow-digesting carbohydrates for glycogen replenishment, and heart-healthy monounsaturated fats. Optimal as a post-workout recovery meal within 1-2 hours of training.',
        healthySwaps: [
          'Drizzle cold-pressed extra virgin olive oil or apple cider vinegar for enhanced antioxidant absorption',
          'Add pumpkin seeds or chia seeds for an extra boost of magnesium and omega-3s',
        ],
        confidence: 0.94,
        isFallback: true,
      };
    }

    // 3. Indian / Regional Dishes
    if (
      desc.includes('roti') ||
      desc.includes('paneer') ||
      desc.includes('dal') ||
      desc.includes('thali') ||
      desc.includes('curry') ||
      desc.includes('biryani')
    ) {
      return {
        mealName: 'Traditional Indian Thali',
        foodItems: [
          { name: 'Whole Wheat Roti', portion: '2 pieces', calories: 240 },
          { name: 'Paneer Butter Masala', portion: '1 cup', calories: 350 },
          { name: 'Dal Tadka / Lentils', portion: '1 cup', calories: 220 },
          { name: 'Steamed Basmati Rice', portion: '1 cup', calories: 200 },
        ],
        totalCalories: 1010,
        macros: {
          proteinGrams: 34,
          carbsGrams: 124,
          fatsGrams: 42,
          fiberGrams: 9,
        },
        quality: 'moderate',
        qualityLabel: 'High Calorie Density & Moderate Protein',
        healthScore: 58,
        geminiSuggestions: 'Rich in flavor and provides good dietary fiber and protein from paneer and lentils. To optimize for athletic goals, reduce excess ghee or heavy cream gravies and increase lean protein proportions.',
        healthySwaps: [
          'Swap rich cream-based gravies for tandoori grilled paneer or chicken tikka',
          'Choose yellow Dal Tadka over heavy Dal Makhani to save ~120 kcal of saturated fat',
          'Add a bowl of cucumber-mint Greek yogurt raita for extra probiotics and protein',
        ],
        confidence: 0.90,
        isFallback: true,
      };
    }

    // 4. Default Fresh Whole Food Meal
    return {
      mealName: 'Balanced Whole Food Bowl',
      foodItems: [
        { name: 'Lean Protein Source', portion: '150g', calories: 240 },
        { name: 'Complex Carbohydrate (Grains/Potatoes)', portion: '1 cup', calories: 210 },
        { name: 'Steamed Mixed Vegetables', portion: '1.5 cups', calories: 65 },
        { name: 'Healthy Oil / Dressing', portion: '1 tbsp', calories: 75 },
      ],
      totalCalories: 590,
      macros: {
        proteinGrams: 36,
        carbsGrams: 50,
        fatsGrams: 18,
        fiberGrams: 7,
      },
      quality: 'good',
      qualityLabel: 'Balanced Macronutrients & Whole Foods',
      healthScore: 86,
      geminiSuggestions: '✓ Solid whole-food meal providing clean fuel for training and sustained recovery. Delivers balanced macronutrients with steady gastric release.',
      healthySwaps: [
        'Add leafy greens and colorful peppers to maximize micronutrient and antioxidant density',
      ],
      confidence: 0.88,
      isFallback: true,
    };
  }
}
