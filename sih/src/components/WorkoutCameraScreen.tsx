import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { CameraFacing, WorkoutStatus, WorkoutStats, WorkoutSummary } from '../types/workout';
import { PoseLandmark } from '../types/pose';
import { PermissionScreen } from './PermissionScreen';
import { WorkoutHUDOverlay } from './WorkoutHUDOverlay';
import { WorkoutControls } from './WorkoutControls';
import { WorkoutSummaryModal } from './WorkoutSummaryModal';
import { MediaPipePoseTracker } from './MediaPipePoseTracker';

const EXERCISE_OPTIONS = ['Squats', 'Pushups', 'Jumping Jacks', 'Full Body Workout', 'Plank'];

export const WorkoutCameraScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraFacing>('front');
  const [enableTorch, setEnableTorch] = useState<boolean>(false);
  const [showPoseSkeleton, setShowPoseSkeleton] = useState<boolean>(true);

  const [workoutStatus, setWorkoutStatus] = useState<WorkoutStatus>('idle');
  const [selectedExercise, setSelectedExercise] = useState<string>('Squats');
  const [showExercisePicker, setShowExercisePicker] = useState<boolean>(false);

  // Live real-time computer vision metrics from MediaPipe
  const [liveKneeAngle, setLiveKneeAngle] = useState<number>(0);
  const [liveElbowAngle, setLiveElbowAngle] = useState<number>(0);
  const [detectedJointCount, setDetectedJointCount] = useState<number>(0);

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
  const repStateRef = useRef<'UP' | 'DOWN'>('UP');
  const lowestAngleInCurrentRepRef = useRef<number>(180);

  // Active workout duration timer
  useEffect(() => {
    if (workoutStatus === 'active') {
      timerRef.current = setInterval(() => {
        setStats((prevStats) => {
          const nextDuration = prevStats.durationSeconds + 1;
          const nextActive = prevStats.activeSeconds + 1;

          // Scientifically grounded METs calorie calculation
          // (Rep work + base active movement metabolic equivalent)
          const repKcal = prevStats.repCount * (selectedExercise === 'Pushups' ? 0.48 : 0.40);
          const activeKcal = (nextActive / 60) * 4.0;
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

  // Handle Real-Time Computer Vision Data from MediaPipe AI
  const handlePoseData = (data: {
    jointCount: number;
    kneeAngle: number;
    elbowAngle: number;
    landmarks: PoseLandmark[];
  }) => {
    setDetectedJointCount(data.jointCount);
    setLiveKneeAngle(data.kneeAngle);
    setLiveElbowAngle(data.elbowAngle);

    // Only track reps when workout is active and real joints are detected
    if (workoutStatus === 'active') {
      if (selectedExercise === 'Squats' && data.kneeAngle > 0) {
        // Track lowest angle during this rep to rate depth/form
        if (repStateRef.current === 'DOWN') {
          if (data.kneeAngle < lowestAngleInCurrentRepRef.current) {
            lowestAngleInCurrentRepRef.current = data.kneeAngle;
          }
        }

        // 1. Squat descent into inflection zone (< 115 degrees)
        if (data.kneeAngle < 115 && repStateRef.current === 'UP') {
          repStateRef.current = 'DOWN';
          lowestAngleInCurrentRepRef.current = data.kneeAngle;
          triggerHaptic('light');
        }

        // 2. Return to standing extension (> 155 degrees) completes the rep!
        if (data.kneeAngle > 155 && repStateRef.current === 'DOWN') {
          repStateRef.current = 'UP';
          const isDeepRep = lowestAngleInCurrentRepRef.current <= 100;
          triggerHaptic('medium');

          setStats((prev) => {
            const nextReps = prev.repCount + 1;
            const nextPerfect = isDeepRep ? prev.perfectReps + 1 : prev.perfectReps;
            const accuracy = Math.round((nextPerfect / nextReps) * 100);
            const repKcal = nextReps * 0.40;
            const activeKcal = (prev.activeSeconds / 60) * 4.0;

            return {
              ...prev,
              repCount: nextReps,
              perfectReps: nextPerfect,
              formAccuracyScore: accuracy,
              caloriesBurned: Math.round(repKcal + activeKcal),
            };
          });
        }
      } else if (selectedExercise === 'Pushups' && data.elbowAngle > 0) {
        if (repStateRef.current === 'DOWN') {
          if (data.elbowAngle < lowestAngleInCurrentRepRef.current) {
            lowestAngleInCurrentRepRef.current = data.elbowAngle;
          }
        }

        // Pushup bottom descent (< 95 degrees)
        if (data.elbowAngle < 95 && repStateRef.current === 'UP') {
          repStateRef.current = 'DOWN';
          lowestAngleInCurrentRepRef.current = data.elbowAngle;
          triggerHaptic('light');
        }

        // Pushup top arm lockout (> 150 degrees)
        if (data.elbowAngle > 150 && repStateRef.current === 'DOWN') {
          repStateRef.current = 'UP';
          const isDeepPushup = lowestAngleInCurrentRepRef.current <= 85;
          triggerHaptic('medium');

          setStats((prev) => {
            const nextReps = prev.repCount + 1;
            const nextPerfect = isDeepPushup ? prev.perfectReps + 1 : prev.perfectReps;
            const accuracy = Math.round((nextPerfect / nextReps) * 100);
            const repKcal = nextReps * 0.48;
            const activeKcal = (prev.activeSeconds / 60) * 4.0;

            return {
              ...prev,
              repCount: nextReps,
              perfectReps: nextPerfect,
              formAccuracyScore: accuracy,
              caloriesBurned: Math.round(repKcal + activeKcal),
            };
          });
        }
      }
    }
  };

  // Camera Facing Toggle (Front / Selfie <-> Back / Rear)
  const handleToggleFacing = () => {
    triggerHaptic('light');
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  // Torch Toggle
  const handleToggleTorch = () => {
    triggerHaptic('light');
    setEnableTorch((prev) => !prev);
  };

  // Pose Skeleton Toggle
  const handleTogglePoseSkeleton = () => {
    triggerHaptic('light');
    setShowPoseSkeleton((prev) => !prev);
  };

  // Workout Controls Logic
  const handleStartWorkout = () => {
    triggerHaptic('notification');
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
    repStateRef.current = 'UP';
    lowestAngleInCurrentRepRef.current = 180;
    setWorkoutStatus('active');
  };

  const handlePauseWorkout = () => {
    triggerHaptic('medium');
    setWorkoutStatus('paused');
  };

  const handleResumeWorkout = () => {
    triggerHaptic('medium');
    setWorkoutStatus('active');
  };

  const handleStopWorkout = () => {
    triggerHaptic('heavy');
    const now = new Date();
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
    repStateRef.current = 'UP';
    lowestAngleInCurrentRepRef.current = 180;
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
          onPoseData={handlePoseData}
          onFacingChange={(newFacing) => setFacing(newFacing)}
        />
      ) : (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={enableTorch}
        />
      )}

      {/* Head-Up Display (HUD) */}
      <WorkoutHUDOverlay
        status={workoutStatus}
        stats={stats}
        facing={facing}
        enableTorch={enableTorch}
        selectedExercise={selectedExercise}
        showPoseSkeleton={showPoseSkeleton}
        kneeAngle={liveKneeAngle}
        elbowAngle={liveElbowAngle}
        jointCount={detectedJointCount}
        onToggleFacing={handleToggleFacing}
        onToggleTorch={handleToggleTorch}
        onSelectExercise={handleSelectExercise}
        onTogglePoseSkeleton={handleTogglePoseSkeleton}
      />

      {/* Workout Action Buttons (Start / Stop Workout) */}
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
              <Text style={styles.sheetTitle}>Select Exercise</Text>
              <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
                <Ionicons name="close-circle" size={26} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {EXERCISE_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.exerciseOption,
                  selectedExercise === item && styles.selectedExerciseOption,
                ]}
                onPress={() => {
                  setSelectedExercise(item);
                  setShowExercisePicker(false);
                }}
              >
                <Text
                  style={[
                    styles.exerciseOptionText,
                    selectedExercise === item && styles.selectedExerciseOptionText,
                  ]}
                >
                  {item}
                </Text>
                {selectedExercise === item && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
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
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
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
    padding: 24,
    gap: 10,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  exerciseOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedExerciseOption: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
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
