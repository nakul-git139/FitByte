import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraFacing, WorkoutStatus, WorkoutStats } from '../types/workout';
import { ExercisePhase, FormError, VisibilityStatus } from '../engine/types';

interface WorkoutHUDOverlayProps {
  status: WorkoutStatus;
  stats: WorkoutStats;
  facing: CameraFacing;
  enableTorch: boolean;
  isMuted: boolean;
  selectedExercise: string;
  showPoseSkeleton: boolean;
  phase?: ExercisePhase;
  kneeAngle?: number;
  elbowAngle?: number;
  hipAngle?: number;
  elbowWidthRatio?: number;
  jointCount?: number;
  primaryFeedback?: FormError | null;
  isGoodForm?: boolean;
  visibilityStatus?: VisibilityStatus;
  onToggleFacing: () => void;
  onToggleTorch: () => void;
  onToggleMute: () => void;
  onSelectExercise: () => void;
  onTogglePoseSkeleton: () => void;
}

export const WorkoutHUDOverlay: React.FC<WorkoutHUDOverlayProps> = ({
  status,
  stats,
  facing,
  enableTorch,
  isMuted,
  selectedExercise,
  showPoseSkeleton,
  phase = 'IDLE',
  kneeAngle = 0,
  elbowAngle = 0,
  hipAngle = 0,
  elbowWidthRatio = 0,
  jointCount = 0,
  primaryFeedback = null,
  isGoodForm = true,
  visibilityStatus,
  onToggleFacing,
  onToggleTorch,
  onToggleMute,
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

  // Determine Form Banner state
  let bannerType: 'good' | 'warning' | 'info' = 'good';
  let bannerText = '🟢 FORM: EXCELLENT';
  let bannerIcon: 'checkmark-circle' | 'warning' | 'information-circle' = 'checkmark-circle';

  if (visibilityStatus && !visibilityStatus.isFullyVisible) {
    bannerType = 'info';
    bannerText = visibilityStatus.guidanceMessage || 'ℹ️ Move back so full body is visible';
    bannerIcon = 'information-circle';
  } else if (primaryFeedback) {
    bannerType = primaryFeedback.severity === 'info' ? 'info' : 'warning';
    bannerText = primaryFeedback.visualMessage;
    bannerIcon = primaryFeedback.severity === 'info' ? 'information-circle' : 'warning';
  } else if (!isGoodForm) {
    bannerType = 'warning';
    bannerText = '⚠️ Adjust Body Position';
    bannerIcon = 'warning';
  }

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* 1. Top Header Controls Bar */}
      <View style={styles.headerBar}>
        {/* Flash / Torch Toggle */}
        <TouchableOpacity
          style={[styles.glassIconButton, enableTorch && styles.activeIconButton]}
          onPress={onToggleTorch}
          activeOpacity={0.7}
        >
          <Ionicons
            name={enableTorch ? 'flash' : 'flash-outline'}
            size={20}
            color={enableTorch ? '#F59E0B' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Skeleton AI Overlay Toggle */}
        <TouchableOpacity
          style={[styles.glassIconButton, showPoseSkeleton && styles.activePoseIconButton]}
          onPress={onTogglePoseSkeleton}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showPoseSkeleton ? 'body' : 'body-outline'}
            size={20}
            color={showPoseSkeleton ? '#10B981' : '#FFFFFF'}
          />
        </TouchableOpacity>

        {/* Voice Feedback Mute/Unmute */}
        <TouchableOpacity
          style={[styles.glassIconButton, isMuted && styles.mutedIconButton]}
          onPress={onToggleMute}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isMuted ? 'volume-mute' : 'volume-high'}
            size={20}
            color={isMuted ? '#EF4444' : '#38BDF8'}
          />
        </TouchableOpacity>

        {/* Exercise Badge */}
        <TouchableOpacity
          style={styles.exerciseBadge}
          onPress={onSelectExercise}
          activeOpacity={0.8}
        >
          <Ionicons name="fitness" size={16} color="#10B981" />
          <Text style={styles.exerciseBadgeText}>{selectedExercise}</Text>
          <Ionicons name="chevron-down" size={14} color="#94A3B8" />
        </TouchableOpacity>

        {/* Camera Facing Flip (Front <-> Rear) */}
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

      {/* 2. REAL-TIME AI FORM COACH BANNER (Top Center HUD) */}
      <View style={styles.feedbackBannerContainer} pointerEvents="box-none">
        <View
          style={[
            styles.feedbackBanner,
            bannerType === 'warning' && styles.warningBanner,
            bannerType === 'info' && styles.infoBanner,
            bannerType === 'good' && styles.goodBanner,
          ]}
        >
          <Ionicons
            name={bannerIcon}
            size={20}
            color={
              bannerType === 'warning'
                ? '#EF4444'
                : bannerType === 'info'
                ? '#38BDF8'
                : '#10B981'
            }
          />
          <Text
            style={[
              styles.feedbackBannerText,
              bannerType === 'warning' && styles.warningBannerText,
              bannerType === 'info' && styles.infoBannerText,
              bannerType === 'good' && styles.goodBannerText,
            ]}
            numberOfLines={2}
          >
            {bannerText}
          </Text>
        </View>
      </View>

      {/* 3. Real-Time Biomechanics HUD Telemetry Card */}
      {showPoseSkeleton && (
        <View style={styles.realtimeAngleCard}>
          <View style={styles.angleRow}>
            <Text style={styles.angleLabel}>PHASE:</Text>
            <Text style={styles.phaseValue}>{phase}</Text>
          </View>

          {selectedExercise === 'Pushups' ? (
            <>
              <View style={styles.angleRow}>
                <Text style={styles.angleLabel}>ELBOW FLEX:</Text>
                <Text
                  style={[
                    styles.angleValue,
                    elbowAngle === 0
                      ? styles.inactiveAngleValue
                      : elbowAngle <= 90
                      ? styles.perfectAngleValue
                      : null,
                  ]}
                >
                  {elbowAngle > 0 ? `${elbowAngle}°` : '0°'}
                </Text>
              </View>

              {hipAngle > 0 && (
                <View style={styles.angleRow}>
                  <Text style={styles.angleLabel}>HIP ALIGN:</Text>
                  <Text
                    style={[
                      styles.angleValue,
                      hipAngle < 160 ? styles.warningAngleValue : styles.goodAngleValue,
                    ]}
                  >
                    {hipAngle}°
                  </Text>
                </View>
              )}

              {elbowWidthRatio > 0 && (
                <View style={styles.angleRow}>
                  <Text style={styles.angleLabel}>ELBOW RATIO:</Text>
                  <Text
                    style={[
                      styles.angleValue,
                      elbowWidthRatio > 1.38 ? styles.warningAngleValue : styles.goodAngleValue,
                    ]}
                  >
                    {elbowWidthRatio}x
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.angleRow}>
              <Text style={styles.angleLabel}>KNEE FLEX:</Text>
              <Text
                style={[
                  styles.angleValue,
                  kneeAngle === 0
                    ? styles.inactiveAngleValue
                    : kneeAngle <= 95
                    ? styles.perfectAngleValue
                    : null,
                ]}
              >
                {kneeAngle > 0 ? `${kneeAngle}°` : '0°'}
              </Text>
            </View>
          )}

          <View style={styles.angleRow}>
            <Text style={styles.angleLabel}>JOINTS:</Text>
            <Text style={styles.jointCountValue}>
              {jointCount > 0 ? `${jointCount}/33 Visible` : 'No person'}
            </Text>
          </View>
        </View>
      )}

      {/* 4. Live Recording & Timer Indicator */}
      {isWorkoutActive && (
        <View style={styles.liveIndicatorBar}>
          <View style={styles.recordingPulse}>
            <View style={[styles.pulseDot, status === 'paused' && styles.pausedPulseDot]} />
            <Text style={styles.liveText}>
              {status === 'active' ? 'AI COACH ACTIVE' : 'WORKOUT PAUSED'}
            </Text>
          </View>
          <Text style={styles.timerText}>{formatTime(stats.durationSeconds)}</Text>
        </View>
      )}

      {/* 5. Center Framing Guides (when skeleton is off) */}
      {!showPoseSkeleton && (
        <View style={styles.viewfinderFrame} pointerEvents="none">
          <View style={[styles.cornerMarker, styles.topLeftCorner]} />
          <View style={[styles.cornerMarker, styles.topRightCorner]} />
          <View style={[styles.cornerMarker, styles.bottomLeftCorner]} />
          <View style={[styles.cornerMarker, styles.bottomRightCorner]} />
        </View>
      )}

      {/* 6. Big Active Workout Stats Bottom Card */}
      {isWorkoutActive && (
        <View style={styles.statsCardContainer}>
          <View style={styles.statCard}>
            <Ionicons name="repeat" size={20} color="#38BDF8" />
            <Text style={styles.statValue}>{stats.repCount}</Text>
            <Text style={styles.statLabel}>VALID REPS</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCard}>
            <Ionicons name="sparkles" size={20} color="#10B981" />
            <Text style={styles.statValue}>{stats.perfectReps}</Text>
            <Text style={styles.statLabel}>PERFECT REPS</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCard}>
            <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
            <Text style={styles.statValue}>{stats.formAccuracyScore}%</Text>
            <Text style={styles.statLabel}>FORM SCORE</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCard}>
            <Ionicons name="flame" size={20} color="#EF4444" />
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
    paddingHorizontal: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
    gap: 6,
  },
  glassIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
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
  mutedIconButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderColor: '#EF4444',
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    gap: 6,
  },
  exerciseBadgeText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  cameraToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    gap: 4,
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
    fontSize: 12,
    fontWeight: '700',
  },
  feedbackBannerContainer: {
    position: 'absolute',
    top: 108,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 30,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: '96%',
  },
  goodBanner: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.6)',
  },
  warningBanner: {
    backgroundColor: 'rgba(45, 14, 14, 0.95)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  infoBanner: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  feedbackBannerText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  goodBannerText: {
    color: '#10B981',
  },
  warningBannerText: {
    color: '#F87171',
  },
  infoBannerText: {
    color: '#38BDF8',
  },
  realtimeAngleCard: {
    position: 'absolute',
    top: 166,
    left: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    gap: 4,
    zIndex: 25,
  },
  angleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  angleLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  phaseValue: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
  angleValue: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  goodAngleValue: {
    color: '#10B981',
  },
  warningAngleValue: {
    color: '#EF4444',
  },
  perfectAngleValue: {
    color: '#10B981',
  },
  inactiveAngleValue: {
    color: '#64748B',
  },
  jointCountValue: {
    color: '#CBD5E1',
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
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '92%',
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
    backgroundColor: '#10B981',
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
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: 8,
  },
  statCard: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 55,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
