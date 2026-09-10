import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraFacing, WorkoutStatus, WorkoutStats } from '../types/workout';
import { ExercisePhase, FormError, VisibilityStatus } from '../engine/types';
import { Theme } from '../config/theme';

interface WorkoutHUDOverlayProps {
  status: WorkoutStatus;
  stats: WorkoutStats;
  facing: CameraFacing;
  isMuted: boolean;
  selectedExercise: string;
  showPoseSkeleton: boolean;
  targetReps?: number;
  currentSet?: number;
  totalSets?: number;
  isResting?: boolean;
  restSecondsRemaining?: number;
  onSkipRest?: () => void;
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
  currentSet = 1,
  totalSets = 3,
  isResting = false,
  restSecondsRemaining = 45,
  onSkipRest,
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
  const isWorkoutActive = status === 'active' || status === 'paused';

  // 1. Collapsible HUD State (Expand / Minimize)
  const [isHudMinimized, setIsHudMinimized] = useState<boolean>(false);

  // 2. Auto-Hiding Secondary Metrics Bar (Fades away after ~2s inactivity)
  const [isMetricsVisible, setIsMetricsVisible] = useState<boolean>(true);
  const [isDetailedMetricsExpanded, setIsDetailedMetricsExpanded] = useState<boolean>(false);
  const metricsOpacity = useRef(new Animated.Value(1)).current;
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetMetricsTimer = () => {
    // Reveal metrics smoothly
    setIsMetricsVisible(true);
    Animated.timing(metricsOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    // Auto-hide after 2.5s if active and not resting
    if (isWorkoutActive && !isResting && !isDetailedMetricsExpanded) {
      hideTimerRef.current = setTimeout(() => {
        Animated.timing(metricsOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          setIsMetricsVisible(false);
        });
      }, 2500);
    }
  };

  useEffect(() => {
    if (isWorkoutActive) {
      resetMetricsTimer();
    } else {
      setIsMetricsVisible(true);
      metricsOpacity.setValue(1);
    }

    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, [isWorkoutActive, isResting, isDetailedMetricsExpanded]);

  // Format Duration Timer (MM:SS)
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(mins)}:${pad(secs)}`;
  };

  // Contextual Form Feedback Resolution
  const isIsometric = selectedExercise.toLowerCase().includes('plank');
  const target = targetReps || stats.targetReps || (isIsometric ? 30 : 10);
  const goodReps = stats.perfectReps ?? stats.goodReps ?? 0;
  const badReps = stats.badReps ?? Math.max(0, stats.repCount - goodReps);

  const getFormFeedbackMessage = () => {
    if (geminiCoachingTip?.text) {
      return {
        text: geminiCoachingTip.text,
        type: geminiCoachingTip.assessment === 'needs_improvement' ? 'warning' : 'good',
        icon: 'sparkles' as const,
      };
    }
    if (primaryFeedback?.visualMessage) {
      return {
        text: primaryFeedback.visualMessage,
        type: primaryFeedback.severity === 'info' ? 'info' : 'warning',
        icon: 'information-circle' as const,
      };
    }
    if (!isGoodForm) {
      return {
        text: 'Adjust your body position',
        type: 'warning',
        icon: 'warning' as const,
      };
    }
    if (stats.repCount > 0) {
      return {
        text: 'Great form! Keep going.',
        type: 'good',
        icon: 'checkmark-circle' as const,
      };
    }
    return null;
  };

  const feedbackInfo = getFormFeedbackMessage();

  return (
    <TouchableWithoutFeedback onPress={resetMetricsTimer}>
      <View style={styles.overlayContainer} pointerEvents="box-none">
        {/* 1. TOP HEADER NAVIGATION BAR */}
        <View style={styles.topHeaderBar} pointerEvents="box-none">
          {/* Left: Back Button */}
          {onExit && (
            <TouchableOpacity
              style={styles.circleIconButton}
              onPress={onExit}
              activeOpacity={0.7}
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}

          {/* Center: Exercise Title Pill */}
          <TouchableOpacity
            style={styles.exerciseSelectorPill}
            onPress={status === 'idle' ? onSelectExercise : undefined}
            activeOpacity={status === 'idle' ? 0.8 : 1}
          >
            <Ionicons
              name={selectedExercise === 'Pushups' ? 'barbell' : 'body'}
              size={16}
              color={Theme.colors.primaryGreen}
            />
            <Text style={styles.exerciseSelectorText}>{selectedExercise}</Text>
            {status === 'idle' && (
              <Ionicons name="chevron-down" size={14} color="#94A3B8" />
            )}
          </TouchableOpacity>

          {/* Right Action Icons Group */}
          <View style={styles.topRightActions}>
            {/* Camera Switch Button - Prominent in top right */}
            <TouchableOpacity
              style={[
                styles.circleIconButton,
                styles.cameraSwitchButton,
                facing === 'back' && styles.cameraSwitchActive,
              ]}
              onPress={onToggleFacing}
              activeOpacity={0.7}
              accessibilityLabel="Switch Camera"
            >
              <Ionicons name="camera-reverse" size={18} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Voice Feedback Toggle */}
            <TouchableOpacity
              style={[
                styles.circleIconButton,
                isMuted && styles.mutedIconButton,
              ]}
              onPress={onToggleMute}
              activeOpacity={0.7}
              accessibilityLabel="Toggle Audio"
            >
              <Ionicons
                name={isMuted ? 'volume-mute' : 'volume-high'}
                size={18}
                color={isMuted ? '#EF4444' : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* Skeleton / Settings Toggle */}
            <TouchableOpacity
              style={[
                styles.circleIconButton,
                showPoseSkeleton && styles.skeletonActiveButton,
              ]}
              onPress={onTogglePoseSkeleton}
              activeOpacity={0.7}
              accessibilityLabel="Toggle Pose Skeleton"
            >
              <Ionicons
                name={showPoseSkeleton ? 'body' : 'settings-outline'}
                size={18}
                color={showPoseSkeleton ? Theme.colors.primaryGreen : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================================= */}
        {/* A. BEFORE WORKOUT (IDLE STATE) OVERLAY                                    */}
        {/* ========================================================================= */}
        {!isWorkoutActive && (
          <View style={styles.idleOverlayContent} pointerEvents="box-none">
            {/* Body Positioning Guide Banner */}
            <View style={styles.guidanceBanner}>
              <Ionicons
                name={jointCount >= 15 ? 'checkmark-circle' : 'information-circle'}
                size={18}
                color={jointCount >= 15 ? Theme.colors.primaryGreen : '#38BDF8'}
              />
              <Text style={styles.guidanceBannerText}>
                {jointCount >= 15
                  ? 'Body detected — You are ready to start!'
                  : visibilityStatus?.guidanceMessage || 'Move back so your full body is visible.'}
              </Text>
            </View>

            {/* 2 Information Cards (AI Tracking & Tips) */}
            <View style={styles.idleCardsRow}>
              {/* Card 1: AI Tracking */}
              <View style={styles.idleCard}>
                <Text style={styles.idleCardHeader}>AI Tracking</Text>
                <View style={styles.trackingStatusRow}>
                  <View
                    style={[
                      styles.statusDot,
                      jointCount >= 15 ? styles.statusDotGreen : styles.statusDotYellow,
                    ]}
                  />
                  <Text style={styles.trackingStatusText}>
                    {jointCount >= 15 ? 'Ready' : 'Positioning'}
                  </Text>
                </View>
                <Text style={styles.jointSubtext}>
                  Joints detected{'\n'}
                  <Text style={styles.jointCountHighlight}>{jointCount} / 33</Text>
                </Text>
              </View>

              {/* Card 2: Tips */}
              <View style={[styles.idleCard, { flex: 1.3 }]}>
                <Text style={styles.idleCardHeader}>Tips</Text>
                <View style={styles.tipItem}>
                  <Ionicons name="body-outline" size={14} color={Theme.colors.primaryGreen} />
                  <Text style={styles.tipItemText}>Keep full body in frame</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="sunny-outline" size={14} color="#F59E0B" />
                  <Text style={styles.tipItemText}>Ensure good lighting</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="phone-portrait-outline" size={14} color="#38BDF8" />
                  <Text style={styles.tipItemText}>Keep phone stable</Text>
                </View>
                <View style={styles.tipItem}>
                  <Ionicons name="checkmark-circle-outline" size={14} color={Theme.colors.primaryGreen} />
                  <Text style={styles.tipItemText}>Follow form cues</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* B. LIVE WORKOUT (ACTIVE / PAUSED STATE) OVERLAY                           */}
        {/* ========================================================================= */}
        {isWorkoutActive && (
          <View style={styles.activeOverlayContent} pointerEvents="box-none">
            {/* Top Minimal HUD (Collapsible) */}
            {!isHudMinimized ? (
              <View style={styles.topHudContainer} pointerEvents="box-none">
                {/* Left: Compact Tracking Status */}
                <View style={styles.hudStatusBadge}>
                  <View
                    style={[
                      styles.statusDot,
                      jointCount >= 15 ? styles.statusDotGreen : styles.statusDotYellow,
                    ]}
                  />
                  <View>
                    <Text style={styles.hudStatusTitle}>
                      {jointCount >= 15 ? 'Tracking' : 'Body check'}
                    </Text>
                    <Text style={styles.hudStatusSubtitle}>
                      {jointCount > 0 ? `${jointCount} / 33 points` : 'No person detected'}
                    </Text>
                  </View>
                </View>

                {/* Center: Floating Hero Rep Widget */}
                <View style={styles.circularRepWidget}>
                  <View style={styles.repNumberRow}>
                    <Text style={styles.repMainNumber}>{stats.repCount}</Text>
                    <Text style={styles.repTargetSlash}>/{target}</Text>
                  </View>
                  <Text style={styles.repUnitLabel}>{isIsometric ? 'SEC HOLD' : 'REPS'}</Text>
                  <Text style={styles.repSetLabel}>Set {currentSet} of {totalSets}</Text>
                </View>

                {/* Right: Minimize HUD Button */}
                <TouchableOpacity
                  style={styles.minimizeHudButton}
                  onPress={() => setIsHudMinimized(true)}
                  activeOpacity={0.7}
                  accessibilityLabel="Minimize HUD"
                >
                  <Ionicons name="chevron-up" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              /* Minimized Compact Bar */
              <View style={styles.minimizedBar}>
                <Text style={styles.minimizedExerciseName}>{selectedExercise}</Text>
                <Text style={styles.minimizedReps}>
                  {stats.repCount} / {target} {isIsometric ? 's' : 'reps'}
                </Text>
                <View style={[styles.statusDot, styles.statusDotGreen]} />

                <TouchableOpacity
                  style={styles.expandHudButton}
                  onPress={() => setIsHudMinimized(false)}
                  activeOpacity={0.7}
                  accessibilityLabel="Expand HUD"
                >
                  <Ionicons name="chevron-down" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {/* Contextual Floating Form Feedback Toast */}
            {feedbackInfo && (
              <View style={styles.floatingFeedbackContainer} pointerEvents="none">
                <View
                  style={[
                    styles.floatingFeedbackToast,
                    feedbackInfo.type === 'good' && styles.toastGood,
                    feedbackInfo.type === 'warning' && styles.toastWarning,
                    feedbackInfo.type === 'info' && styles.toastInfo,
                  ]}
                >
                  <Ionicons
                    name={
                      feedbackInfo.type === 'good'
                        ? 'checkmark-circle'
                        : feedbackInfo.type === 'warning'
                        ? 'warning'
                        : 'information-circle'
                    }
                    size={16}
                    color={
                      feedbackInfo.type === 'good'
                        ? '#10B981'
                        : feedbackInfo.type === 'warning'
                        ? '#F59E0B'
                        : '#38BDF8'
                    }
                  />
                  <Text style={styles.floatingFeedbackText}>
                    {feedbackInfo.text}
                  </Text>
                </View>
              </View>
            )}

            {/* Auto-Hiding Bottom Workout Metrics Bar */}
            <Animated.View
              style={[
                styles.bottomMetricsContainer,
                { opacity: metricsOpacity },
              ]}
              pointerEvents="box-none"
            >
              <View style={styles.metricsBar}>
                {/* Time */}
                <View style={styles.metricItem}>
                  <Ionicons name="time-outline" size={15} color="#94A3B8" />
                  <View>
                    <Text style={styles.metricItemValue}>{formatTime(stats.durationSeconds)}</Text>
                    <Text style={styles.metricItemLabel}>Time</Text>
                  </View>
                </View>

                <View style={styles.metricDivider} />

                {/* Calories */}
                <View style={styles.metricItem}>
                  <Ionicons name="flame-outline" size={15} color="#EA580C" />
                  <View>
                    <Text style={styles.metricItemValue}>{stats.caloriesBurned}</Text>
                    <Text style={styles.metricItemLabel}>Kcal</Text>
                  </View>
                </View>

                <View style={styles.metricDivider} />

                {/* Good Reps */}
                <View style={styles.metricItem}>
                  <Ionicons name="stats-chart-outline" size={15} color="#10B981" />
                  <View>
                    <Text style={styles.metricItemValue}>{goodReps}</Text>
                    <Text style={styles.metricItemLabel}>Good reps</Text>
                  </View>
                </View>

                {/* Expand Detailed Breakdown Toggle */}
                <TouchableOpacity
                  style={styles.detailsToggle}
                  onPress={() => {
                    setIsDetailedMetricsExpanded((prev) => !prev);
                    resetMetricsTimer();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isDetailedMetricsExpanded ? 'chevron-down' : 'chevron-up'}
                    size={16}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              {/* Expanded Detailed Breakdown */}
              {isDetailedMetricsExpanded && (
                <View style={styles.detailedMetricsPanel}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>✓ Good reps</Text>
                    <Text style={[styles.detailValue, { color: '#10B981' }]}>{goodReps}</Text>
                  </View>
                  {!isIsometric && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>✕ Needs improvement</Text>
                      <Text style={[styles.detailValue, { color: '#EF4444' }]}>{badReps}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Form accuracy</Text>
                    <Text style={[styles.detailValue, { color: '#38BDF8' }]}>
                      {stats.formAccuracyScore ?? 100}%
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </View>
        )}

        {/* ========================================================================= */}
        {/* C. REST TIMER & NEXT SET OVERLAY                                          */}
        {/* ========================================================================= */}
        {isResting && (
          <View style={styles.restOverlayContainer} pointerEvents="box-none">
            <View style={styles.restCard}>
              <View style={styles.restHeaderPill}>
                <Ionicons name="timer" size={14} color="#F59E0B" />
                <Text style={styles.restHeaderPillText}>REST & RECOVER</Text>
              </View>

              <Text style={styles.restSetTitle}>
                Set {currentSet} of {totalSets} Done!
              </Text>
              <Text style={styles.restSetSubtitle}>
                Take a quick breath before starting Set {currentSet + 1}.
              </Text>

              {/* Countdown Circle */}
              <View style={styles.restCountdownRing}>
                <Text style={styles.restCountdownNumber}>
                  {restSecondsRemaining}
                </Text>
                <Text style={styles.restCountdownUnit}>SECONDS</Text>
              </View>

              {/* Skip Rest CTA */}
              {onSkipRest && (
                <TouchableOpacity
                  style={styles.startNextSetButton}
                  activeOpacity={0.85}
                  onPress={onSkipRest}
                >
                  <Text style={styles.startNextSetButtonText}>
                    Start Set {currentSet + 1} of {totalSets} Now
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
    elevation: 10,
  },
  circleIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  cameraSwitchButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  cameraSwitchActive: {
    borderColor: Theme.colors.primaryGreen,
    backgroundColor: 'rgba(31, 107, 79, 0.4)',
  },
  mutedIconButton: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  skeletonActiveButton: {
    borderColor: Theme.colors.primaryGreen,
  },
  exerciseSelectorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  exerciseSelectorText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idleOverlayContent: {
    flex: 1,
    justifyContent: 'flex-start',
    marginTop: 16,
  },
  guidanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: 16,
  },
  guidanceBannerText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '600',
    flex: 1,
  },
  idleCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  idleCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  idleCardHeader: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trackingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotGreen: {
    backgroundColor: '#10B981',
  },
  statusDotYellow: {
    backgroundColor: '#F59E0B',
  },
  trackingStatusText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
  },
  jointSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 16,
  },
  jointCountHighlight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  tipItemText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  activeOverlayContent: {
    flex: 1,
    justifyContent: 'space-between',
    marginTop: 12,
  },
  topHudContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  hudStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hudStatusTitle: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '700',
  },
  hudStatusSubtitle: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
  },
  circularRepWidget: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 107, 79, 0.25)',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(47, 138, 100, 0.6)',
  },
  repNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  repMainNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  repTargetSlash: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 2,
  },
  repUnitLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#10B981',
    letterSpacing: 0.8,
  },
  repSetLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 1,
  },
  minimizeHudButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  minimizedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  minimizedExerciseName: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
  },
  minimizedReps: {
    color: '#10B981',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '800',
  },
  expandHudButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingFeedbackContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  floatingFeedbackToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
  },
  toastGood: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  toastWarning: {
    borderColor: 'rgba(245, 158, 11, 0.5)',
  },
  toastInfo: {
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  floatingFeedbackText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '600',
  },
  bottomMetricsContainer: {
    width: '100%',
    marginBottom: 8,
  },
  metricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricItemValue: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
  },
  metricItemLabel: {
    color: '#94A3B8',
    fontSize: 10,
  },
  metricDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  detailsToggle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailedMetricsPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 6,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '700',
  },
  restOverlayContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
    zIndex: 20,
    elevation: 20,
  },
  restCard: {
    width: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.95)',
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  restHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    marginBottom: Theme.spacing.sm,
  },
  restHeaderPillText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  restSetTitle: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    marginTop: 4,
  },
  restSetSubtitle: {
    color: '#94A3B8',
    fontSize: Theme.typography.sizes.xs,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Theme.spacing.lg,
  },
  restCountdownRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    marginBottom: Theme.spacing.xl,
  },
  restCountdownNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  restCountdownUnit: {
    fontSize: 9,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  startNextSetButton: {
    backgroundColor: Theme.colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
  },
  startNextSetButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
  },
});
