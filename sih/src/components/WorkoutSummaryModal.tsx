import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSummary } from '../types/workout';
import { Theme } from '../config/theme';

interface NextExerciseInfo {
  name: string;
  sets?: number;
  reps?: number;
  restSeconds?: number;
}

interface WorkoutSummaryModalProps {
  visible: boolean;
  summary: WorkoutSummary | null;
  nextExercise?: NextExerciseInfo | null;
  currentStepIndex?: number;
  totalStepsCount?: number;
  onStartNext?: () => void;
  onSave: () => void;
  onDismiss: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  visible,
  summary,
  nextExercise,
  currentStepIndex,
  totalStepsCount,
  onStartNext,
  onSave,
  onDismiss,
}) => {
  if (!summary) return null;

  const formatDuration = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const padSecs = secs < 10 ? `0${secs}` : `${secs}`;
    const padMins = mins < 10 ? `0${mins}` : `${mins}`;
    return `${padMins}:${padSecs}`;
  };

  const goodReps = summary.goodReps ?? summary.perfectReps;
  const badReps = summary.badReps ?? Math.max(0, summary.repCount - summary.perfectReps);

  // Fallback next exercise resolution to guarantee Next is always available
  const fallbackNext = (() => {
    const norm = (summary.workoutType || summary.workoutName || '').toLowerCase().replace(/[^a-z]/g, '');
    if (norm.includes('bicep') || norm.includes('curl')) return { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 };
    if (norm.includes('squat')) return { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 };
    if (norm.includes('pushup')) return { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 };
    if (norm.includes('plank')) return { name: 'Lunges', sets: 3, reps: 10, restSeconds: 45 };
    if (norm.includes('lunge')) return { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 };
    if (norm.includes('jumping') || norm.includes('jack')) return { name: 'Mountain Climbers', sets: 3, reps: 20, restSeconds: 30 };
    if (norm.includes('mountain') || norm.includes('climber')) return { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 };
    if (norm.includes('pullup')) return { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 };
    return { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 };
  })();

  const effectiveNext = nextExercise || fallbackNext;
  const isIsometric = (summary.workoutName || summary.workoutType || '').toLowerCase().includes('plank');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header with Green Checkmark Badge */}
            <View style={styles.header}>
              <View style={styles.checkmarkCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Nice work!</Text>
              <Text style={styles.subtitle}>{summary.workoutName || summary.workoutType} complete</Text>
            </View>

            {/* Routine Step Progress Banner */}
            {totalStepsCount !== undefined && totalStepsCount > 1 && (
              <View style={styles.routineStepPill}>
                <Ionicons name="sparkles" size={12} color={Theme.colors.primaryGreen} />
                <Text style={styles.routineStepText}>
                  ROUTINE STEP {currentStepIndex || 1} OF {totalStepsCount} COMPLETED
                </Text>
              </View>
            )}

            {/* Stats 2x2 Grid */}
            <View style={styles.statsGrid}>
              {/* Reps */}
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {summary.repCount}{isIsometric ? 's' : ''}
                </Text>
                <Text style={styles.statLabel}>
                  {isIsometric ? 'HOLD TIME' : 'REPS'}
                </Text>
              </View>

              {/* Form Score */}
              <View style={styles.statBox}>
                <Text style={[styles.statValue, { color: Theme.colors.primaryGreen }]}>
                  {summary.formAccuracyScore}%
                </Text>
                <Text style={styles.statLabel}>FORM ACCURACY</Text>
              </View>

              {/* Calories */}
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{summary.caloriesBurned}</Text>
                <Text style={styles.statLabel}>CALORIES</Text>
              </View>

              {/* Duration */}
              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  {formatDuration(summary.activeSeconds || summary.durationSeconds)}
                </Text>
                <Text style={styles.statLabel}>DURATION</Text>
              </View>
            </View>

            {/* Coach Insight Callout Box */}
            <View style={styles.coachCard}>
              <Ionicons name="information-circle" size={18} color={Theme.colors.primaryGreen} style={{ marginTop: 2 }} />
              <Text style={styles.coachText}>
                {summary.aiAnalysis?.summary ||
                  'Your form stayed strong and controlled through most of the workout.'}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsCol}>
              {/* 1. Primary "Start Next Exercise" CTA Button */}
              {effectiveNext && onStartNext && (
                <TouchableOpacity
                  style={styles.startNextButton}
                  onPress={onStartNext}
                  activeOpacity={0.85}
                >
                  <Text style={styles.startNextButtonText}>
                    ▶ Start Next: {effectiveNext.name} ({effectiveNext.name.toLowerCase().includes('plank') ? `${effectiveNext.reps || 30}s` : `${effectiveNext.reps || 10} Reps`}) ➡️
                  </Text>
                </TouchableOpacity>
              )}

              {/* 2. Save Workout */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={onSave}
                activeOpacity={0.8}
              >
                <Ionicons name="bookmark-outline" size={18} color={Theme.colors.textPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.saveButtonText}>Save Workout</Text>
              </TouchableOpacity>

              {/* 3. Work Out Again / Done */}
              <TouchableOpacity
                style={styles.againButton}
                onPress={onDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.againButtonText}>Work Out Again</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 26, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    ...Theme.shadows.elevated,
  },
  scrollContent: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  checkmarkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Theme.shadows.elevated,
  },
  title: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  routineStepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.lg,
  },
  routineStepText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
    letterSpacing: 0.5,
  },
  statsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Theme.colors.surfaceSecondary,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  statValue: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  coachCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Theme.colors.lightGreen,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.xl,
  },
  coachText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.primaryGreenDark,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  actionButtonsCol: {
    width: '100%',
    gap: Theme.spacing.sm,
  },
  startNextButton: {
    backgroundColor: Theme.colors.primaryGreen,
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.elevated,
  },
  startNextButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm + 1,
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceSecondary,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  saveButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  againButton: {
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  againButtonText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
});
