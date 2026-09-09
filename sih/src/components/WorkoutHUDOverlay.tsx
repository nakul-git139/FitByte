import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraFacing, WorkoutStatus, WorkoutStats } from '../types/workout';

interface WorkoutHUDOverlayProps {
  status: WorkoutStatus;
  stats: WorkoutStats;
  facing: CameraFacing;
  enableTorch: boolean;
  selectedExercise: string;
  showPoseSkeleton: boolean;
  kneeAngle?: number;
  elbowAngle?: number;
  jointCount?: number;
  onToggleFacing: () => void;
  onToggleTorch: () => void;
  onSelectExercise: () => void;
  onTogglePoseSkeleton: () => void;
}

export const WorkoutHUDOverlay: React.FC<WorkoutHUDOverlayProps> = ({
  status,
  stats,
  facing,
  enableTorch,
  selectedExercise,
  showPoseSkeleton,
  kneeAngle = 0,
  elbowAngle = 0,
  jointCount = 0,
  onToggleFacing,
  onToggleTorch,
  onSelectExercise,
  onTogglePoseSkeleton,
}) => {
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  };

  const isWorkoutActive = status === 'active' || status === 'paused';

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* Top Header Controls */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={[styles.glassIconButton, enableTorch && styles.activeIconButton]}
          onPress={onToggleTorch}
          activeOpacity={0.7}
        >
          <Ionicons
            name={enableTorch ? 'flash' : 'flash-outline'}
            size={22}
            color={enableTorch ? '#F59E0B' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Pose AI Skeleton Overlay Toggle Button */}
        <TouchableOpacity
          style={[styles.glassIconButton, showPoseSkeleton && styles.activePoseIconButton]}
          onPress={onTogglePoseSkeleton}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showPoseSkeleton ? 'body' : 'body-outline'}
            size={22}
            color={showPoseSkeleton ? '#10B981' : '#FFFFFF'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exerciseBadge}
          onPress={onSelectExercise}
          activeOpacity={0.8}
        >
          <Ionicons name="fitness-outline" size={16} color="#10B981" />
          <Text style={styles.exerciseBadgeText}>{selectedExercise}</Text>
          <Ionicons name="chevron-down" size={14} color="#94A3B8" />
        </TouchableOpacity>

        {/* Single Camera Flip Button (Front <-> Rear) */}
        <TouchableOpacity
          style={[
            styles.cameraToggleButton,
            facing === 'back' ? styles.backCameraActive : styles.frontCameraActive,
          ]}
          onPress={onToggleFacing}
          activeOpacity={0.7}
          accessibilityLabel="Switch Camera"
        >
          <Ionicons
            name="camera-reverse"
            size={18}
            color={facing === 'front' ? '#38BDF8' : '#C084FC'}
          />
          <Text
            style={[
              styles.cameraToggleText,
              { color: facing === 'front' ? '#38BDF8' : '#C084FC' },
            ]}
          >
            {facing === 'front' ? 'Front' : 'Rear'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Real-time Angles HUD Card */}
      {showPoseSkeleton && (
        <View style={styles.realtimeAngleCard}>
          <View style={styles.angleRow}>
            <Text style={styles.angleLabel}>KNEE FLEX:</Text>
            <Text
              style={[
                styles.angleValue,
                kneeAngle === 0
                  ? styles.inactiveAngleValue
                  : kneeAngle < 115
                  ? styles.activeAngleValue
                  : null,
              ]}
            >
              {kneeAngle > 0 ? `${kneeAngle}°` : '0° (No Joint)'}
            </Text>
          </View>

          <View style={styles.angleRow}>
            <Text style={styles.angleLabel}>ELBOW FLEX:</Text>
            <Text
              style={[
                styles.angleValue,
                elbowAngle === 0
                  ? styles.inactiveAngleValue
                  : elbowAngle < 100
                  ? styles.activeAngleValue
                  : null,
              ]}
            >
              {elbowAngle > 0 ? `${elbowAngle}°` : '0° (No Joint)'}
            </Text>
          </View>

          <View style={styles.angleRow}>
            <Text style={styles.angleLabel}>CAMERA:</Text>
            <Text
              style={[
                styles.cameraFacingValue,
                { color: facing === 'front' ? '#38BDF8' : '#C084FC' },
              ]}
            >
              {facing === 'front' ? 'Front (Selfie)' : 'Rear (Back)'}
            </Text>
          </View>

          <View style={styles.angleRow}>
            <Text style={styles.angleLabel}>DETECTED:</Text>
            <Text style={styles.jointCountValue}>
              {jointCount > 0 ? `${jointCount}/33 Visible` : 'No person'}
            </Text>
          </View>
        </View>
      )}

      {/* Live Status Indicator Bar */}
      {isWorkoutActive && (
        <View style={styles.liveIndicatorBar}>
          <View style={styles.recordingPulse}>
            <View style={[styles.pulseDot, status === 'paused' && styles.pausedPulseDot]} />
            <Text style={styles.liveText}>
              {status === 'active' ? 'LIVE TRACKING' : 'WORKOUT PAUSED'}
            </Text>
          </View>
          <Text style={styles.timerText}>{formatTime(stats.durationSeconds)}</Text>
        </View>
      )}

      {/* Center Framing Overlay (Viewport Guide) */}
      {!showPoseSkeleton && (
        <View style={styles.viewfinderFrame} pointerEvents="none">
          <View style={[styles.cornerMarker, styles.topLeftCorner]} />
          <View style={[styles.cornerMarker, styles.topRightCorner]} />
          <View style={[styles.cornerMarker, styles.bottomLeftCorner]} />
          <View style={[styles.cornerMarker, styles.bottomRightCorner]} />
        </View>
      )}

      {/* Active Workout Stats Grid Overlay (All Real CV Metrics) */}
      {isWorkoutActive && (
        <View style={styles.statsCardContainer}>
          <View style={styles.statCard}>
            <Ionicons name="repeat-outline" size={18} color="#38BDF8" />
            <Text style={styles.statValue}>{stats.repCount}</Text>
            <Text style={styles.statLabel}>VALID REPS</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
            <Text style={styles.statValue}>{stats.formAccuracyScore}%</Text>
            <Text style={styles.statLabel}>FORM ACCURACY</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCard}>
            <Ionicons name="flame-outline" size={18} color="#EF4444" />
            <Text style={styles.statValue}>{stats.caloriesBurned}</Text>
            <Text style={styles.statLabel}>EST. KCAL</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  glassIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  activeIconButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderColor: '#F59E0B',
  },
  activePoseIconButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: 6,
  },
  exerciseBadgeText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  realtimeAngleCard: {
    position: 'absolute',
    top: 110,
    left: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: 5,
    zIndex: 50,
  },
  angleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  angleLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  angleValue: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  inactiveAngleValue: {
    color: '#64748B',
    fontWeight: '600',
  },
  activeAngleValue: {
    color: '#F59E0B',
  },
  cameraFacingValue: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  jointCountValue: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
  },
  liveIndicatorBar: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '90%',
  },
  recordingPulse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  pausedPulseDot: {
    backgroundColor: '#F59E0B',
  },
  liveText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  timerText: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  viewfinderFrame: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    height: '42%',
    justifyContent: 'space-between',
  },
  cornerMarker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: 'rgba(16, 185, 129, 0.6)',
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  statsCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 12,
  },
  statCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  cameraToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    gap: 6,
  },
  frontCameraActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  backCameraActive: {
    borderColor: '#C084FC',
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
  },
  cameraToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
