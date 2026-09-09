import {
  GeneratedWorkout,
  UserProfileData,
  PostWorkoutAnalysisRequest,
  PostWorkoutAnalysisResponse,
} from '../types/aiWorkout';
import { MoodCheckInData } from '../types/mood';
import { getBackendBaseUrl } from '../config/apiConfig';

export class WorkoutAiService {
  /**
   * Generates a personalized daily workout based on user mood, energy, profile, and past form history
   */
  public static async generateDailyWorkout(
    checkInData: MoodCheckInData,
    profileData?: UserProfileData
  ): Promise<GeneratedWorkout> {
    const payload = {
      mood: checkInData.mood,
      energyLevel: checkInData.energyLevel,
      age: profileData?.age ?? 25,
      height: profileData?.height ?? '175 cm',
      weight: profileData?.weight ?? '70 kg',
      fitnessGoal: profileData?.fitnessGoal ?? 'General Fitness & Muscle Tone',
      experienceLevel: profileData?.experienceLevel ?? 'Intermediate',
      activityLevel: profileData?.activityLevel ?? 'Moderately Active',
      duration: profileData?.duration ?? '20-30 mins',
      equipment: profileData?.equipment ?? 'Bodyweight / Calisthenics',
      workoutHistory: profileData?.workoutHistory ?? 'Consistent weekly workouts',
      previousFormScores: profileData?.previousFormScores ?? 'Recent average form score: 85%',
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(`${getBackendBaseUrl()}/api/workout/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data: GeneratedWorkout = await response.json();
      return data;
    } catch (err: any) {
      console.warn(`[WorkoutAiService] Workout generation fallback used (${err.message}).`);
      return this.getLocalFallbackWorkout(checkInData);
    }
  }

  /**
   * Generates comprehensive post-workout analysis comparing performance with targets and previous sessions
   */
  public static async analyzeWorkoutSummary(
    sessionData: PostWorkoutAnalysisRequest
  ): Promise<PostWorkoutAnalysisResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(`${getBackendBaseUrl()}/api/workout/analyze-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data: PostWorkoutAnalysisResponse = await response.json();
      return data;
    } catch (err: any) {
      console.warn(`[WorkoutAiService] Workout summary analysis fallback used (${err.message}).`);
      return this.getLocalFallbackSummary(sessionData);
    }
  }

  private static getLocalFallbackWorkout(checkInData: MoodCheckInData): GeneratedWorkout {
    const { mood, energyLevel } = checkInData;
    const isLow = energyLevel <= 2 || mood === 'Low Energy' || mood === 'Tired';
    const isHigh = energyLevel >= 4 || mood === 'Motivated' || mood === 'Great';

    if (isLow) {
      return {
        workoutName: 'Low Energy Full Body Recovery',
        durationMinutes: 20,
        difficulty: 'light',
        reason: `You reported ${mood.toLowerCase()} and energy ${energyLevel}/5, so this workout uses lower volume and longer rest periods.`,
        exercises: [
          { name: 'Bodyweight Squats', sets: 2, reps: 10, restSeconds: 60 },
          { name: 'Push-ups', sets: 2, reps: 8, restSeconds: 60 },
          { name: 'Plank Hold', sets: 2, reps: 20, restSeconds: 60 },
        ],
        isFallback: true,
      };
    }

    if (isHigh) {
      return {
        workoutName: 'High Energy Full Body Power',
        durationMinutes: 30,
        difficulty: 'intense',
        reason: `You reported ${mood.toLowerCase()} with peak energy ${energyLevel}/5! This workout utilizes explosive power and higher volume.`,
        exercises: [
          { name: 'Bodyweight Squats', sets: 4, reps: 15, restSeconds: 45 },
          { name: 'Push-ups', sets: 4, reps: 12, restSeconds: 45 },
          { name: 'Jumping Jacks', sets: 3, reps: 25, restSeconds: 30 },
          { name: 'Plank Hold', sets: 3, reps: 45, restSeconds: 45 },
        ],
        isFallback: true,
      };
    }

    return {
      workoutName: 'Balanced Full Body Conditioning',
      durationMinutes: 25,
      difficulty: 'moderate',
      reason: `You reported ${mood.toLowerCase()} and energy ${energyLevel}/5. This balanced session delivers steady conditioning and joint mobility.`,
      exercises: [
        { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
        { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 },
        { name: 'Lunges', sets: 3, reps: 10, restSeconds: 45 },
        { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 },
      ],
      isFallback: true,
    };
  }

  private static getLocalFallbackSummary(
    sessionData: PostWorkoutAnalysisRequest
  ): PostWorkoutAnalysisResponse {
    const {
      workoutType,
      repCount,
      goodReps,
      formAccuracyScore,
      geminiObservations,
    } = sessionData;

    const score = Number(formAccuracyScore) || 80;
    let summary = `You completed ${repCount} reps with an average form score of ${score}%. Strong discipline and steady effort throughout!`;
    if (score >= 90) {
      summary = `Outstanding performance! You completed ${repCount} reps with a stellar ${score}% form accuracy score, maintaining clean joint angles.`;
    } else if (score < 75) {
      summary = `Good effort completing ${repCount} reps (${score}% form score). Focus on controlled tempo and full depth on your next session.`;
    }

    const strengths = [
      `${goodReps} repetitions completed with full range of motion.`,
      `Consistent workout pacing and steady cadence.`,
    ];

    const areasToImprove: string[] = [];
    if (geminiObservations && geminiObservations.length > 0) {
      areasToImprove.push(geminiObservations[0]);
    } else if (score < 85) {
      areasToImprove.push('Focus on maintaining joint alignment throughout the full range of motion.');
    } else {
      areasToImprove.push('Maintain full core tension during the deepest phase of each rep.');
    }

    const nextWorkoutSuggestion = score >= 85
      ? `Next session: consider adding 2-3 reps per set or increasing tempo control.`
      : `Next session: prioritize movement quality and joint alignment over speed.`;

    return {
      summary,
      strengths,
      areasToImprove,
      nextWorkoutSuggestion,
      isFallback: true,
    };
  }
}
