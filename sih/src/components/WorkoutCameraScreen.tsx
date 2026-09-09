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

export const WorkoutCameraScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraFacing>('front');
  const [showPoseSkeleton, setShowPoseSkeleton] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const [workoutStatus, setWorkoutStatus] = useState<WorkoutStatus>('idle');
  const [selectedExercise, setSelectedExercise] = useState<string>('Pushups');
  const [showExercisePicker, setShowExercisePicker] = useState<boolean>(false);

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

  const [stats, setStats] = useState<WorkoutStats>({
    durationSeconds: 0,
    activeSeconds: 0,
    caloriesBurned: 0,
    repCount: 0,
    perfectReps: 0,
    formAccuracyScore: 100,
    startTime: null,
    endTime: null,
  });

  const [summaryData, setSummaryData] = useState<WorkoutSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousRepCountRef = useRef<number>(0);
  const previousErrorIdRef = useRef<string | null>(null);

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
    const engine = ExerciseEngineRegistry.getEngine(selectedExercise);
    engine.reset();
    previousRepCountRef.current = 0;
    previousErrorIdRef.current = null;
    setPrimaryFeedback(null);
    setIsGoodForm(true);
    setHighlightJoints([]);
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

          return {
            ...prev,
            repCount: result.repCount,
            perfectReps: result.perfectReps,
            formAccuracyScore: result.formAccuracyScore,
            caloriesBurned: Math.round(repKcal + activeKcal),
          };
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

    setStats({
      durationSeconds: 0,
      activeSeconds: 0,
      caloriesBurned: 0,
      repCount: 0,
      perfectReps: 0,
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

  const handleStopWorkout = () => {
    triggerHaptic('heavy');
    const now = new Date();
    const isIsometric = selectedExercise === 'Plank';
    const repUnit = isIsometric ? 'seconds' : 'repetitions';

    const completedSummary: WorkoutSummary = {
      id: Date.now().toString(),
      workoutType: selectedExercise,
      durationSeconds: stats.durationSeconds,
      activeSeconds: stats.activeSeconds,
      caloriesBurned: stats.caloriesBurned,
      repCount: stats.repCount,
      perfectReps: stats.perfectReps,
      formAccuracyScore: stats.formAccuracyScore,
      completedAt: now,
    };

    setWorkoutStatus('completed');
    setSummaryData(completedSummary);
    setShowSummaryModal(true);
    SpeechService.speak(`Workout completed. Great job! You achieved ${stats.repCount} ${repUnit}.`);
  };

  const handleSaveSummary = () => {
    triggerHaptic('notification');
    setShowSummaryModal(false);
    resetWorkoutScreen();
  };

  const handleDismissSummary = () => {
    triggerHaptic('light');
    setShowSummaryModal(false);
    resetWorkoutScreen();
  };

  const resetWorkoutScreen = () => {
    setWorkoutStatus('idle');
    const engine = ExerciseEngineRegistry.getEngine(selectedExercise);
    engine.reset();
    previousRepCountRef.current = 0;
    previousErrorIdRef.current = null;

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
        phase={currentPhase}
        kneeAngle={liveKneeAngle}
        elbowAngle={liveElbowAngle}
        hipAngle={liveHipAngle}
        elbowWidthRatio={liveElbowWidthRatio}
        feetSpanRatio={liveFeetSpanRatio}
        primaryAngle={livePrimaryAngle}
        jointCount={detectedJointCount}
        primaryFeedback={primaryFeedback}
        isGoodForm={isGoodForm}
        visibilityStatus={visibilityStatus}
        onToggleFacing={handleToggleFacing}
        onToggleMute={handleToggleMute}
        onSelectExercise={handleSelectExercise}
        onTogglePoseSkeleton={handleTogglePoseSkeleton}
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
