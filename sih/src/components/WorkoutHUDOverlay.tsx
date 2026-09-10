import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraFacing, WorkoutStatus, WorkoutStats } from '../types/workout';
import { ExercisePhase, FormError, VisibilityStatus } from '../engine/types';

interface WorkoutHUDOverlayProps {
  status: WorkoutStatus;
  stats: WorkoutStats;
  facing: CameraFacing;
  isMuted: boolean;
  selectedExercise: string;
  showPoseSkeleton: boolean;
  targetReps?: number;
  phase?: ExercisePhase;
  kneeAngle?: number;
  elbowAngle?: number;
  hipAngle?: number;
  elbowWidthRatio?: number;
  feetSpanRatio?: number;
  primaryAngle?: number;
  jointCount?: number;
  primaryFeedback?: FormError | null;
  geminiCoachingTip?: {
    text: string;
    assessment: 'good' | 'needs_improvement';
    confidence: number;
  } | null;
  isGoodForm?: boolean;
  visibilityStatus?: VisibilityStatus;
  onToggleFacing: () => void;
  onToggleMute: () => void;
  onSelectExercise: () => void;
  onTogglePoseSkeleton: () => void;
  onExit?: () => void;
}

export const WorkoutHUDOverlay: React.FC<WorkoutHUDOverlayProps> = ({
  status,
  stats,
  facing,
  isMuted,
  selectedExercise,
  showPoseSkeleton,
  targetReps,
  phase = 'IDLE',
  kneeAngle = 0,
  elbowAngle = 0,
  hipAngle = 0,
  elbowWidthRatio = 0,
  feetSpanRatio = 0,
  primaryAngle = 0,
  jointCount = 0,
  primaryFeedback = null,
  geminiCoachingTip = null,
  isGoodForm = true,
  visibilityStatus,
  onToggleFacing,
  onToggleMute,
  onSelectExercise,
  onTogglePoseSkeleton,
  onExit,
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
    bannerText = visibilityStatus.guidanceMessage || 'Move back so your full body is visible.';
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

  // Phase badge color
  const getPhaseBadgeStyle = (currentPhase: ExercisePhase) => {
    switch (currentPhase) {
      case 'BOTTOM':
        return styles.phaseBottom;
      case 'DESCENDING':
      case 'ASCENDING':
        return styles.phaseMoving;
      case 'START':
      case 'COMPLETED':
        return styles.phaseReady;
      default:
        return styles.phaseIdle;
    }
  };

  return (
    <View style={styles.overlayContainer} pointerEvents="box-none">
      {/* 1. TOP HEADER NAVIGATION BAR */}
      <View style={styles.headerBar}>
        {/* Left: Back (if onExit provided) & Exercise Selector Pill */}
        <View style={styles.headerLeftGroup}>
          {onExit && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onExit}
              activeOpacity={0.7}
              accessibilityLabel="Back to Workout Summary"
            >
              <Ionicons name="arrow-back" size={18} color="#CBD5E1" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.exerciseBadge}
            onPress={onSelectExercise}
            activeOpacity={0.8}
          >
            <Ionicons
              name={selectedExercise === 'Pushups' ? 'barbell' : 'body'}
              size={18}
              color="#10B981"
            />
            <Text style={styles.exerciseBadgeText}>{selectedExercise}</Text>
            <Ionicons name="chevron-down" size={14} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Right: Quick Action Controls Cluster */}
        <View style={styles.quickActionsGroup}>
          {/* Skeleton AI Overlay Toggle */}
          <TouchableOpacity
            style={[
              styles.actionIconButton,
              showPoseSkeleton && styles.actionIconButtonActiveGreen,
            ]}
            onPress={onTogglePoseSkeleton}
            activeOpacity={0.7}
            accessibilityLabel="Toggle Skeleton"
          >
            <Ionicons
              name={showPoseSkeleton ? 'body' : 'body-outline'}
              size={18}
              color={showPoseSkeleton ? '#10B981' : '#CBD5E1'}
            />
          </TouchableOpacity>

          {/* Voice Coach Mute / Unmute */}
          <TouchableOpacity
            style={[
              styles.actionIconButton,
              isMuted && styles.actionIconButtonMuted,
            ]}
            onPress={onToggleMute}
            activeOpacity={0.7}
            accessibilityLabel="Toggle Audio Feedback"
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={18}
              color={isMuted ? '#EF4444' : '#38BDF8'}
            />
          </TouchableOpacity>

          {/* Camera Flip (Front <-> Rear) */}
          <TouchableOpacity
            style={[
              styles.actionIconButton,
              facing === 'back' ? styles.actionIconButtonBackCam : styles.actionIconButtonFrontCam,
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
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. REAL-TIME AI FORM COACH BANNER (Top Floating Pill) */}
      <View style={styles.feedbackBannerWrapper} pointerEvents="box-none">
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
            size={18}
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

      {/* 2b. GEMINI VISION AI COACH INSIGHT PILL (Asynchronous Keyframe Feedback) */}
      {geminiCoachingTip && geminiCoachingTip.text && (
        <View style={styles.geminiVisionPillWrapper} pointerEvents="box-none">
          <View
            style={[
              styles.geminiVisionPill,
              geminiCoachingTip.assessment === 'needs_improvement'
                ? styles.geminiVisionWarning
                : styles.geminiVisionGood,
            ]}
          >
            <View style={styles.geminiBadge}>
              <Ionicons name="sparkles" size={11} color="#38BDF8" />
              <Text style={styles.geminiBadgeText}>GEMINI VISION</Text>
            </View>
            <Text style={styles.geminiVisionText} numberOfLines={2}>
              {geminiCoachingTip.text}
            </Text>
          </View>
        </View>
      )}

      {/* 3. HERO REP COUNTER & TELEMETRY ROW */}
      <View style={styles.heroTelemetryRow} pointerEvents="box-none">
        {/* Left Card: Live Biomechanics & Angles */}
        {showPoseSkeleton ? (
          <View style={styles.telemetryCard}>
            <View style={styles.telemetryHeaderRow}>
              <Text style={styles.telemetryHeaderTitle}>AI TRACKING</Text>
              <View style={[styles.phasePill, getPhaseBadgeStyle(phase)]}>
                <Text style={styles.phasePillText}>{phase}</Text>
              </View>
            </View>

            {/* Exercise-Specific Dynamic Telemetry Breakdown */}
            {selectedExercise === 'Pushups' && (
              <>
                <View style={styles.telemetryMetricRow}>
                  <Text style={styles.metricLabel}>ELBOW FLEX</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      elbowAngle > 0 && elbowAngle <= 90
                        ? styles.metricValuePerfect
                        : elbowAngle > 0
                        ? styles.metricValueActive
                        : styles.metricValueInactive,
                    ]}
                  >
                    {elbowAngle > 0 ? `${elbowAngle}°` : '--'}
                  </Text>
                </View>

                {hipAngle > 0 && (
                  <View style={styles.telemetryMetricRow}>
                    <Text style={styles.metricLabel}>HIP ANGLE</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        hipAngle < 160 ? styles.metricValueWarning : styles.metricValueGood,
                      ]}
                    >
                      {hipAngle}°
                    </Text>
                  </View>
                )}

                {elbowWidthRatio > 0 && (
                  <View style={styles.telemetryMetricRow}>
                    <Text style={styles.metricLabel}>ELBOW RATIO</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        elbowWidthRatio > 1.38 ? styles.metricValueWarning : styles.metricValueGood,
                      ]}
                    >
                      {elbowWidthRatio}x
                    </Text>
                  </View>
                )}
              </>
            )}

            {selectedExercise === 'Squats' && (
              <>
                <View style={styles.telemetryMetricRow}>
                  <Text style={styles.metricLabel}>KNEE FLEX</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      kneeAngle > 0 && kneeAngle <= 95
                        ? styles.metricValuePerfect
                        : kneeAngle > 0
                        ? styles.metricValueActive
                        : styles.metricValueInactive,
                    ]}
                  >
                    {kneeAngle > 0 ? `${kneeAngle}°` : '--'}
                  </Text>
                </View>
                {hipAngle > 0 && (
                  <View style={styles.telemetryMetricRow}>
                    <Text style={styles.metricLabel}>HIP ANGLE</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        hipAngle < 80 ? styles.metricValueWarning : styles.metricValueGood,
                      ]}
                    >
                      {hipAngle}°
                    </Text>
                  </View>
                )}
              </>
            )}

            {selectedExercise === 'Pullups' && (
              <View style={styles.telemetryMetricRow}>
                <Text style={styles.metricLabel}>ARM FLEX</Text>
                <Text
                  style={[
                    styles.metricValue,
                    elbowAngle > 0 && elbowAngle <= 80
                      ? styles.metricValuePerfect
                      : elbowAngle > 0
                      ? styles.metricValueActive
                      : styles.metricValueInactive,
                  ]}
                >
                  {elbowAngle > 0 ? `${elbowAngle}°` : '--'}
                </Text>
              </View>
            )}

            {selectedExercise === 'Plank' && (
              <>
                <View style={styles.telemetryMetricRow}>
                  <Text style={styles.metricLabel}>HOLD TIME</Text>
                  <Text style={[styles.metricValue, styles.metricValueGood]}>
                    {stats.repCount}s
                  </Text>
                </View>
                {hipAngle > 0 && (
                  <View style={styles.telemetryMetricRow}>
                    <Text style={styles.metricLabel}>HIP ANGLE</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        hipAngle < 155 || hipAngle > 195 ? styles.metricValueWarning : styles.metricValueGood,
                      ]}
                    >
                      {hipAngle}°
                    </Text>
                  </View>
                )}
              </>
            )}

            {selectedExercise === 'Bicep Curls' && (
              <View style={styles.telemetryMetricRow}>
                <Text style={styles.metricLabel}>CURL ANGLE</Text>
                <Text
                  style={[
                    styles.metricValue,
                    elbowAngle > 0 && elbowAngle <= 65
                      ? styles.metricValuePerfect
                      : elbowAngle > 0
                      ? styles.metricValueActive
                      : styles.metricValueInactive,
                  ]}
                >
                  {elbowAngle > 0 ? `${elbowAngle}°` : '--'}
                </Text>
              </View>
            )}

            {selectedExercise === 'Jumping Jacks' && (
              <>
                <View style={styles.telemetryMetricRow}>
                  <Text style={styles.metricLabel}>ARM SPAN</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      primaryAngle > 0 ? styles.metricValueActive : styles.metricValueInactive,
                    ]}
                  >
                    {primaryAngle > 0 ? `${primaryAngle}°` : '--'}
                  </Text>
                </View>
                {feetSpanRatio > 0 && (
                  <View style={styles.telemetryMetricRow}>
                    <Text style={styles.metricLabel}>FEET RATIO</Text>
                    <Text style={[styles.metricValue, styles.metricValueGood]}>
                      {feetSpanRatio}x
                    </Text>
                  </View>
                )}
              </>
            )}

            {selectedExercise === 'Mountain Climbers' && (
              <>
                <View style={styles.telemetryMetricRow}>
                  <Text style={styles.metricLabel}>KNEE DRIVE</Text>
                  <Text
                    style={[
                      styles.metricValue,
                      primaryAngle > 0 && primaryAngle <= 80
                        ? styles.metricValuePerfect
                        : primaryAngle > 0
                        ? styles.metricValueActive
                        : styles.metricValueInactive,
                    ]}
                  >
                    {primaryAngle > 0 ? `${primaryAngle}°` : '--'}
                  </Text>
                </View>
                {hipAngle > 0 && (
                  <View style={styles.telemetryMetricRow}>
                    <Text style={styles.metricLabel}>HIP ANGLE</Text>
                    <Text
                      style={[
                        styles.metricValue,
                        hipAngle < 150 ? styles.metricValueWarning : styles.metricValueGood,
                      ]}
                    >
                      {hipAngle}°
                    </Text>
                  </View>
                )}
              </>
            )}

            {selectedExercise === 'Lunges' && (
              <View style={styles.telemetryMetricRow}>
                <Text style={styles.metricLabel}>FRONT KNEE</Text>
                <Text
                  style={[
                    styles.metricValue,
                    primaryAngle > 0 && primaryAngle <= 100
                      ? styles.metricValuePerfect
                      : primaryAngle > 0
                      ? styles.metricValueActive
                      : styles.metricValueInactive,
                  ]}
                >
                  {primaryAngle > 0 ? `${primaryAngle}°` : (kneeAngle > 0 ? `${kneeAngle}°` : '--')}
                </Text>
              </View>
            )}

            <View style={styles.telemetryMetricRow}>
              <Text style={styles.metricLabel}>JOINTS</Text>
              <Text style={styles.jointCountText}>
                {jointCount > 0 ? `${jointCount}/33` : 'No person'}
              </Text>
            </View>
          </View>
        ) : (
          <View />
        )}

        {/* Right Card: HERO REP COUNTER WIDGET (Prominently visible) */}
        {(() => {
          const goodReps = stats.perfectReps ?? stats.goodReps ?? 0;
          const badReps = stats.badReps ?? Math.max(0, stats.repCount - goodReps);
          const isIsometric = (selectedExercise || '').toLowerCase().includes('plank');
          const target = targetReps || stats.targetReps || (isIsometric ? 30 : 10);
          const formScore = stats.formAccuracyScore ?? 100;

          return (
            <View style={styles.heroRepWidget}>
              <Text style={styles.heroRepLabel}>
                {isIsometric ? 'HOLD TIME' : 'REPS'}
              </Text>
              
              <View style={styles.heroRepNumberRow}>
                <Text style={styles.heroRepNumber}>
                  {stats.repCount}{isIsometric ? 's' : ''}
                </Text>
                <Text style={styles.heroRepTargetDivider}>/</Text>
                <Text style={styles.heroRepTargetNumber}>
                  {target}{isIsometric ? 's' : ''}
                </Text>
              </View>

              {/* Good & Bad Rep Breakdown Badges */}
              <View style={styles.heroRepStatsRow}>
                <View style={styles.goodRepPill}>
                  <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                  <Text style={styles.goodRepText}>
                    {isIsometric ? `Clean: ${goodReps}s` : `Good: ${goodReps}`}
                  </Text>
                </View>
                {!isIsometric && (
                  <View style={styles.badRepPill}>
                    <Ionicons name="close-circle" size={11} color="#EF4444" />
                    <Text style={styles.badRepText}>Bad: {badReps}</Text>
                  </View>
                )}
              </View>

              {/* Form Score Badge */}
              <View style={styles.heroRepScoreBadge}>
                <Ionicons name="sparkles" size={11} color="#38BDF8" />
                <Text style={styles.heroRepScoreText}>Form Score: {formScore}%</Text>
              </View>
            </View>
          );
        })()}
      </View>

      {/* 4. LIVE ACTIVITY & TIMER PILL (Center Floating) */}
      {isWorkoutActive && (
        <View style={styles.liveTimerPill}>
          <View style={styles.timerPulseGroup}>
            <View style={[styles.pulseDot, status === 'paused' && styles.pausedPulseDot]} />
            <Text style={styles.timerDurationText}>{formatTime(stats.durationSeconds)}</Text>
          </View>
          <View style={styles.timerDivider} />
          <View style={styles.caloriesGroup}>
            <Ionicons name="flame" size={14} color="#EF4444" />
            <Text style={styles.caloriesText}>{stats.caloriesBurned} kcal</Text>
          </View>
          <View style={styles.timerDivider} />
          <View style={styles.perfectRepsGroup}>
            <Ionicons name="checkmark-done" size={14} color="#10B981" />
            <Text style={styles.perfectRepsText}>{stats.perfectReps} Perfect</Text>
          </View>
        </View>
      )}

      {/* 5. Center Viewfinder Frame Guide (when skeleton is off) */}
      {!showPoseSkeleton && (
        <View style={styles.viewfinderFrame} pointerEvents="none">
          <View style={[styles.cornerMarker, styles.topLeftCorner]} />
          <View style={[styles.cornerMarker, styles.topRightCorner]} />
          <View style={[styles.cornerMarker, styles.bottomLeftCorner]} />
          <View style={[styles.cornerMarker, styles.bottomRightCorner]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-start',
    paddingTop: 54,
    paddingHorizontal: 16,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  headerLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  exerciseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  exerciseBadgeText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  quickActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionIconButtonActiveGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  actionIconButtonMuted: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  actionIconButtonFrontCam: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  actionIconButtonBackCam: {
    borderColor: 'rgba(192, 132, 252, 0.4)',
    backgroundColor: 'rgba(192, 132, 252, 0.12)',
  },
  feedbackBannerWrapper: {
    marginTop: 12,
    alignItems: 'center',
    zIndex: 25,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: '98%',
  },
  goodBanner: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.65)',
  },
  warningBanner: {
    backgroundColor: 'rgba(45, 14, 14, 0.96)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  infoBanner: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
  },
  feedbackBannerText: {
    fontSize: 13,
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
  heroTelemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 14,
    zIndex: 20,
  },
  telemetryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 5,
    minWidth: 135,
  },
  telemetryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  telemetryHeaderTitle: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  phasePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  phaseIdle: {
    backgroundColor: 'rgba(100, 116, 139, 0.25)',
  },
  phaseReady: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
  },
  phaseMoving: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
  },
  phaseBottom: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  phasePillText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '800',
  },
  telemetryMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricValueActive: {
    color: '#38BDF8',
  },
  metricValueGood: {
    color: '#10B981',
  },
  metricValuePerfect: {
    color: '#10B981',
  },
  metricValueWarning: {
    color: '#EF4444',
  },
  metricValueInactive: {
    color: '#64748B',
  },
  jointCountText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },
  heroRepWidget: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 135,
    gap: 4,
  },
  heroRepLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroRepNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginVertical: 1,
  },
  heroRepNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  heroRepTargetDivider: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 1,
  },
  heroRepTargetNumber: {
    color: '#94A3B8',
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  heroRepStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginVertical: 1,
  },
  goodRepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  goodRepText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  badRepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  badRepText: {
    color: '#F87171',
    fontSize: 9,
    fontWeight: '800',
  },
  heroRepScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    gap: 4,
    marginTop: 1,
  },
  heroRepScoreText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
  },
  liveTimerPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    marginTop: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 12,
    zIndex: 15,
  },
  timerPulseGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  pausedPulseDot: {
    backgroundColor: '#F59E0B',
  },
  timerDurationText: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  timerDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  caloriesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  caloriesText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  perfectRepsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  perfectRepsText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  viewfinderFrame: {
    position: 'absolute',
    top: '30%',
    left: '10%',
    right: '10%',
    height: '38%',
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
  geminiVisionPillWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  geminiVisionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8,
    maxWidth: '96%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  geminiVisionWarning: {
    borderColor: 'rgba(245, 158, 11, 0.8)',
    backgroundColor: 'rgba(30, 20, 10, 0.92)',
  },
  geminiVisionGood: {
    borderColor: 'rgba(56, 189, 248, 0.8)',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
  },
  geminiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  geminiBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  geminiVisionText: {
    color: '#F1F5F9',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
});
