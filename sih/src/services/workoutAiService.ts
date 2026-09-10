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
    const durationMinutes = checkInData.durationMinutes ?? (profileData?.duration ? parseInt(profileData.duration, 10) : 20) ?? 20;
    const payload = {
      mood: checkInData.mood,
      energyLevel: checkInData.energyLevel,
      durationMinutes,
      duration: `${durationMinutes} mins`,
      age: profileData?.age ?? 25,
      height: profileData?.height ?? '175 cm',
      weight: profileData?.weight ?? '70 kg',
      fitnessGoal: profileData?.fitnessGoal ?? 'General Fitness & Muscle Tone',
      experienceLevel: profileData?.experienceLevel ?? 'Intermediate',
      activityLevel: profileData?.activityLevel ?? 'Moderately Active',
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
      return { ...data, durationMinutes: data.durationMinutes || durationMinutes };
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
    const { mood, energyLevel, durationMinutes = 20 } = checkInData;
    const isLow = energyLevel <= 2 || mood === 'Low Energy' || mood === 'Tired';
    const isHigh = energyLevel >= 4 || mood === 'Motivated' || mood === 'Great';
    const finalDuration = durationMinutes || (isLow ? 15 : isHigh ? 30 : 20);

    if (finalDuration <= 10) {
      if (isLow) {
        return {
          workoutName: `${finalDuration}-Min Gentle Recovery Flow`,
          durationMinutes: finalDuration,
          difficulty: 'light',
          reason: `Quick ${finalDuration}-minute session tailored for low energy (${energyLevel}/5). Uses gentle volume and 45s recovery intervals to re-energize without fatigue.`,
          exercises: [
            { name: 'Bodyweight Squats', sets: 2, reps: 8, restSeconds: 45 },
            { name: 'Push-ups', sets: 2, reps: 6, restSeconds: 45 },
            { name: 'Plank Hold', sets: 2, reps: 15, restSeconds: 45 },
          ],
          isFallback: true,
        };
      }
      if (isHigh) {
        return {
          workoutName: `${finalDuration}-Min High-Intensity Sprint`,
          durationMinutes: finalDuration,
          difficulty: 'intense',
          reason: `High-tempo ${finalDuration}-minute blast matching your ${energyLevel}/5 energy. Short rest periods and explosive bodyweight movements maximize calorie burn.`,
          exercises: [
            { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 30 },
            { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 30 },
            { name: 'Jumping Jacks', sets: 2, reps: 20, restSeconds: 30 },
          ],
          isFallback: true,
        };
      }
      return {
        workoutName: `${finalDuration}-Min Express Activation`,
        durationMinutes: finalDuration,
        difficulty: 'moderate',
        reason: `Balanced ${finalDuration}-minute full-body activation fitting your ${energyLevel}/5 energy level.`,
        exercises: [
          { name: 'Bodyweight Squats', sets: 2, reps: 10, restSeconds: 35 },
          { name: 'Push-ups', sets: 2, reps: 8, restSeconds: 35 },
          { name: 'Plank Hold', sets: 2, reps: 25, restSeconds: 35 },
        ],
        isFallback: true,
      };
    }

    if (finalDuration <= 15) {
      if (isLow) {
        return {
          workoutName: `${finalDuration}-Min Low-Impact Mobility Flow`,
          durationMinutes: finalDuration,
          difficulty: 'light',
          reason: `${finalDuration}-minute recovery session for ${mood.toLowerCase()} mood and energy ${energyLevel}/5. Generous rest and joint-friendly bodyweight reps.`,
          exercises: [
            { name: 'Bodyweight Squats', sets: 2, reps: 8, restSeconds: 60 },
            { name: 'Push-ups', sets: 2, reps: 6, restSeconds: 60 },
            { name: 'Plank Hold', sets: 2, reps: 20, restSeconds: 60 },
          ],
          isFallback: true,
        };
      }
      if (isHigh) {
        return {
          workoutName: `${finalDuration}-Min Power Conditioning`,
          durationMinutes: finalDuration,
          difficulty: 'intense',
          reason: `${finalDuration} minutes of athletic power training calibrated for peak energy ${energyLevel}/5.`,
          exercises: [
            { name: 'Bodyweight Squats', sets: 3, reps: 15, restSeconds: 35 },
            { name: 'Push-ups', sets: 3, reps: 12, restSeconds: 35 },
            { name: 'Mountain Climbers', sets: 3, reps: 20, restSeconds: 30 },
            { name: 'Plank Hold', sets: 3, reps: 35, restSeconds: 35 },
          ],
          isFallback: true,
        };
      }
      return {
        workoutName: `${finalDuration}-Min Core & Strength Pulse`,
        durationMinutes: finalDuration,
        difficulty: 'moderate',
        reason: `${finalDuration}-minute conditioning routine with steady 45s rest intervals for balanced ${energyLevel}/5 energy.`,
        exercises: [
          { name: 'Bodyweight Squats', sets: 3, reps: 10, restSeconds: 45 },
          { name: 'Push-ups', sets: 3, reps: 8, restSeconds: 45 },
          { name: 'Lunges', sets: 2, reps: 8, restSeconds: 45 },
          { name: 'Plank Hold', sets: 2, reps: 30, restSeconds: 45 },
        ],
        isFallback: true,
      };
    }

    if (finalDuration <= 20) {
      if (isLow) {
        return {
          workoutName: `${finalDuration}-Min Recovery & Mobility`,
          durationMinutes: finalDuration,
          difficulty: 'light',
          reason: `${finalDuration}-minute recovery routine matching ${mood.toLowerCase()} mood and ${energyLevel}/5 energy. Controlled tempo with 60s recovery periods.`,
          exercises: [
            { name: 'Bodyweight Squats', sets: 2, reps: 10, restSeconds: 60 },
            { name: 'Push-ups', sets: 2, reps: 8, restSeconds: 60 },
            { name: 'Lunges', sets: 2, reps: 8, restSeconds: 60 },
            { name: 'Plank Hold', sets: 2, reps: 20, restSeconds: 60 },
          ],
          isFallback: true,
        };
      }
      if (isHigh) {
        return {
          workoutName: `${finalDuration}-Min High Energy Full Body Power`,
          durationMinutes: finalDuration,
          difficulty: 'intense',
          reason: `${finalDuration} minutes of high-output power training for peak ${energyLevel}/5 energy. 4 sets with explosive bodyweight reps.`,
          exercises: [
            { name: 'Bodyweight Squats', sets: 4, reps: 15, restSeconds: 40 },
            { name: 'Push-ups', sets: 4, reps: 12, restSeconds: 40 },
            { name: 'Jumping Jacks', sets: 3, reps: 25, restSeconds: 30 },
            { name: 'Mountain Climbers', sets: 3, reps: 20, restSeconds: 30 },
            { name: 'Plank Hold', sets: 3, reps: 45, restSeconds: 40 },
          ],
          isFallback: true,
        };
      }
      return {
        workoutName: `${finalDuration}-Min Balanced Full Body Conditioning`,
        durationMinutes: finalDuration,
        difficulty: 'moderate',
        reason: `${finalDuration}-minute structured conditioning plan with 3 sets across core movement patterns for steady ${energyLevel}/5 energy.`,
        exercises: [
          { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
          { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 },
          { name: 'Lunges', sets: 3, reps: 10, restSeconds: 45 },
          { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 },
        ],
        isFallback: true,
      };
    }

    if (finalDuration <= 30) {
      if (isLow) {
        return {
          workoutName: `${finalDuration}-Min Extended Recovery & Posture`,
          durationMinutes: finalDuration,
          difficulty: 'light',
          reason: `${finalDuration}-minute steady-state mobility and joint alignment routine for ${energyLevel}/5 energy level.`,
          exercises: [
            { name: 'Bodyweight Squats', sets: 3, reps: 10, restSeconds: 60 },
            { name: 'Push-ups', sets: 3, reps: 8, restSeconds: 60 },
            { name: 'Lunges', sets: 3, reps: 8, restSeconds: 60 },
            { name: 'Plank Hold', sets: 3, reps: 25, restSeconds: 60 },
          ],
          isFallback: true,
        };
      }
      if (isHigh) {
        return {
          workoutName: `${finalDuration}-Min Athletic Hypertrophy & Power`,
          durationMinutes: finalDuration,
          difficulty: 'intense',
          reason: `${finalDuration}-minute complete athletic volume session matching peak ${energyLevel}/5 energy with full progressive overload.`,
          exercises: [
            { name: 'Bodyweight Squats', sets: 4, reps: 15, restSeconds: 45 },
            { name: 'Push-ups', sets: 4, reps: 14, restSeconds: 45 },
            { name: 'Lunges', sets: 4, reps: 12, restSeconds: 45 },
            { name: 'Mountain Climbers', sets: 3, reps: 25, restSeconds: 30 },
            { name: 'Jumping Jacks', sets: 3, reps: 30, restSeconds: 30 },
            { name: 'Plank Hold', sets: 3, reps: 45, restSeconds: 45 },
          ],
          isFallback: true,
        };
      }
      return {
        workoutName: `${finalDuration}-Min Complete Strength & Conditioning`,
        durationMinutes: finalDuration,
        difficulty: 'moderate',
        reason: `${finalDuration}-minute full body workout delivering 5 balanced exercise blocks tailored for ${energyLevel}/5 energy.`,
        exercises: [
          { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
          { name: 'Push-ups', sets: 3, reps: 12, restSeconds: 45 },
          { name: 'Lunges', sets: 3, reps: 12, restSeconds: 45 },
          { name: 'Bicep Curls', sets: 3, reps: 10, restSeconds: 45 },
          { name: 'Plank Hold', sets: 3, reps: 35, restSeconds: 45 },
        ],
        isFallback: true,
      };
    }

    // 31+ Mins (Custom sessions e.g. 45m, 60m, 90m)
    if (isLow) {
      return {
        workoutName: `${finalDuration}-Min Extended Full Body Rejuvenation`,
        durationMinutes: finalDuration,
        difficulty: 'light',
        reason: `${finalDuration}-minute low-stress rejuvenation session with 75s rest periods, joint mobility, and low fatigue volume.`,
        exercises: [
          { name: 'Bodyweight Squats', sets: 3, reps: 10, restSeconds: 75 },
          { name: 'Push-ups', sets: 3, reps: 8, restSeconds: 75 },
          { name: 'Lunges', sets: 3, reps: 10, restSeconds: 75 },
          { name: 'Bicep Curls', sets: 3, reps: 10, restSeconds: 60 },
          { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 60 },
        ],
        isFallback: true,
      };
    }
    if (isHigh) {
      return {
        workoutName: `${finalDuration}-Min Total Body Mastery`,
        durationMinutes: finalDuration,
        difficulty: 'intense',
        reason: `${finalDuration}-minute comprehensive workout maximizing total volume across 7 movements for peak ${energyLevel}/5 energy.`,
        exercises: [
          { name: 'Bodyweight Squats', sets: 4, reps: 18, restSeconds: 45 },
          { name: 'Push-ups', sets: 4, reps: 15, restSeconds: 45 },
          { name: 'Lunges', sets: 4, reps: 14, restSeconds: 45 },
          { name: 'Pull-ups', sets: 4, reps: 8, restSeconds: 60 },
          { name: 'Mountain Climbers', sets: 4, reps: 25, restSeconds: 30 },
          { name: 'Jumping Jacks', sets: 3, reps: 30, restSeconds: 30 },
          { name: 'Plank Hold', sets: 4, reps: 45, restSeconds: 45 },
        ],
        isFallback: true,
      };
    }
    return {
      workoutName: `${finalDuration}-Min Extended Conditioning Matrix`,
      durationMinutes: finalDuration,
      difficulty: 'moderate',
      reason: `${finalDuration}-minute complete workout with 4 sets across major kinetic chains for solid ${energyLevel}/5 energy.`,
      exercises: [
        { name: 'Bodyweight Squats', sets: 4, reps: 12, restSeconds: 60 },
        { name: 'Push-ups', sets: 4, reps: 12, restSeconds: 60 },
        { name: 'Lunges', sets: 4, reps: 12, restSeconds: 60 },
        { name: 'Bicep Curls', sets: 3, reps: 10, restSeconds: 60 },
        { name: 'Mountain Climbers', sets: 3, reps: 20, restSeconds: 45 },
        { name: 'Plank Hold', sets: 4, reps: 35, restSeconds: 45 },
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
