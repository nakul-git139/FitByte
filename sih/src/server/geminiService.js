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
    duration = '20-30 mins',
    equipment = 'Bodyweight / Calisthenics',
    workoutHistory = 'Consistent weekly workouts',
    previousFormScores = 'Recent average form score: 85%',
  } = params || {};

  const systemInstruction = `You are an elite, certified AI strength and conditioning coach.
Generate a structured, personalized daily workout plan tailored specifically to the user's current mood, energy level, physical profile, and recent biomechanics form history.
Return ONLY valid JSON with no markdown formatting.`;

  const prompt = `User Profile & Check-in:
- Mood: ${mood}
- Energy Level (1-5): ${energyLevel}
- Age: ${age}
- Height: ${height}
- Weight: ${weight}
- Fitness Goal: ${fitnessGoal}
- Experience Level: ${experienceLevel}
- Activity Level: ${activityLevel}
- Desired Duration: ${duration}
- Available Equipment: ${equipment}
- Recent Workout History & Progress: ${workoutHistory}
- Previous Form Scores & Biomechanics Notes: ${previousFormScores}

Generate a workout in this exact JSON schema:
{
  "workoutName": "string",
  "durationMinutes": number,
  "difficulty": "light" | "moderate" | "intense" | "hard",
  "reason": "string explaining how this workout matches the mood and energy",
  "exercises": [
    {
      "name": "string",
      "sets": number,
      "reps": number,
      "restSeconds": number
    }
  ]
}`;

  try {
    const contents = [{ role: 'user', parts: [{ text: prompt }] }];
    const result = await callGeminiApi(contents, systemInstruction);
    return { ...result, isFallback: false };
  } catch (err) {
    console.warn(`[Gemini Service] Workout generation fallback used: ${err.message}`);
    return getFallbackWorkout(mood, energyLevel);
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
 * Smart Local Fallbacks
 */
function getFallbackWorkout(mood, energy) {
  const isLow = energy <= 2 || mood === 'Low Energy' || mood === 'Tired';
  const isHigh = energy >= 4 || mood === 'Motivated' || mood === 'Great';

  if (isLow) {
    return {
      workoutName: 'Low Energy Recovery & Mobility',
      durationMinutes: 20,
      difficulty: 'light',
      reason: `You reported ${mood.toLowerCase()} and energy level ${energy}/5, so this workout uses lighter volume, controlled tempo, and longer recovery intervals.`,
      exercises: [
        { name: 'Bodyweight Squats', sets: 2, reps: 8, restSeconds: 60 },
        { name: 'Incline / Standard Push-ups', sets: 2, reps: 6, restSeconds: 60 },
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
      reason: `You reported ${mood.toLowerCase()} with peak energy ${energy}/5! This workout maximizes muscle recruitment with higher volume and explosive movements.`,
      exercises: [
        { name: 'Bodyweight Squats', sets: 4, reps: 15, restSeconds: 45 },
        { name: 'Push-ups', sets: 4, reps: 12, restSeconds: 45 },
        { name: 'Jumping Jacks', sets: 3, reps: 25, restSeconds: 30 },
        { name: 'Mountain Climbers', sets: 3, reps: 20, restSeconds: 30 },
        { name: 'Plank Hold', sets: 3, reps: 45, restSeconds: 45 },
      ],
      isFallback: true,
    };
  }

  return {
    workoutName: 'Balanced Full Body Conditioning',
    durationMinutes: 25,
    difficulty: 'moderate',
    reason: `You reported feeling ${mood.toLowerCase()} with steady energy ${energy}/5. This balanced session delivers steady conditioning and joint mobility.`,
    exercises: [
      { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
      { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 },
      { name: 'Lunges', sets: 3, reps: 10, restSeconds: 45 },
      { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 },
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
