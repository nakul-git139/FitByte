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
          activeOpacity={0.8}
          onPress={onStartWorkout}
        >
          <View style={styles.startIconCircle}>
            <Ionicons name="play" size={28} color="#FFFFFF" style={{ marginLeft: 3 }} />
          </View>
          <Text style={styles.startButtonText}>START WORKOUT</Text>
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
            <Ionicons name="pause" size={22} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Pause</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.resumeButton]}
            activeOpacity={0.8}
            onPress={onResumeWorkout}
          >
            <Ionicons name="play" size={22} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Resume</Text>
          </TouchableOpacity>
        )}

        {/* Stop Workout Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.stopButton]}
          activeOpacity={0.8}
          onPress={onStopWorkout}
        >
          <Ionicons name="square" size={20} color="#FFFFFF" />
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
    marginBottom: 20,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  startIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  activeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 14,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 24,
    gap: 8,
    elevation: 6,
  },
  pauseButton: {
    flex: 1,
    backgroundColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resumeButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  stopButton: {
    flex: 1.5,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
