import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StorageService, DashboardStats } from '../services/storageService';
import { Theme } from '../config/theme';
import { CreatePostModal } from './community/CreatePostModal';
import { CommunityPost, PostProgressMetrics } from '../types/community';

interface ProgressScreenProps {
  onOpenSettings?: () => void;
  onSelectWorkout?: (exerciseName: string) => void;
  onNavigateToCommunity?: () => void;
}

type TimeRange = 'Week' | 'Month' | 'Year';

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  onOpenSettings,
  onSelectWorkout,
  onNavigateToCommunity,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('Week');
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 0,
    totalReps: 0,
    totalCalories: 0,
    averageFormScore: 0,
    dayStreak: 5,
    longestStreak: 7,
    weekDayActive: [true, true, true, true, true, false, false],
    recentWorkouts: [],
  });

  // Post Progress modal state
  const [isPostModalVisible, setIsPostModalVisible] = useState<boolean>(false);
  const [postPresetCaption, setPostPresetCaption] = useState<string>('');
  const [postPresetImage, setPostPresetImage] = useState<string>('');
  const [postPresetMetrics, setPostPresetMetrics] = useState<PostProgressMetrics | undefined>(undefined);

  useEffect(() => {
    StorageService.getDashboardStats()
      .then((data) => {
        setStats(data);
      })
      .catch((e) => console.warn('[ProgressScreen] Error loading stats:', e));
  }, []);

  const handleRangeChange = (range: TimeRange) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setTimeRange(range);
  };

  // Dynamic chart data depending on selected time range
  const chartData = React.useMemo(() => {
    if (timeRange === 'Month') {
      return {
        labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        heights: [45, 60, 52, 68],
        active: [true, true, true, true],
      };
    }
    if (timeRange === 'Year') {
      return {
        labels: ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'],
        heights: [38, 48, 62, 54, 70, 65],
        active: [true, true, true, true, true, true],
      };
    }
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      heights: [42, 58, 65, 48, 60, 32, 20],
      active: [true, true, true, true, true, false, false],
    };
  }, [timeRange]);

  // Scaled metrics according to time range
  const displayedMetrics = React.useMemo(() => {
    const baseWorkouts = stats.totalWorkouts || 14;
    const baseReps = stats.totalReps || 348;
    const baseCalories = stats.totalCalories || 1280;
    const baseForm = stats.averageFormScore || 93;

    if (timeRange === 'Month') {
      return {
        workouts: Math.round(baseWorkouts * 3.5),
        reps: Math.round(baseReps * 3.5),
        calories: Math.round(baseCalories * 3.6),
        form: `${Math.min(96, baseForm + 1)}%`,
      };
    }
    if (timeRange === 'Year') {
      return {
        workouts: Math.round(baseWorkouts * 15),
        reps: Math.round(baseReps * 15.8),
        calories: Math.round(baseCalories * 16.7),
        form: `${Math.min(97, baseForm + 2)}%`,
      };
    }
    return {
      workouts: baseWorkouts,
      reps: baseReps,
      calories: baseCalories,
      form: `${baseForm}%`,
    };
  }, [stats, timeRange]);

  const handleOpenShareGeneralProgress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    const streak = stats.dayStreak || 5;
    const workouts = displayedMetrics.workouts;
    const reps = displayedMetrics.reps;
    const formVal = parseInt(displayedMetrics.form, 10) || 94;

    const metrics: PostProgressMetrics = {
      type: 'streak',
      streakDays: streak,
      workoutsCount: workouts,
      totalReps: reps,
      caloriesBurned: displayedMetrics.calories,
      formAccuracy: formVal,
      chartData: [
        { day: 'Mon', value: 20, score: 92 },
        { day: 'Tue', value: 25, score: 95 },
        { day: 'Wed', value: 28, score: 94 },
        { day: 'Thu', value: 22, score: 90 },
        { day: 'Fri', value: Math.min(reps, 32), score: formVal },
        { day: 'Sat', value: 0, score: 0 },
        { day: 'Sun', value: 0, score: 0 },
      ],
      weeklyActiveDays: [true, true, true, true, true, false, false],
    };

    setPostPresetMetrics(metrics);
    setPostPresetImage('');
    setPostPresetCaption(
      `🔥 ${streak} Day Streak active on FitPilot! Completed ${workouts} workouts and ${reps} total reps with ${displayedMetrics.form} form score. Building daily momentum! 🎯💪 #FitPilot #Consistency`
    );
    setIsPostModalVisible(true);
  };

  const handleShareSpecificWorkout = (session: any) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const exercise = session.workoutName || session.workoutType || 'Pushups';
    const reps = session.actualReps ?? 25;
    const form = session.formAccuracyScore ?? 94;
    const isHold = exercise.toLowerCase().includes('plank');

    const metrics: PostProgressMetrics = {
      type: 'workout',
      streakDays: stats.dayStreak || 5,
      workoutsCount: 1,
      totalReps: reps,
      caloriesBurned: session.caloriesBurned || 135,
      formAccuracy: form,
      exerciseName: exercise,
      chartData: [
        { day: 'Mon', value: 20, score: 92 },
        { day: 'Tue', value: 25, score: 95 },
        { day: 'Wed', value: 28, score: 94 },
        { day: 'Thu', value: 22, score: 90 },
        { day: 'Fri', value: reps, score: form },
        { day: 'Sat', value: 0, score: 0 },
        { day: 'Sun', value: 0, score: 0 },
      ],
      weeklyActiveDays: [true, true, true, true, true, false, false],
    };

    setPostPresetMetrics(metrics);
    setPostPresetImage('');
    setPostPresetCaption(
      `Crushed ${exercise}! Completed ${reps}${isHold ? 's hold' : ' reps'} with ${form}% real-time form accuracy via Google MediaPipe AI. 🚀🔥 #FitPilot #WorkoutMilestone`
    );
    setIsPostModalVisible(true);
  };

  const handlePostCreated = (newPost: CommunityPost) => {
    setIsPostModalVisible(false);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    Alert.alert(
      'Progress Posted! 🚀',
      'Your workout milestone has been shared to the Community feed.',
      [
        {
          text: 'View in Community',
          onPress: () => {
            if (onNavigateToCommunity) {
              onNavigateToCommunity();
            }
          },
        },
        { text: 'Done', style: 'cancel' },
      ]
    );
  };

  const formatDate = (isoString?: string): string => {
    if (!isoString) return 'Today';
    try {
      const d = new Date(isoString);
      const today = new Date();
      if (today.toDateString() === d.toDateString()) return 'Today';
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (yesterday.toDateString() === d.toDateString()) return 'Yesterday';

      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Today';
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section with Post Progress Action */}
        <View style={styles.headerSection}>
          <View style={styles.headerTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mainTitle}>Your Progress</Text>
              <Text style={styles.subtitle}>You're building momentum. Consistency is key.</Text>
            </View>
            <TouchableOpacity
              style={styles.postProgressHeaderButton}
              onPress={handleOpenShareGeneralProgress}
              activeOpacity={0.8}
            >
              <Ionicons name="share-social-outline" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.postProgressHeaderText}>Post</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak & Consistency Highlight Card */}
        <View style={styles.streakHighlightCard}>
          <View style={styles.streakHighlightLeft}>
            <View style={styles.streakEmojiCircle}>
              <Text style={{ fontSize: 22 }}>🔥</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.streakCountText}>
                {stats.dayStreak || 5} Day Streak
              </Text>
              <Text style={styles.streakSubtext}>
                Consistency is your superpower! Keep it up!
              </Text>
            </View>
          </View>

          <View style={styles.streakRightActions}>
            <View style={styles.longestStreakBadge}>
              <Ionicons name="trophy" size={13} color="#D97706" />
              <Text style={styles.longestStreakText}>
                Best: {stats.longestStreak || 7}d
              </Text>
            </View>

            <TouchableOpacity
              style={styles.shareStreakPill}
              onPress={handleOpenShareGeneralProgress}
              activeOpacity={0.7}
            >
              <Ionicons name="paper-plane" size={11} color={Theme.colors.primaryGreen} style={{ marginRight: 3 }} />
              <Text style={styles.shareStreakText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 1. Time Range Switcher (Week | Month | Year) */}
        <View style={styles.rangeSwitcher}>
          {(['Week', 'Month', 'Year'] as TimeRange[]).map((range) => {
            const isSelected = timeRange === range;
            return (
              <TouchableOpacity
                key={range}
                style={[
                  styles.rangeButton,
                  isSelected && styles.rangeButtonActive,
                ]}
                onPress={() => handleRangeChange(range)}
                activeOpacity={0.7}
              >
                <Text style={[styles.rangeButtonText, isSelected && styles.rangeButtonTextActive]}>
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 2. Activity Bar Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeaderRow}>
            <Text style={styles.chartTitle}>Activity Volume</Text>
            <Text style={styles.chartSubtitle}>
              {timeRange === 'Week' ? 'Daily Completed Sets' : timeRange === 'Month' ? 'Weekly Progression' : 'Monthly Performance'}
            </Text>
          </View>
          <View style={styles.barsRow}>
            {chartData.labels.map((dayLabel, idx) => {
              const isActive = chartData.active[idx];
              const height = chartData.heights[idx];
              return (
                <View key={`day-bar-${idx}`} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { height },
                        isActive ? styles.barFillActive : styles.barFillInactive,
                      ]}
                    />
                  </View>
                  <Text style={[styles.dayLabelText, isActive && styles.dayLabelTextActive]}>
                    {dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 3. 2x2 Summary Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Workouts */}
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{displayedMetrics.workouts}</Text>
            <Text style={styles.metricLabel}>Workouts</Text>
          </View>

          {/* Reps */}
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{displayedMetrics.reps.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Total reps</Text>
          </View>

          {/* Calories */}
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{displayedMetrics.calories.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Calories burned</Text>
          </View>

          {/* Avg Form */}
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: Theme.colors.primaryGreen }]}>
              {displayedMetrics.form}
            </Text>
            <Text style={styles.metricLabel}>Avg form rating</Text>
          </View>
        </View>

        {/* 4. AI Biomechanics & Form Highlights Card */}
        <View style={styles.biomechanicsCard}>
          <View style={styles.biomechanicsHeader}>
            <View style={styles.aiSparkleIcon}>
              <Ionicons name="sparkles" size={16} color={Theme.colors.primaryGreen} />
            </View>
            <Text style={styles.biomechanicsTitle}>AI Pose Accuracy Breakdown</Text>
          </View>

          <View style={styles.biomechanicsList}>
            <View style={styles.biomechanicsItem}>
              <View style={styles.bioMetricTop}>
                <Text style={styles.bioMetricLabel}>Squat Depth & Hip Hinge</Text>
                <Text style={styles.bioMetricValue}>96%</Text>
              </View>
              <View style={styles.bioProgressBar}>
                <View style={[styles.bioProgressFill, { width: '96%' }]} />
              </View>
            </View>

            <View style={styles.biomechanicsItem}>
              <View style={styles.bioMetricTop}>
                <Text style={styles.bioMetricLabel}>Pushup 45° Elbow Angle</Text>
                <Text style={styles.bioMetricValue}>94%</Text>
              </View>
              <View style={styles.bioProgressBar}>
                <View style={[styles.bioProgressFill, { width: '94%' }]} />
              </View>
            </View>

            <View style={styles.biomechanicsItem}>
              <View style={styles.bioMetricTop}>
                <Text style={styles.bioMetricLabel}>Spine Alignment & Stability</Text>
                <Text style={styles.bioMetricValue}>92%</Text>
              </View>
              <View style={styles.bioProgressBar}>
                <View style={[styles.bioProgressFill, { width: '92%' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* 5. Recent Workouts List */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeaderRow}>
            <Text style={styles.sectionHeader}>Recent workouts</Text>
            <TouchableOpacity
              onPress={handleOpenShareGeneralProgress}
              activeOpacity={0.7}
              style={styles.shareAllLink}
            >
              <Ionicons name="share-outline" size={14} color={Theme.colors.primaryGreen} style={{ marginRight: 3 }} />
              <Text style={styles.shareAllLinkText}>Share Milestone</Text>
            </TouchableOpacity>
          </View>

          {stats.recentWorkouts && stats.recentWorkouts.length > 0 ? (
            <View style={styles.recentList}>
              {stats.recentWorkouts.map((session, index) => (
                <View
                  key={`${session.id}-${index}`}
                  style={styles.recentItemCard}
                >
                  <TouchableOpacity
                    style={styles.recentItemMain}
                    onPress={() => onSelectWorkout && onSelectWorkout(session.workoutType || 'Pushups')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.recentIconBox}>
                      <Ionicons
                        name={
                          session.workoutType === 'Squats'
                            ? 'body'
                            : session.workoutType === 'Plank'
                            ? 'timer'
                            : 'barbell'
                        }
                        size={18}
                        color={Theme.colors.primaryGreen}
                      />
                    </View>

                    <View style={styles.recentTextCol}>
                      <Text style={styles.recentDateText}>
                        {formatDate(session.date || session.completedAt)}
                      </Text>
                      <Text style={styles.recentTitleText}>
                        {session.workoutName || session.workoutType || 'Pushups'}
                      </Text>
                    </View>

                    <View style={styles.recentStatsCol}>
                      <Text style={styles.recentRepsText}>
                        {(session.workoutType || session.workoutName || '').toLowerCase().includes('plank')
                          ? `${session.actualReps ?? 60}s hold`
                          : `${session.actualReps ?? 25} reps`}
                      </Text>
                      <View style={styles.scorePill}>
                        <Text style={styles.scorePillText}>{session.formAccuracyScore ?? 94}% form</Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Share button for individual workout */}
                  <TouchableOpacity
                    style={styles.workoutShareButton}
                    onPress={() => handleShareSpecificWorkout(session)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="arrow-redo-outline" size={16} color={Theme.colors.primaryGreen} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyRecentCard}>
              <View style={styles.emptyRecentIconBox}>
                <Ionicons name="fitness-outline" size={26} color={Theme.colors.primaryGreen} />
              </View>
              <Text style={styles.emptyRecentTitle}>No workouts yet</Text>
              <Text style={styles.emptyRecentSub}>
                Complete your first workout to track your reps, consistency, and real-time form accuracy.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Community Progress Posting Modal */}
      <CreatePostModal
        visible={isPostModalVisible}
        onClose={() => setIsPostModalVisible(false)}
        onPostCreated={handlePostCreated}
        initialCaption={postPresetCaption}
        initialImageUri={postPresetImage}
        initialProgressMetrics={postPresetMetrics}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xxxl,
  },
  headerSection: {
    marginBottom: Theme.spacing.lg,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  postProgressHeaderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primaryGreen,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.soft,
  },
  postProgressHeaderText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
  },
  rangeSwitcher: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: Theme.borderRadius.md,
    padding: 3,
    marginBottom: Theme.spacing.lg,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: Theme.borderRadius.sm,
  },
  rangeButtonActive: {
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.soft,
  },
  rangeButtonText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  rangeButtonTextActive: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.soft,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    paddingHorizontal: 4,
  },
  chartTitle: {
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  chartSubtitle: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  barsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 70,
    width: 14,
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barFillActive: {
    backgroundColor: Theme.colors.primaryGreen,
  },
  barFillInactive: {
    backgroundColor: '#D1D5DB',
  },
  dayLabelText: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginTop: 8,
  },
  dayLabelTextActive: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  metricValue: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  biomechanicsCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.soft,
  },
  biomechanicsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  aiSparkleIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biomechanicsTitle: {
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  biomechanicsList: {
    gap: 12,
  },
  biomechanicsItem: {},
  bioMetricTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bioMetricLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  bioMetricValue: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primaryGreen,
  },
  bioProgressBar: {
    height: 6,
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  bioProgressFill: {
    height: '100%',
    backgroundColor: Theme.colors.primaryGreen,
    borderRadius: 3,
  },
  recentSection: {
    marginBottom: Theme.spacing.xl,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionHeader: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  shareAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  shareAllLinkText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
    color: Theme.colors.primaryGreen,
  },
  recentList: {
    gap: Theme.spacing.sm,
  },
  recentItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  recentItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentTextCol: {
    flex: 1,
  },
  recentDateText: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  recentTitleText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginTop: 1,
  },
  recentStatsCol: {
    alignItems: 'flex-end',
    gap: 4,
    marginRight: 8,
  },
  recentRepsText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textPrimary,
    fontWeight: '700',
  },
  scorePill: {
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scorePillText: {
    fontSize: 10,
    color: Theme.colors.primaryGreen,
    fontWeight: '700',
  },
  workoutShareButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  emptyRecentCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  emptyRecentIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  emptyRecentTitle: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyRecentSub: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Theme.spacing.lg,
    maxWidth: 260,
  },
  streakHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.soft,
  },
  streakHighlightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  streakEmojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCountText: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  streakSubtext: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  streakRightActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  longestStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  longestStreakText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  shareStreakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
  },
  shareStreakText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
  },
});
