const https = require('https');
const fs = require('fs');
const path = require('path');

// Auto-load .env file from project or current working directory if present
function loadEnv() {
  const envCandidates = [
    path.join(__dirname, '../../.env'),
    path.join(__dirname, '../.env'),
    path.join(__dirname, '.env'),
    path.join(process.cwd(), '.env'),
  ];
  for (const candidate of envCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf8');
        raw.split('\n').forEach((line) => {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = (match[2] || '').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        });
      } catch (e) {
        // Ignore read errors
      }
      break;
    }
  }
}
loadEnv();

/**
 * Gemini AI Backend Service
 * Handles Daily Workout Generation & Keyframe Vision Coaching
 */

const GEMINI_MODEL = 'gemini-3.6-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

function getApiKey() {
  loadEnv();
  return process.env.GEMINI_API_KEY || '';
}

/**
 * Helper to call Gemini REST API via native fetch / https
 */
async function callGeminiApi(contents, systemInstruction) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment');
  }

  const url = `${GEMINI_ENDPOINT}?key=${apiKey}`;
  const body = {
    contents,
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      responseMimeType: 'application/json',
    },
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textResponse) {
    throw new Error('Empty response from Gemini API');
  }

  return JSON.parse(textResponse);
}

/**
 * 1. Daily Workout Generation from Mood & Energy
 */
async function generateWorkout(params) {
  const {
    mood = 'Good',
    energyLevel = 3,
    age = 25,
    height = '175 cm',
    weight = '70 kg',
    fitnessGoal = 'General Fitness & Muscle Tone',
    experienceLevel = 'Intermediate',
    activityLevel = 'Moderately Active',
    equipment = 'Bodyweight / Calisthenics',
    workoutHistory = 'Consistent weekly workouts',
    previousFormScores = 'Recent average form score: 85%',
  } = params || {};

  // Robustly extract and sanitize duration
  let durationMinutes = parseInt(params.durationMinutes, 10);
  if (isNaN(durationMinutes) || durationMinutes <= 0) {
    if (params.duration) {
      const match = String(params.duration).match(/\d+/);
      durationMinutes = match ? parseInt(match[0], 10) : 0;
    }
    if (!durationMinutes || durationMinutes <= 0) {
      const isLow = energyLevel <= 2 || mood === 'Low Energy' || mood === 'Tired';
      const isHigh = energyLevel >= 4 || mood === 'Motivated' || mood === 'Great';
      durationMinutes = isLow ? 15 : isHigh ? 30 : 20;
    }
  }
  // Clamp between 5 and 120 minutes
  durationMinutes = Math.max(5, Math.min(120, durationMinutes));
  const cleanDurationStr = `${durationMinutes} minutes`;

  const systemInstruction = `You are an elite, certified AI strength and conditioning coach and biomechanist.
Your goal is to generate a structured, personalized daily workout plan tailored strictly to the user's current mood, energy level (1-5), and EXACT available workout duration (${cleanDurationStr}).

CRITICAL WORKOUT DESIGN RULES:
1. REALISTIC TIME CALCULATION:
   - The user has EXACTLY ${durationMinutes} minutes for this workout.
   - You MUST design the routine (sets × (reps × 3.5s + restSeconds)) to be completed within ${durationMinutes} minutes.
   - For short workouts (<=10 mins): 2-3 exercises, 2 sets each, 8-10 reps (or 15-25s hold), 30-45s rest.
   - For medium workouts (11-20 mins): 3-4 exercises, 2-3 sets each, 8-12 reps, 35-45s rest.
   - For longer workouts (21-45 mins): 4-6 exercises, 3-4 sets each, 10-15 reps, 45-60s rest.
   - For 45+ mins: 5-7 exercises, 4 sets each, 12-18 reps, 60s rest.

2. REALISTIC ENERGY LEVEL SCALING (1-5):
   - Energy 1-2 (Low / Tired): Focus on active recovery & joint mobility. 6-10 reps, 2 sets, generous rest (45-60s).
   - Energy 3 (Moderate / Steady): Balanced conditioning. 10-12 reps, 2-3 sets, 35-45s rest.
   - Energy 4-5 (High / Motivated / Peak): High intensity & power. 12-18 reps, 3-4 sets, 30-45s rest.

3. SUPPORTED EXERCISES:
   - Choose exercises primarily from the app's computer-vision tracking library:
     "Push-ups", "Bodyweight Squats", "Plank Hold", "Pull-ups", "Bicep Curls", "Jumping Jacks", "Mountain Climbers", "Lunges".

4. SCHEMA RULE:
   - In your JSON response, "durationMinutes" MUST be ${durationMinutes}.
   - Return ONLY valid JSON with no markdown formatting.`;

  const prompt = `User Profile & Check-in:
- Mood: ${mood}
- Energy Level (1-5): ${energyLevel}
- Exact Available Duration: ${cleanDurationStr} (${durationMinutes} minutes)
- Fitness Goal: ${fitnessGoal}
- Experience Level: ${experienceLevel}
- Age: ${age}, Height: ${height}, Weight: ${weight}
- Available Equipment: ${equipment}
- Recent Workout History: ${workoutHistory}
- Previous Form Scores: ${previousFormScores}

Generate a workout in this exact JSON schema:
{
  "workoutName": "string",
  "durationMinutes": ${durationMinutes},
  "difficulty": "light" | "moderate" | "intense" | "hard",
  "reason": "string explaining how the volume, reps, and exercise selection match the user's ${mood} mood, ${energyLevel}/5 energy, and ${durationMinutes} min time limit",
  "exercises": [
    {
      "name": "string (e.g. Bodyweight Squats, Push-ups, Plank Hold, Lunges, Jumping Jacks, Mountain Climbers, Pull-ups, Bicep Curls)",
      "sets": number,
      "reps": number,
      "restSeconds": number
    }
  ]
}`;

  try {
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const result = await callGeminiApi(contents, systemInstruction);
    return { ...result, durationMinutes, isFallback: false };
  } catch (err) {
    console.warn(`[Gemini Service] Workout generation fallback used: ${err.message}`);
    return getFallbackWorkout(mood, energyLevel, durationMinutes);
  }
}

/**
 * 2. Gemini Vision AI Keyframe Coaching Analysis
 */
async function analyzeExerciseFrame(params) {
  const {
    exercise = 'squat',
    repNumber = 1,
    localFormScore = 100,
    detectedIssues = [],
    poseData = {},
    imageBase64 = null,
    mimeType = 'image/jpeg',
    keyframeReason = 'deepest_position',
  } = params || {};

  const systemInstruction = `You are an elite AI Olympic biomechanics and exercise form coach.
Analyze the user's exercise keyframe and pose data to provide clear, actionable coaching cues for their next repetition.
Focus on safety, joint alignment, full range of motion, and posture.
Return ONLY valid JSON matching the requested schema.`;

  const prompt = `Exercise: ${exercise}
Repetition Number: ${repNumber}
Local Form Score: ${localFormScore}%
Keyframe Moment: ${keyframeReason}
Local Issues Detected: ${detectedIssues.length > 0 ? detectedIssues.join(', ') : 'None detected locally'}
Joint Angles: ${JSON.stringify(poseData)}

Analyze this keyframe and return JSON in this exact structure:
{
  "assessment": "good" | "needs_improvement",
  "confidence": number between 0.0 and 1.0,
  "issues": [
    {
      "issue": "string description",
      "severity": "minor" | "moderate" | "major",
      "suggestion": "string actionable visual correction"
    }
  ],
  "overallSuggestion": "concise coaching tip (max 12 words) for the next rep"
}`;

  try {
    const parts = [{ text: prompt }];

    // If an image was provided, add it as inlineData
    if (imageBase64) {
      parts.unshift({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
        },
      });
    }

    const contents = [{ role: 'user', parts }];
    const result = await callGeminiApi(contents, systemInstruction);
    return { ...result, isFallback: false };
  } catch (err) {
    console.warn(`[Gemini Service] Vision analysis fallback used: ${err.message}`);
    return getFallbackVisionAnalysis(exercise, repNumber, detectedIssues, localFormScore, poseData);
  }
}

/**
 * Smart Local Fallbacks with Realistic Time and Energy Scaling
 */
function getFallbackWorkout(mood, energy, duration) {
  const isLow = energy <= 2 || mood === 'Low Energy' || mood === 'Tired';
  const isHigh = energy >= 4 || mood === 'Motivated' || mood === 'Great';
  const parsedDuration = parseInt(duration, 10) || (isLow ? 15 : isHigh ? 30 : 20);
  const difficulty = isLow ? 'light' : isHigh ? 'intense' : 'moderate';

  if (parsedDuration <= 10) {
    if (isLow) {
      return {
        workoutName: `${parsedDuration}-Min Gentle Recovery Flow`,
        durationMinutes: parsedDuration,
        difficulty: 'light',
        reason: `Quick ${parsedDuration}-minute session tailored for low energy (${energy}/5). Uses gentle volume and 45s recovery intervals to re-energize without fatigue.`,
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
        workoutName: `${parsedDuration}-Min High-Intensity Sprint`,
        durationMinutes: parsedDuration,
        difficulty: 'intense',
        reason: `High-tempo ${parsedDuration}-minute blast matching your ${energy}/5 energy. Short rest periods and explosive bodyweight movements maximize calorie burn.`,
        exercises: [
          { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 30 },
          { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 30 },
          { name: 'Jumping Jacks', sets: 2, reps: 20, restSeconds: 30 },
        ],
        isFallback: true,
      };
    }
    return {
      workoutName: `${parsedDuration}-Min Express Activation`,
      durationMinutes: parsedDuration,
      difficulty: 'moderate',
      reason: `Balanced ${parsedDuration}-minute full-body activation fitting your ${energy}/5 energy level.`,
      exercises: [
        { name: 'Bodyweight Squats', sets: 2, reps: 10, restSeconds: 35 },
        { name: 'Push-ups', sets: 2, reps: 8, restSeconds: 35 },
        { name: 'Plank Hold', sets: 2, reps: 25, restSeconds: 35 },
      ],
      isFallback: true,
    };
  }

  if (parsedDuration <= 15) {
    if (isLow) {
      return {
        workoutName: `${parsedDuration}-Min Low-Impact Mobility Flow`,
        durationMinutes: parsedDuration,
        difficulty: 'light',
        reason: `${parsedDuration}-minute recovery session for ${mood.toLowerCase()} mood and energy ${energy}/5. Generous rest and joint-friendly bodyweight reps.`,
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
        workoutName: `${parsedDuration}-Min Power Conditioning`,
        durationMinutes: parsedDuration,
        difficulty: 'intense',
        reason: `${parsedDuration} minutes of athletic power training calibrated for peak energy ${energy}/5.`,
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
      workoutName: `${parsedDuration}-Min Core & Strength Pulse`,
      durationMinutes: parsedDuration,
      difficulty: 'moderate',
      reason: `${parsedDuration}-minute conditioning routine with steady 45s rest intervals for balanced ${energy}/5 energy.`,
      exercises: [
        { name: 'Bodyweight Squats', sets: 3, reps: 10, restSeconds: 45 },
        { name: 'Push-ups', sets: 3, reps: 8, restSeconds: 45 },
        { name: 'Lunges', sets: 2, reps: 8, restSeconds: 45 },
        { name: 'Plank Hold', sets: 2, reps: 30, restSeconds: 45 },
      ],
      isFallback: true,
    };
  }

  if (parsedDuration <= 20) {
    if (isLow) {
      return {
        workoutName: `${parsedDuration}-Min Recovery & Mobility`,
        durationMinutes: parsedDuration,
        difficulty: 'light',
        reason: `${parsedDuration}-minute recovery routine matching ${mood.toLowerCase()} mood and ${energy}/5 energy. Controlled tempo with 60s recovery periods.`,
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
        workoutName: `${parsedDuration}-Min High Energy Full Body Power`,
        durationMinutes: parsedDuration,
        difficulty: 'intense',
        reason: `${parsedDuration} minutes of high-output power training for peak ${energy}/5 energy. 4 sets with explosive bodyweight reps.`,
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
      workoutName: `${parsedDuration}-Min Balanced Full Body Conditioning`,
      durationMinutes: parsedDuration,
      difficulty: 'moderate',
      reason: `${parsedDuration}-minute structured conditioning plan with 3 sets across core movement patterns for steady ${energy}/5 energy.`,
      exercises: [
        { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
        { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 },
        { name: 'Lunges', sets: 3, reps: 10, restSeconds: 45 },
        { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 },
      ],
      isFallback: true,
    };
  }

  if (parsedDuration <= 30) {
    if (isLow) {
      return {
        workoutName: `${parsedDuration}-Min Extended Recovery & Posture`,
        durationMinutes: parsedDuration,
        difficulty: 'light',
        reason: `${parsedDuration}-minute steady-state mobility and joint alignment routine for ${energy}/5 energy level.`,
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
        workoutName: `${parsedDuration}-Min Athletic Hypertrophy & Power`,
        durationMinutes: parsedDuration,
        difficulty: 'intense',
        reason: `${parsedDuration}-minute complete athletic volume session matching peak ${energy}/5 energy with full progressive overload.`,
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
      workoutName: `${parsedDuration}-Min Complete Strength & Conditioning`,
      durationMinutes: parsedDuration,
      difficulty: 'moderate',
      reason: `${parsedDuration}-minute full body workout delivering 5 balanced exercise blocks tailored for ${energy}/5 energy.`,
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

  // 31+ Mins (Custom long sessions e.g. 45m, 60m, 90m)
  if (isLow) {
    return {
      workoutName: `${parsedDuration}-Min Extended Full Body Rejuvenation`,
      durationMinutes: parsedDuration,
      difficulty: 'light',
      reason: `${parsedDuration}-minute low-stress rejuvenation session with 75s rest periods, joint mobility, and low fatigue volume.`,
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
      workoutName: `${parsedDuration}-Min Total Body Mastery`,
      durationMinutes: parsedDuration,
      difficulty: 'intense',
      reason: `${parsedDuration}-minute comprehensive workout maximizing total volume across 7 movements for peak ${energy}/5 energy.`,
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
    workoutName: `${parsedDuration}-Min Extended Conditioning Matrix`,
    durationMinutes: parsedDuration,
    difficulty: 'moderate',
    reason: `${parsedDuration}-minute complete workout with 4 sets across major kinetic chains for solid ${energy}/5 energy.`,
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

function getFallbackVisionAnalysis(exercise, repNumber, detectedIssues, localFormScore, poseData) {
  const normExercise = (exercise || '').toLowerCase();

  if (detectedIssues && detectedIssues.length > 0) {
    const mainIssue = detectedIssues[0];
    let tip = 'Keep your core braced and maintain controlled tempo.';

    if (mainIssue.toLowerCase().includes('elbow')) {
      tip = 'Keep your elbows tucked at ~45° to protect shoulders.';
    } else if (mainIssue.toLowerCase().includes('hip') || mainIssue.toLowerCase().includes('sag')) {
      tip = 'Keep your hips up and body in a straight line.';
    } else if (mainIssue.toLowerCase().includes('knee') || mainIssue.toLowerCase().includes('cave')) {
      tip = 'Push your knees outward in line with your toes.';
    } else if (mainIssue.toLowerCase().includes('depth') || mainIssue.toLowerCase().includes('height')) {
      tip = 'Focus on full depth on your next repetition.';
    }

    return {
      assessment: 'needs_improvement',
      confidence: 0.85,
      issues: [
        {
          issue: mainIssue,
          severity: 'moderate',
          suggestion: tip,
        },
      ],
      overallSuggestion: tip,
      isFallback: true,
    };
  }

  let goodTip = 'Excellent form and tempo — keep it up!';
  if (normExercise.includes('squat')) {
    goodTip = 'Great squat depth and knee alignment — keep it up!';
  } else if (normExercise.includes('pushup')) {
    goodTip = 'Great elbow tuck and body alignment — keep it up!';
  } else if (normExercise.includes('plank')) {
    goodTip = 'Solid straight spine and hip posture — keep holding!';
  }

  return {
    assessment: 'good',
    confidence: 0.92,
    issues: [],
    overallSuggestion: goodTip,
    isFallback: true,
  };
}

/**
 * 3. Post-Workout Gemini AI Analysis & Summary
 */
async function analyzeWorkoutSummary(params) {
  const {
    workoutType = 'Pushups',
    workoutName = 'Daily Routine',
    mood = 'Good',
    energyLevel = 3,
    durationSeconds = 120,
    activeSeconds = 90,
    caloriesBurned = 35,
    repCount = 15,
    goodReps = 13,
    badReps = 2,
    plannedReps = 15,
    formAccuracyScore = 87,
    geminiObservations = [],
    previousWorkoutHistory = 'First recorded session',
  } = params || {};

  const systemInstruction = `You are an elite, supportive AI strength coach and biomechanist.
Analyze the user's completed workout session and generate a concise, inspiring, and biomechanically insightful post-workout summary.
Compare with previous workouts if available.
Return ONLY valid JSON matching the schema.`;

  const prompt = `Completed Workout Details:
- Workout: ${workoutName} (${workoutType})
- Check-In: Mood "${mood}", Energy Level ${energyLevel}/5
- Total Reps: ${repCount} (Good Reps: ${goodReps}, Bad Reps: ${badReps}, Planned: ${plannedReps})
- Form Accuracy Score: ${formAccuracyScore}%
- Duration: ${Math.round(durationSeconds / 60)} minutes (${activeSeconds}s active time)
- Calories: ${caloriesBurned} kcal
- In-Workout Gemini Vision Observations: ${geminiObservations.length > 0 ? geminiObservations.join('; ') : 'Consistent clean form recorded during keyframes'}
- Recent Workout History: ${previousWorkoutHistory}

Generate an analysis in this exact JSON schema:
{
  "summary": "1-2 sentence overall coaching summary highlighting achievements and progress",
  "strengths": ["string strength 1", "string strength 2"],
  "areasToImprove": ["string area 1", "string area 2"],
  "nextWorkoutSuggestion": "1 actionable suggestion for their next session to continue progress"
}`;

  try {
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const result = await callGeminiApi(contents, systemInstruction);
    return { ...result, isFallback: false };
  } catch (err) {
    console.warn(`[Gemini Service] Workout summary fallback used: ${err.message}`);
    return getFallbackSummaryAnalysis(params);
  }
}

function getFallbackSummaryAnalysis(params) {
  const {
    workoutType = 'Workout',
    repCount = 10,
    goodReps = 8,
    formAccuracyScore = 80,
    geminiObservations = [],
  } = params || {};

  const score = Number(formAccuracyScore) || 80;
  let summary = `You completed ${repCount} reps with a form accuracy score of ${score}%. Strong discipline and steady effort throughout!`;
  if (score >= 90) {
    summary = `Outstanding performance! You completed ${repCount} reps with a stellar ${score}% form accuracy score, maintaining clean joint angles.`;
  } else if (score < 75) {
    summary = `Good effort completing ${repCount} reps (${score}% form score). Focus on controlled tempo and full depth on your next session.`;
  }

  const strengths = [
    `${goodReps} repetitions completed with full range of motion.`,
    `Consistent workout pacing and steady cadence.`,
  ];

  const areasToImprove = [];
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

module.exports = {
  generateWorkout,
  analyzeExerciseFrame,
  analyzeWorkoutSummary,
};
