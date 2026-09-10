import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSummary } from '../types/workout';

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
    if (mins === 0) return `${secs} sec`;
    return `${mins}m ${secs}s`;
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.trophyCircle}>
                <Ionicons name="trophy" size={36} color="#F59E0B" />
              </View>
              <Text style={styles.title}>Workout Complete!</Text>
              <Text style={styles.subtitle}>{summary.workoutName || summary.workoutType}</Text>
            </View>

            {/* Routine Step Progress Banner */}
            {totalStepsCount !== undefined && totalStepsCount > 1 && (
              <View style={styles.routineProgressBanner}>
                <View style={styles.routineStepPill}>
                  <Ionicons name="sparkles" size={12} color="#10B981" />
                  <Text style={styles.routineStepText}>
                    ROUTINE STEP {currentStepIndex || 1} OF {totalStepsCount} COMPLETED
                  </Text>
                </View>
              </View>
            )}

            {/* Computer Vision & Reps Stats Grid */}
            {(() => {
              const isIsometric = (summary.workoutName || summary.workoutType || '').toLowerCase().includes('plank');
              return (
                <View style={styles.statsGrid}>
                  <View style={styles.gridItem}>
                    <Ionicons name={isIsometric ? "timer-outline" : "repeat-outline"} size={20} color="#38BDF8" />
                    <Text style={styles.gridValue}>{summary.repCount}{isIsometric ? 's' : ''}</Text>
                    <Text style={styles.gridLabel}>{isIsometric ? 'Hold Time' : 'Total Reps'}</Text>
                    <Text style={styles.gridSubLabel}>
                      {isIsometric
                        ? `${summary.perfectReps || summary.repCount}s Clean Form`
                        : `${goodReps} Good • ${badReps} Bad`}
                    </Text>
                  </View>

              <View style={styles.gridItem}>
                <Ionicons name="checkmark-done-circle-outline" size={20} color="#10B981" />
                <Text style={styles.gridValue}>{summary.formAccuracyScore}%</Text>
                <Text style={styles.gridLabel}>Form Score</Text>
                <Text style={styles.gridSubLabel}>
                  {summary.formAccuracyScore >= 80 ? 'Clean Depth' : 'Technique Focus'}
                </Text>
              </View>

              <View style={styles.gridItem}>
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
                <Text style={styles.gridValue}>{formatDuration(summary.activeSeconds || summary.durationSeconds)}</Text>
                <Text style={styles.gridLabel}>Active Time</Text>
                <Text style={styles.gridSubLabel}>Total: {formatDuration(summary.durationSeconds)}</Text>
              </View>

                <View style={styles.gridItem}>
                  <Ionicons name="flame-outline" size={20} color="#EF4444" />
                  <Text style={styles.gridValue}>{summary.caloriesBurned}</Text>
                  <Text style={styles.gridLabel}>Est. Calories</Text>
                  <Text style={styles.gridSubLabel}>METs Powered</Text>
                </View>
              </View>
            );
          })()}

            {/* Gemini AI Coach Post-Workout Analysis Card */}
            {summary.aiAnalysis && (
              <View style={styles.aiAnalysisCard}>
                <View style={styles.aiAnalysisHeader}>
                  <View style={styles.aiBadgePill}>
                    <Ionicons name="sparkles" size={12} color="#38BDF8" />
                    <Text style={styles.aiBadgeText}>GEMINI COACH ANALYSIS</Text>
                  </View>
                </View>

                {/* Summary Takeaway */}
                <Text style={styles.aiSummaryText}>
                  "{summary.aiAnalysis.summary}"
                </Text>

                {/* Strengths */}
                {summary.aiAnalysis.strengths && summary.aiAnalysis.strengths.length > 0 && (
                  <View style={styles.pointsSection}>
                    <Text style={styles.pointsHeaderGreen}>WHAT WENT WELL</Text>
                    {summary.aiAnalysis.strengths.map((point, idx) => (
                      <View key={`strength-${idx}`} style={styles.pointRow}>
                        <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                        <Text style={styles.pointText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Areas To Improve */}
                {summary.aiAnalysis.areasToImprove && summary.aiAnalysis.areasToImprove.length > 0 && (
                  <View style={styles.pointsSection}>
                    <Text style={styles.pointsHeaderAmber}>AREAS TO IMPROVE</Text>
                    {summary.aiAnalysis.areasToImprove.map((point, idx) => (
                      <View key={`improve-${idx}`} style={styles.pointRow}>
                        <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                        <Text style={styles.pointText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Next Workout Suggestion */}
                {summary.aiAnalysis.nextWorkoutSuggestion && (
                  <View style={styles.nextSessionBox}>
                    <Ionicons name="arrow-forward-circle" size={16} color="#38BDF8" />
                    <Text style={styles.nextSessionText}>
                      {summary.aiAnalysis.nextWorkoutSuggestion}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Next Recommended Workout in Routine Card */}
            {effectiveNext && onStartNext && (
              <View style={styles.nextExerciseCard}>
                <View style={styles.nextExerciseHeader}>
                  <View style={styles.nextExercisePill}>
                    <Ionicons name="sparkles" size={12} color="#10B981" />
                    <Text style={styles.nextExercisePillText}>UP NEXT IN TODAY'S PLAN</Text>
                  </View>
                </View>

                <View style={styles.nextExerciseDetailsRow}>
                  <View style={styles.nextExerciseIconWrap}>
                    <Ionicons
                      name={effectiveNext.name.toLowerCase().includes('plank') ? 'timer-outline' : 'barbell-outline'}
                      size={24}
                      color="#10B981"
                    />
                  </View>
                  <View style={styles.nextExerciseTextWrap}>
                    <Text style={styles.nextExerciseName}>{effectiveNext.name}</Text>
                    <Text style={styles.nextExerciseMeta}>
                      {effectiveNext.sets ? `${effectiveNext.sets} Sets × ` : ''}
                      {effectiveNext.name.toLowerCase().includes('plank')
                        ? `${effectiveNext.reps || 30}s Hold`
                        : `${effectiveNext.reps || 10} Reps`}
                      {effectiveNext.restSeconds ? ` • ${effectiveNext.restSeconds}s Rest` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              {onStartNext && effectiveNext && (
                <TouchableOpacity
                  style={styles.primaryNextButton}
                  activeOpacity={0.85}
                  onPress={onStartNext}
                >
                  <Ionicons name="play" size={20} color="#FFFFFF" />
                  <Text style={styles.primaryNextButtonText}>
                    Start Next: {effectiveNext.name} ({effectiveNext.name.toLowerCase().includes('plank') ? `${effectiveNext.reps || 30}s` : `${effectiveNext.reps || 10} Reps`})
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.saveOutlineButton}
                activeOpacity={0.8}
                onPress={onSave}
              >
                <Ionicons name="bookmark-outline" size={18} color="#10B981" />
                <Text style={styles.saveOutlineButtonText}>Save Workout to History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dismissButton}
                activeOpacity={0.8}
                onPress={onDismiss}
              >
                <Text style={styles.dismissButtonText}>Done</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '90%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  trophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 4,
    marginBottom: 1,
  },
  gridLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
  },
  gridSubLabel: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
  aiAnalysisCard: {
    width: '100%',
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 16,
  },
  aiAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aiBadgeText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  aiSummaryText: {
    color: '#F1F5F9',
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  pointsSection: {
    marginBottom: 10,
    gap: 6,
  },
  pointsHeaderGreen: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pointsHeaderAmber: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  pointText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  nextSessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  nextSessionText: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  routineProgressBanner: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 14,
  },
  routineStepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  routineStepText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  nextExerciseCard: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    marginBottom: 16,
  },
  nextExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  nextExercisePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  nextExercisePillText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  nextExerciseDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  nextExerciseIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  nextExerciseTextWrap: {
    flex: 1,
  },
  nextExerciseName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  nextExerciseMeta: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  startNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startNextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  completedRoutineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 16,
  },
  completedRoutineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B',
    marginBottom: 2,
  },
  completedRoutineSub: {
    fontSize: 11,
    color: '#CBD5E1',
    lineHeight: 15,
  },
  primaryNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryNextButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  saveOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    paddingVertical: 13,
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  saveOutlineButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
  dismissButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dismissButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
});
