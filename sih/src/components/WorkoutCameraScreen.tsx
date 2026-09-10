import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { CameraFacing, WorkoutStatus, WorkoutStats, WorkoutSummary } from '../types/workout';
import { PoseLandmark } from '../types/pose';
import { ExercisePhase, FormError, VisibilityStatus } from '../engine/types';
import { ExerciseEngineRegistry, SUPPORTED_EXERCISES } from '../engine/registry';
import { SpeechService } from '../engine/core/SpeechService';
import { PermissionScreen } from './PermissionScreen';
import { WorkoutHUDOverlay } from './WorkoutHUDOverlay';
import { WorkoutControls } from './WorkoutControls';
import { WorkoutSummaryModal } from './WorkoutSummaryModal';
import { MediaPipePoseTracker } from './MediaPipePoseTracker';
import { GeminiVisionService } from '../services/geminiVisionService';
import { VisionCoachingTip } from '../types/vision';
import { MoodCheckInData } from '../types/mood';
import { GeneratedWorkout } from '../types/aiWorkout';
import { WorkoutAiService } from '../services/workoutAiService';
import { StorageService } from '../services/storageService';

const EXERCISE_OPTIONS = [
  { name: 'Pushups', icon: 'barbell-outline' as const },
  { name: 'Squats', icon: 'body-outline' as const },
  { name: 'Pullups', icon: 'trending-up-outline' as const },
  { name: 'Plank', icon: 'timer-outline' as const },
  { name: 'Bicep Curls', icon: 'fitness-outline' as const },
  { name: 'Jumping Jacks', icon: 'walk-outline' as const },
  { name: 'Mountain Climbers', icon: 'flame-outline' as const },
  { name: 'Lunges', icon: 'footsteps-outline' as const },
];

interface WorkoutCameraScreenProps {
  initialExercise?: string;
  initialTargetReps?: number;
  initialWorkoutPlan?: GeneratedWorkout | null;
  checkInData?: MoodCheckInData | null;
  onExit?: () => void;
}

export const WorkoutCameraScreen: React.FC<WorkoutCameraScreenProps> = ({
  initialExercise,
  initialTargetReps,
  initialWorkoutPlan,
  checkInData,
  onExit,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraFacing>('front');
  const [showPoseSkeleton, setShowPoseSkeleton] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Helper to dynamically extract target reps from the mood-generated AI plan
  const getDynamicTargetReps = (exerciseName: string): number => {
    if (initialTargetReps && initialExercise === exerciseName) {
      return initialTargetReps;
    }
    if (initialWorkoutPlan?.exercises && initialWorkoutPlan.exercises.length > 0) {
      const normalizedQuery = exerciseName.toLowerCase().replace(/[^a-z]/g, '');
      const found = initialWorkoutPlan.exercises.find((ex) => {
        const normName = ex.name.toLowerCase().replace(/[^a-z]/g, '');
        return normName.includes(normalizedQuery) || normalizedQuery.includes(normName);
      });
      if (found && typeof found.reps === 'number' && found.reps > 0) {
        return found.reps;
      }
    }
    if (exerciseName === 'Plank') return 30;
    if (exerciseName === 'Jumping Jacks' || exerciseName === 'Mountain Climbers') return 20;
    return 10;
  };

  const initialExName = initialExercise || initialWorkoutPlan?.exercises?.[0]?.name || 'Pushups';
  const initialTarget = initialTargetReps || getDynamicTargetReps(initialExName);

  const [workoutStatus, setWorkoutStatus] = useState<WorkoutStatus>('idle');
  const [selectedExercise, setSelectedExercise] = useState<string>(initialExName);
  const [showExercisePicker, setShowExercisePicker] = useState<boolean>(false);

  // Helper to resolve active workout routine from Gemini or fallback plan
  const activePlan: GeneratedWorkout = initialWorkoutPlan || {
    workoutName: 'Balanced Full Body Conditioning',
    durationMinutes: 20,
    difficulty: 'moderate' as const,
    reason: 'Personalized daily workout routine',
    exercises: [
      { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 },
      { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
      { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 },
    ],
  };

  const normalizeExName = (name: string) => (name || '').toLowerCase().replace(/[^a-z]/g, '');

  const NEXT_RECOMMENDED_MAP: Record<string, { name: string; sets: number; reps: number; restSeconds: number }> = {
    pushups: { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
    squats: { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 },
    bicepcurls: { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
    bicep: { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
    curl: { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
    plank: { name: 'Lunges', sets: 3, reps: 10, restSeconds: 45 },
    lunges: { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 },
    jumpingjacks: { name: 'Mountain Climbers', sets: 3, reps: 20, restSeconds: 30 },
    mountainclimbers: { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 },
    pullups: { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 },
  };

  const getFallbackNextExercise = (exerciseName: string) => {
    const query = normalizeExName(exerciseName);
    for (const key of Object.keys(NEXT_RECOMMENDED_MAP)) {
      if (query.includes(key) || key.includes(query)) {
        return NEXT_RECOMMENDED_MAP[key];
      }
    }
    return { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 };
  };

  const getExerciseIndexInPlan = (exerciseName: string): number => {
    if (!activePlan.exercises || activePlan.exercises.length === 0) return -1;
    const query = normalizeExName(exerciseName);
    return activePlan.exercises.findIndex((ex) => {
      const norm = normalizeExName(ex.name);
      return norm.includes(query) || query.includes(norm);
    });
  };

  const currentExerciseIndex = getExerciseIndexInPlan(selectedExercise);
  const totalExercisesCount = activePlan.exercises ? activePlan.exercises.length : 1;
  const currentStepNumber = currentExerciseIndex >= 0 ? currentExerciseIndex + 1 : 1;
  const planNextExercise =
    activePlan.exercises && currentExerciseIndex >= 0 && currentExerciseIndex + 1 < totalExercisesCount
      ? activePlan.exercises[currentExerciseIndex + 1]
      : null;
  const nextExercise = planNextExercise || getFallbackNextExercise(selectedExercise);

  // Live real-time computer vision metrics from MediaPipe & Form Engine
  const [liveKneeAngle, setLiveKneeAngle] = useState<number>(0);
  const [liveElbowAngle, setLiveElbowAngle] = useState<number>(0);
  const [liveHipAngle, setLiveHipAngle] = useState<number>(0);
  const [liveElbowWidthRatio, setLiveElbowWidthRatio] = useState<number>(0);
  const [liveFeetSpanRatio, setLiveFeetSpanRatio] = useState<number>(0);
  const [livePrimaryAngle, setLivePrimaryAngle] = useState<number>(0);
  const [detectedJointCount, setDetectedJointCount] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<ExercisePhase>('IDLE');

  // Real-time AI Form Feedback state
  const [primaryFeedback, setPrimaryFeedback] = useState<FormError | null>(null);
  const [isGoodForm, setIsGoodForm] = useState<boolean>(true);
  const [highlightJoints, setHighlightJoints] = useState<number[]>([]);
  const [visibilityStatus, setVisibilityStatus] = useState<VisibilityStatus | undefined>(undefined);
  const [geminiCoachingTip, setGeminiCoachingTip] = useState<VisionCoachingTip | null>(null);

  const [stats, setStats] = useState<WorkoutStats>({
    durationSeconds: 0,
    activeSeconds: 0,
    caloriesBurned: 0,
    repCount: 0,
    perfectReps: 0,
    targetReps: initialTarget,
    formAccuracyScore: 100,
    startTime: null,
    endTime: null,
  });

  const [summaryData, setSummaryData] = useState<WorkoutSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousRepCountRef = useRef<number>(0);
  const previousErrorIdRef = useRef<string | null>(null);
  const geminiObservationsRef = useRef<string[]>([]);
  const hasAutoCompletedRef = useRef<boolean>(false);

  // Active workout duration timer
  useEffect(() => {
    if (workoutStatus === 'active') {
      timerRef.current = setInterval(() => {
        setStats((prevStats) => {
          const nextDuration = prevStats.durationSeconds + 1;
          const nextActive = prevStats.activeSeconds + 1;

          // METs calorie calculation
          const repKcal = prevStats.repCount * (selectedExercise === 'Pushups' || selectedExercise === 'Pullups' ? 0.48 : 0.40);
          const activeKcal = (nextActive / 60) * 4.2;
          const totalCalories = Math.round(repKcal + activeKcal);

          return {
            ...prevStats,
            durationSeconds: nextDuration,
            activeSeconds: nextActive,
            caloriesBurned: totalCalories,
          };
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [workoutStatus, selectedExercise]);

  // Exercise change handler
  useEffect(() => {
    const dynamicTarget = getDynamicTargetReps(selectedExercise);
    const engine = ExerciseEngineRegistry.getEngine(selectedExercise);
    engine.reset();
    previousRepCountRef.current = 0;
    previousErrorIdRef.current = null;
    hasAutoCompletedRef.current = false;
    setPrimaryFeedback(null);
    setGeminiCoachingTip(null);
    GeminiVisionService.clearCoachingTip();
    setIsGoodForm(true);
    setHighlightJoints([]);
    setStats((prev) => ({
      ...prev,
      targetReps: dynamicTarget,
    }));
  }, [selectedExercise]);

  // Tactile haptics helper
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'notification') => {
    try {
      if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (type === 'notification') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Fallback
    }
  };

  // Handle Real-Time Computer Vision Data from MediaPipe AI & Local Form Analysis Engine
  const handlePoseData = (data: {
    jointCount: number;
    kneeAngle: number;
    elbowAngle: number;
    landmarks: PoseLandmark[];
  }) => {
    setDetectedJointCount(data.jointCount);
    setLiveKneeAngle(data.kneeAngle);
    setLiveElbowAngle(data.elbowAngle);

    // Get active deterministic form engine for the selected exercise
    const engine = ExerciseEngineRegistry.getEngine(selectedExercise);

    if (workoutStatus === 'active' || workoutStatus === 'idle') {
      const result = engine.processFrame(data.landmarks, Date.now());

      setCurrentPhase(result.phase);
      setPrimaryFeedback(result.primaryFeedback);
      setIsGoodForm(result.isGoodForm);
      setHighlightJoints(result.highlightJoints);
      setVisibilityStatus(result.visibilityStatus);

      if (result.metrics.primaryAngle !== undefined && typeof result.metrics.primaryAngle === 'number') {
        setLivePrimaryAngle(result.metrics.primaryAngle);
      }
      if (result.metrics.hipAngle !== undefined && typeof result.metrics.hipAngle === 'number') {
        setLiveHipAngle(result.metrics.hipAngle);
      }
      if (result.metrics.elbowWidthRatio !== undefined && typeof result.metrics.elbowWidthRatio === 'number') {
        setLiveElbowWidthRatio(result.metrics.elbowWidthRatio);
      }
      if (result.metrics.feetSpanRatio !== undefined && typeof result.metrics.feetSpanRatio === 'number') {
        setLiveFeetSpanRatio(result.metrics.feetSpanRatio);
      }

      // If workout is active, track reps and scores
      if (workoutStatus === 'active') {
        const currentTarget = stats.targetReps || getDynamicTargetReps(selectedExercise);

        // Check for newly completed repetition
        if (result.repCount > previousRepCountRef.current) {
          const isNewPerfect = result.perfectReps > stats.perfectReps;
          triggerHaptic(isNewPerfect ? 'notification' : 'medium');
          previousRepCountRef.current = result.repCount;
        }

        // Check for newly triggered form correction
        if (result.primaryFeedback && result.primaryFeedback.ruleId !== previousErrorIdRef.current) {
          triggerHaptic('light');
          previousErrorIdRef.current = result.primaryFeedback.ruleId;
        } else if (!result.primaryFeedback) {
          previousErrorIdRef.current = null;
        }

        setStats((prev) => {
          const repKcal = result.repCount * (selectedExercise === 'Pushups' || selectedExercise === 'Pullups' ? 0.48 : 0.40);
          const activeKcal = (prev.activeSeconds / 60) * 4.2;
          const badReps = Math.max(0, result.repCount - result.perfectReps);

          return {
            ...prev,
            repCount: result.repCount,
            perfectReps: result.perfectReps,
            goodReps: result.perfectReps,
            badReps,
            targetReps: prev.targetReps || getDynamicTargetReps(selectedExercise),
            formAccuracyScore: result.formAccuracyScore,
            caloriesBurned: Math.round(repKcal + activeKcal),
          };
        });

        // Auto-complete workout as soon as target reps or hold duration is achieved
        if (result.repCount >= currentTarget && currentTarget > 0 && !hasAutoCompletedRef.current) {
          hasAutoCompletedRef.current = true;
          handleFinishWorkout(result.repCount, result.perfectReps, result.formAccuracyScore);
          return;
        }
      }

      // Asynchronous Keyframe Gemini Vision Analysis (Non-blocking background dispatch)
      const activeErrors = result.primaryFeedback ? [result.primaryFeedback] : [];
      const visionCheck = GeminiVisionService.shouldAnalyzeFrame(
        result.phase,
        activeErrors,
        result.repCount
      );

      if (visionCheck.eligible) {
        const currentRep = result.repCount;
        const currentScore = result.formAccuracyScore;
        const currentPhase = result.phase;
        const currentMetrics = result.metrics;
        const currentExercise = selectedExercise;

        GeminiVisionService.analyzeKeyframe({
          exercise: currentExercise,
          repNumber: currentRep,
          localFormScore: currentScore,
          detectedIssues: activeErrors.map((e) => e.message),
          poseData: {
            kneeAngle: data.kneeAngle,
            elbowAngle: data.elbowAngle,
            hipAngle: currentMetrics.hipAngle,
            primaryAngle: currentMetrics.primaryAngle,
          },
          keyframeReason: visionCheck.reason,
          timestamp: Date.now(),
        })
          .then((visionResult) => {
            if (visionResult && visionResult.overallSuggestion) {
              setGeminiCoachingTip({
                text: visionResult.overallSuggestion,
                assessment: visionResult.assessment,
                confidence: visionResult.confidence || 0.9,
                timestamp: Date.now(),
                repNumber: currentRep,
              });

              if (!geminiObservationsRef.current.includes(visionResult.overallSuggestion)) {
                geminiObservationsRef.current.push(visionResult.overallSuggestion);
              }
            }
          })
          .catch((err) => {
            console.warn('[WorkoutCameraScreen] Gemini Vision dispatch error:', err);
          });
      }
    }
  };

  // Camera Facing Toggle (Front <-> Back)
  const handleToggleFacing = () => {
    triggerHaptic('light');
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  // Mute / Unmute Voice Feedback
  const handleToggleMute = () => {
    triggerHaptic('light');
    setIsMuted((prev) => {
      const next = !prev;
      SpeechService.setMuted(next);
      return next;
    });
  };

  // Pose Skeleton Toggle
  const handleTogglePoseSkeleton = () => {
    triggerHaptic('light');
    setShowPoseSkeleton((prev) => !prev);
  };

  // Workout Controls Logic
  const handleStartWorkout = () => {
    triggerHaptic('notification');
    const engine = ExerciseEngineRegistry.getEngine(selectedExercise);
    engine.reset();
    previousRepCountRef.current = 0;
    previousErrorIdRef.current = null;
    hasAutoCompletedRef.current = false;
    setGeminiCoachingTip(null);
    GeminiVisionService.clearCoachingTip();

    const target = getDynamicTargetReps(selectedExercise);
    setStats({
      durationSeconds: 0,
      activeSeconds: 0,
      caloriesBurned: 0,
      repCount: 0,
      perfectReps: 0,
      targetReps: target,
      formAccuracyScore: 100,
      startTime: new Date(),
      endTime: null,
    });

    setWorkoutStatus('active');
    SpeechService.speak(`Starting ${selectedExercise} workout.`);
  };

  const handlePauseWorkout = () => {
    triggerHaptic('medium');
    setWorkoutStatus('paused');
    SpeechService.speak('Workout paused.');
  };

  const handleResumeWorkout = () => {
    triggerHaptic('medium');
    setWorkoutStatus('active');
    SpeechService.speak('Resuming workout.');
  };

  const handleFinishWorkout = (overrideReps?: number, overridePerfect?: number, overrideScore?: number) => {
    triggerHaptic('notification');
    const now = new Date();
    const isIsometric = selectedExercise.toLowerCase().includes('plank');
    const repUnit = isIsometric ? 'seconds' : 'repetitions';

    const finalReps = overrideReps !== undefined ? overrideReps : stats.repCount;
    const finalPerfect = overridePerfect !== undefined ? overridePerfect : stats.perfectReps;
    const finalScore = overrideScore !== undefined ? overrideScore : stats.formAccuracyScore;
    const target = stats.targetReps || getDynamicTargetReps(selectedExercise);

    const repKcal = finalReps * (selectedExercise === 'Pushups' || selectedExercise === 'Pullups' ? 0.48 : 0.40);
    const activeKcal = (stats.activeSeconds / 60) * 4.2;
    const totalCalories = Math.max(stats.caloriesBurned, Math.round(repKcal + activeKcal));

    const goodReps = finalPerfect;
    const badReps = Math.max(0, finalReps - finalPerfect);

    const initialSummary: WorkoutSummary = {
      id: Date.now().toString(),
      workoutType: selectedExercise,
      workoutName: initialWorkoutPlan?.workoutName || `${selectedExercise} Session`,
      mood: checkInData?.mood,
      energyLevel: checkInData?.energyLevel,
      durationSeconds: stats.durationSeconds,
      activeSeconds: stats.activeSeconds,
      caloriesBurned: totalCalories,
      repCount: finalReps,
      perfectReps: finalPerfect,
      goodReps,
      badReps,
      targetReps: target,
      formAccuracyScore: finalScore,
      geminiObservations: [...geminiObservationsRef.current],
      aiAnalysis: null,
      completedAt: now,
    };

    setStats((prev) => ({
      ...prev,
      repCount: finalReps,
      perfectReps: finalPerfect,
      goodReps,
      badReps,
      formAccuracyScore: finalScore,
      caloriesBurned: totalCalories,
    }));

    setWorkoutStatus('completed');
    setSummaryData(initialSummary);
    setShowSummaryModal(true);

    const speechText = finalReps >= target
      ? `Goal achieved! You completed all ${finalReps} ${repUnit}. Great job!`
      : `Workout completed. You achieved ${finalReps} ${repUnit}.`;
    SpeechService.speak(speechText);

    // Asynchronously generate Post-Workout Gemini Coaching Summary
    WorkoutAiService.analyzeWorkoutSummary({
      workoutType: selectedExercise,
      workoutName: initialWorkoutPlan?.workoutName || `${selectedExercise} Session`,
      mood: checkInData?.mood,
      energyLevel: checkInData?.energyLevel,
      durationSeconds: stats.durationSeconds,
      activeSeconds: stats.activeSeconds,
      caloriesBurned: totalCalories,
      repCount: finalReps,
      goodReps,
      badReps,
      plannedReps: target,
      formAccuracyScore: finalScore,
      geminiObservations: [...geminiObservationsRef.current],
    })
      .then((aiAnalysis) => {
        setSummaryData((prev) => (prev ? { ...prev, aiAnalysis } : prev));
      })
      .catch((err) => {
        console.warn('[WorkoutCameraScreen] Post-workout analysis error:', err);
      });
  };

  const handleStopWorkout = () => {
    triggerHaptic('heavy');
    hasAutoCompletedRef.current = true;
    handleFinishWorkout();
  };

  const handleSaveSummary = async () => {
    triggerHaptic('notification');
    if (summaryData) {
      const goodReps = summaryData.goodReps ?? summaryData.perfectReps;
      const badReps = summaryData.badReps ?? Math.max(0, summaryData.repCount - summaryData.perfectReps);

      try {
        await StorageService.saveWorkoutSession({
          id: summaryData.id,
          date: summaryData.completedAt.toISOString().split('T')[0],
          completedAt: summaryData.completedAt.toISOString(),
          mood: summaryData.mood,
          energyLevel: summaryData.energyLevel,
          workoutName: summaryData.workoutName || `${summaryData.workoutType} Session`,
          workoutType: summaryData.workoutType,
          exercises: [
            {
              name: summaryData.workoutType,
              plannedReps: summaryData.targetReps,
              actualReps: summaryData.repCount,
              goodReps,
              badReps,
              formScore: summaryData.formAccuracyScore,
            },
          ],
          plannedReps: summaryData.targetReps || getDynamicTargetReps(selectedExercise),
          actualReps: summaryData.repCount,
          goodReps,
          badReps,
          formAccuracyScore: summaryData.formAccuracyScore,
          durationSeconds: summaryData.durationSeconds,
          activeSeconds: summaryData.activeSeconds,
          caloriesBurned: summaryData.caloriesBurned,
          geminiObservations: summaryData.geminiObservations || [],
          aiAnalysis: summaryData.aiAnalysis || undefined,
        });
      } catch (e) {
        console.warn('[WorkoutCameraScreen] Error saving session to storage:', e);
      }
    }

    setShowSummaryModal(false);
    resetWorkoutScreen();
    if (onExit) onExit();
  };

  const handleStartNextExercise = async () => {
    triggerHaptic('notification');

    // 1. Auto-save completed session before starting next exercise
    if (summaryData) {
      const goodReps = summaryData.goodReps ?? summaryData.perfectReps;
      const badReps = summaryData.badReps ?? Math.max(0, summaryData.repCount - summaryData.perfectReps);

      try {
        await StorageService.saveWorkoutSession({
          id: summaryData.id,
          date: summaryData.completedAt.toISOString().split('T')[0],
          completedAt: summaryData.completedAt.toISOString(),
          mood: summaryData.mood,
          energyLevel: summaryData.energyLevel,
          workoutName: summaryData.workoutName || `${summaryData.workoutType} Session`,
          workoutType: summaryData.workoutType,
          exercises: [
            {
              name: summaryData.workoutType,
              plannedReps: summaryData.targetReps,
              actualReps: summaryData.repCount,
              goodReps,
              badReps,
              formScore: summaryData.formAccuracyScore,
            },
          ],
          plannedReps: summaryData.targetReps || getDynamicTargetReps(selectedExercise),
          actualReps: summaryData.repCount,
          goodReps,
          badReps,
          formAccuracyScore: summaryData.formAccuracyScore,
          durationSeconds: summaryData.durationSeconds,
          activeSeconds: summaryData.activeSeconds,
          caloriesBurned: summaryData.caloriesBurned,
          geminiObservations: summaryData.geminiObservations || [],
          aiAnalysis: summaryData.aiAnalysis || undefined,
        });
      } catch (e) {
        console.warn('[WorkoutCameraScreen] Error auto-saving session before next workout:', e);
      }
    }

    if (!nextExercise) {
      setShowSummaryModal(false);
      resetWorkoutScreen();
      if (onExit) onExit();
      return;
    }

    // 2. Resolve next exercise name and target reps
    const nextName = nextExercise.name;
    const nextTargetReps = nextExercise.reps || getDynamicTargetReps(nextName);
    const isPlank = nextName.toLowerCase().includes('plank');

    // 3. Reset form engine and tracking
    const newEngine = ExerciseEngineRegistry.getEngine(nextName);
    newEngine.reset();
    previousRepCountRef.current = 0;
    previousErrorIdRef.current = null;
    hasAutoCompletedRef.current = false;
    geminiObservationsRef.current = [];
    setGeminiCoachingTip(null);
    GeminiVisionService.clearCoachingTip();
    setPrimaryFeedback(null);
    setIsGoodForm(true);
    setHighlightJoints([]);

    // 4. Update active workout state
    setSelectedExercise(nextName);
    setStats({
      durationSeconds: 0,
      activeSeconds: 0,
      caloriesBurned: 0,
      repCount: 0,
      perfectReps: 0,
      targetReps: nextTargetReps,
      formAccuracyScore: 100,
      startTime: new Date(),
      endTime: null,
    });

    // 5. Dismiss modal and set workout active
    setShowSummaryModal(false);
    setWorkoutStatus('active');

    // 6. Voice Coach Cue
    SpeechService.speak(
      `Starting next exercise: ${nextName}. ${isPlank ? `Hold for ${nextTargetReps} seconds.` : `Target: ${nextTargetReps} reps.`} Get ready!`
    );
  };

  const handleDismissSummary = () => {
    triggerHaptic('light');
    setShowSummaryModal(false);
    resetWorkoutScreen();
    if (onExit) onExit();
  };

  const resetWorkoutScreen = () => {
    setWorkoutStatus('idle');
    const engine = ExerciseEngineRegistry.getEngine(selectedExercise);
    engine.reset();
    previousRepCountRef.current = 0;
    previousErrorIdRef.current = null;
    hasAutoCompletedRef.current = false;
    geminiObservationsRef.current = [];
    setGeminiCoachingTip(null);
    GeminiVisionService.clearCoachingTip();

    setStats({
      durationSeconds: 0,
      activeSeconds: 0,
      caloriesBurned: 0,
      repCount: 0,
      perfectReps: 0,
      formAccuracyScore: 100,
      startTime: null,
      endTime: null,
    });
    setPrimaryFeedback(null);
    setIsGoodForm(true);
    setHighlightJoints([]);
  };

  const handleSelectExercise = () => {
    setShowExercisePicker(true);
  };

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing Camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return <PermissionScreen onRequestPermission={requestPermission} />;
  }

  return (
    <View style={styles.container}>
      {/* 1. Real-Time MediaPipe Computer Vision AI View */}
      {showPoseSkeleton ? (
        <MediaPipePoseTracker
          facing={facing}
          visible={showPoseSkeleton}
          highlightJoints={highlightJoints}
          isGoodForm={isGoodForm}
          onPoseData={handlePoseData}
          onFacingChange={(newFacing) => setFacing(newFacing)}
        />
      ) : (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
        />
      )}

      {/* Head-Up Display (HUD) with Real-Time AI Form Corrections & Hero Rep Widget */}
      <WorkoutHUDOverlay
        status={workoutStatus}
        stats={stats}
        facing={facing}
        isMuted={isMuted}
        selectedExercise={selectedExercise}
        showPoseSkeleton={showPoseSkeleton}
        targetReps={stats.targetReps || getDynamicTargetReps(selectedExercise)}
        phase={currentPhase}
        kneeAngle={liveKneeAngle}
        elbowAngle={liveElbowAngle}
        hipAngle={liveHipAngle}
        elbowWidthRatio={liveElbowWidthRatio}
        feetSpanRatio={liveFeetSpanRatio}
        primaryAngle={livePrimaryAngle}
        jointCount={detectedJointCount}
        primaryFeedback={primaryFeedback}
        geminiCoachingTip={geminiCoachingTip}
        isGoodForm={isGoodForm}
        visibilityStatus={visibilityStatus}
        onToggleFacing={handleToggleFacing}
        onToggleMute={handleToggleMute}
        onSelectExercise={handleSelectExercise}
        onTogglePoseSkeleton={handleTogglePoseSkeleton}
        onExit={onExit}
      />

      {/* Workout Action Buttons (Start / Pause / Stop Workout) */}
      <View style={styles.bottomControlsWrapper} pointerEvents="box-none">
        <WorkoutControls
          status={workoutStatus}
          onStartWorkout={handleStartWorkout}
          onPauseWorkout={handlePauseWorkout}
          onResumeWorkout={handleResumeWorkout}
          onStopWorkout={handleStopWorkout}
        />
      </View>

      {/* Post Workout Summary Modal */}
      <WorkoutSummaryModal
        visible={showSummaryModal}
        summary={summaryData}
        nextExercise={nextExercise}
        currentStepIndex={currentStepNumber}
        totalStepsCount={totalExercisesCount}
        onStartNext={nextExercise ? handleStartNextExercise : undefined}
        onSave={handleSaveSummary}
        onDismiss={handleDismissSummary}
      />

      {/* Exercise Picker Modal */}
      <Modal
        visible={showExercisePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <View style={styles.exerciseModalOverlay}>
          <View style={styles.exerciseModalSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Choose Exercise</Text>
              <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.exerciseScrollList} showsVerticalScrollIndicator={false}>
              {EXERCISE_OPTIONS.map((item) => (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.exerciseOption,
                    selectedExercise === item.name && styles.selectedExerciseOption,
                  ]}
                  onPress={() => {
                    setSelectedExercise(item.name);
                    setShowExercisePicker(false);
                  }}
                >
                  <View style={styles.exerciseOptionLeft}>
                    <Ionicons
                      name={item.icon}
                      size={22}
                      color={selectedExercise === item.name ? '#10B981' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.exerciseOptionText,
                        selectedExercise === item.name && styles.selectedExerciseOptionText,
                      ]}
                    >
                      {item.name}
                    </Text>
                  </View>
                  {selectedExercise === item.name && (
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomControlsWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
  },
  exerciseModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  exerciseModalSheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  exerciseScrollList: {
    maxHeight: 380,
  },
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  exerciseOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectedExerciseOption: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  exerciseOptionText: {
    color: '#CBD5E1',
    fontSize: 15,
    fontWeight: '600',
  },
  selectedExerciseOptionText: {
    color: '#10B981',
    fontWeight: '700',
  },
});
