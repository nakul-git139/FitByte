import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutStatus } from '../types/workout';
import { Theme } from '../config/theme';

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
  // 1. Idle State: Smaller Circular Start Button (76px diameter)
  if (status === 'idle') {
    return (
      <View style={styles.idleContainer} pointerEvents="box-none">
        <View style={styles.startFabWrapper}>
          <TouchableOpacity
            style={styles.startFab}
            activeOpacity={0.85}
            onPress={onStartWorkout}
            accessibilityLabel="Start Workout"
          >
            <View style={styles.startFabInner}>
              <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </View>
          </TouchableOpacity>
          <Text style={styles.startFabLabel}>Start</Text>
        </View>
      </View>
    );
  }

  // 2. Active / Paused State: Circular Pause & Outlined Stop Buttons
  return (
    <View style={styles.activeContainer} pointerEvents="box-none">
      <View style={styles.activeControlsRow}>
        {/* Pause / Resume Action */}
        <View style={styles.controlItem}>
          <TouchableOpacity
            style={styles.pauseFab}
            activeOpacity={0.8}
            onPress={status === 'active' ? onPauseWorkout : onResumeWorkout}
            accessibilityLabel={status === 'active' ? 'Pause Workout' : 'Resume Workout'}
          >
            <Ionicons
              name={status === 'active' ? 'pause' : 'play'}
              size={24}
              color="#FFFFFF"
              style={status !== 'active' ? { marginLeft: 3 } : undefined}
            />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>{status === 'active' ? 'Pause' : 'Resume'}</Text>
        </View>

        {/* Stop Workout Action (Secondary / Less dominant) */}
        <View style={styles.controlItem}>
          <TouchableOpacity
            style={styles.stopFab}
            activeOpacity={0.8}
            onPress={onStopWorkout}
            accessibilityLabel="Stop Workout"
          >
            <View style={styles.stopSquareIcon} />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>Stop workout</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  idleContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  startFabWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  startFab: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: 'rgba(31, 107, 79, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(47, 138, 100, 0.6)',
  },
  startFabInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.elevated,
  },
  startFabLabel: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  activeContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  activeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  controlItem: {
    alignItems: 'center',
    gap: 6,
  },
  pauseFab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    ...Theme.shadows.card,
  },
  stopFab: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    ...Theme.shadows.card,
  },
  stopSquareIcon: {
    width: 18,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  controlLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
  },
});
