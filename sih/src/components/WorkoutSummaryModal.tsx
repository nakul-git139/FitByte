import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSummary } from '../types/workout';

interface WorkoutSummaryModalProps {
  visible: boolean;
  summary: WorkoutSummary | null;
  onSave: () => void;
  onDismiss: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  visible,
  summary,
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

            {/* Computer Vision & Reps Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.gridItem}>
                <Ionicons name="repeat-outline" size={20} color="#38BDF8" />
                <Text style={styles.gridValue}>{summary.repCount}</Text>
                <Text style={styles.gridLabel}>Total Reps</Text>
                <Text style={styles.gridSubLabel}>
                  {goodReps} Good • {badReps} Bad
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

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.saveButton}
                activeOpacity={0.8}
                onPress={onSave}
              >
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Workout to History</Text>
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
