import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutStatus } from '../types/workout';

interface WorkoutControlsProps {
  status: WorkoutStatus;
  onStartWorkout: () => void;
  onPauseWorkout: () => void;
  onResumeWorkout: () => void;
  onStopWorkout: () => void;
}

export const WorkoutControls: React.FC<WorkoutControlsProps> = ({
  status,
  onStartWorkout,
  onPauseWorkout,
  onResumeWorkout,
  onStopWorkout,
}) => {
  if (status === 'idle') {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.startButton}
          activeOpacity={0.85}
          onPress={onStartWorkout}
        >
          <View style={styles.startIconCircle}>
            <Ionicons name="play" size={24} color="#FFFFFF" style={{ marginLeft: 2 }} />
          </View>
          <View style={styles.startTextWrapper}>
            <Text style={styles.startButtonText}>START WORKOUT</Text>
            <Text style={styles.startButtonSubtext}>Live AI Form Coach Ready</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.activeControlsRow}>
        {/* Pause / Resume Button */}
        {status === 'active' ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.pauseButton]}
            activeOpacity={0.8}
            onPress={onPauseWorkout}
          >
            <Ionicons name="pause" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Pause</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.resumeButton]}
            activeOpacity={0.8}
            onPress={onResumeWorkout}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Resume</Text>
          </TouchableOpacity>
        )}

        {/* Stop / End Workout Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.stopButton]}
          activeOpacity={0.8}
          onPress={onStopWorkout}
        >
          <Ionicons name="stop" size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>STOP WORKOUT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 26,
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    gap: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  startIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startTextWrapper: {
    alignItems: 'flex-start',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  startButtonSubtext: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  activeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 22,
    gap: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  pauseButton: {
    flex: 1,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  stopButton: {
    flex: 1.4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
