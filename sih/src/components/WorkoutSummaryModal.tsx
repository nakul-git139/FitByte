import React from 'react';
import { StyleSheet, Text, View, Modal, TouchableOpacity } from 'react-native';
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.trophyCircle}>
              <Ionicons name="trophy" size={36} color="#F59E0B" />
            </View>
            <Text style={styles.title}>Workout Summary</Text>
            <Text style={styles.subtitle}>{summary.workoutType}</Text>
          </View>

          {/* Genuine Computer Vision Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.gridItem}>
              <Ionicons name="repeat-outline" size={22} color="#38BDF8" />
              <Text style={styles.gridValue}>{summary.repCount}</Text>
              <Text style={styles.gridLabel}>Reps Counted</Text>
            </View>

            <View style={styles.gridItem}>
              <Ionicons name="checkmark-done-circle-outline" size={22} color="#10B981" />
              <Text style={styles.gridValue}>{summary.formAccuracyScore}%</Text>
              <Text style={styles.gridLabel}>Form Accuracy</Text>
            </View>

            <View style={styles.gridItem}>
              <Ionicons name="time-outline" size={22} color="#F59E0B" />
              <Text style={styles.gridValue}>{formatDuration(summary.durationSeconds)}</Text>
              <Text style={styles.gridLabel}>Active Time</Text>
            </View>

            <View style={styles.gridItem}>
              <Ionicons name="flame-outline" size={22} color="#EF4444" />
              <Text style={styles.gridValue}>{summary.caloriesBurned}</Text>
              <Text style={styles.gridLabel}>Est. Calories</Text>
            </View>
          </View>

          {/* Form Feedback Badge */}
          <View style={styles.feedbackBadge}>
            <Ionicons
              name={summary.formAccuracyScore >= 80 ? 'ribbon' : 'information-circle'}
              size={18}
              color={summary.formAccuracyScore >= 80 ? '#10B981' : '#F59E0B'}
            />
            <Text style={styles.feedbackText}>
              {summary.formAccuracyScore >= 80
                ? 'Excellent Form! Clean joint depth on most reps.'
                : summary.repCount > 0
                ? 'Good effort! Focus on achieving full range of motion.'
                : 'No full repetitions detected. Ensure full body is visible.'}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.saveButton}
              activeOpacity={0.8}
              onPress={onSave}
            >
              <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Workout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissButton}
              activeOpacity={0.8}
              onPress={onDismiss}
            >
              <Text style={styles.dismissButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  trophyCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
    gap: 10,
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  gridValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F8FAFC',
    marginTop: 6,
    marginBottom: 2,
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  feedbackBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 20,
    width: '100%',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  feedbackText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 10,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
