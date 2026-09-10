import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StorageService, DashboardStats } from '../services/storageService';
import { Theme } from '../config/theme';

interface ProgressScreenProps {
  onOpenSettings?: () => void;
  onSelectWorkout?: (exerciseName: string) => void;
}

type TimeRange = 'Week' | 'Month' | 'Year';

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  onOpenSettings,
  onSelectWorkout,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('Week');
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 0,
    totalReps: 0,
    totalCalories: 0,
    averageFormScore: 0,
    dayStreak: 0,
    weekDayActive: [false, false, false, false, false, false, false],
    recentWorkouts: [],
  });

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

  const weekDayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const barHeights = [24, 48, 64, 18, 56, 32, 20]; // Minimal visual proportions

  const formatDate = (isoString?: string): string => {
    if (!isoString) return 'Today';
    try {
      const d = new Date(isoString);
      const isToday = new Date().toDateString() === d.toDateString();
      if (isToday) return 'Today';
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
        {/* Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Your Progress</Text>
          <Text style={styles.subtitle}>You're building a habit. Keep going.</Text>
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
          <View style={styles.barsRow}>
            {weekDayLabels.map((dayLabel, idx) => {
              const isActive = Boolean(stats.weekDayActive[idx]);
              const height = isActive ? Math.max(36, barHeights[idx]) : 8;
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
            <Text style={styles.metricValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.metricLabel}>Workouts</Text>
          </View>

          {/* Reps */}
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.totalReps}</Text>
            <Text style={styles.metricLabel}>Total reps</Text>
          </View>

          {/* Calories */}
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>{stats.totalCalories.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Calories</Text>
          </View>

          {/* Avg Form */}
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: Theme.colors.primaryGreen }]}>
              {stats.totalWorkouts > 0 ? `${stats.averageFormScore}%` : '—'}
            </Text>
            <Text style={styles.metricLabel}>Avg form</Text>
          </View>
        </View>

        {/* 4. Recent Workouts List */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionHeader}>Recent workouts</Text>

          {stats.recentWorkouts && stats.recentWorkouts.length > 0 ? (
            <View style={styles.recentList}>
              {stats.recentWorkouts.map((session, index) => (
                <TouchableOpacity
                  key={`${session.id}-${index}`}
                  style={styles.recentItemCard}
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
                      {session.workoutType || session.workoutName || 'Pushups'}
                    </Text>
                  </View>

                  <View style={styles.recentStatsCol}>
                    <Text style={styles.recentRepsText}>
                      {(session.workoutType || session.workoutName || '').toLowerCase().includes('plank')
                        ? `${session.actualReps ?? 30}s hold`
                        : `${session.actualReps ?? 12} reps`} · {session.formAccuracyScore ?? 100}%
                    </Text>
                  </View>
                </TouchableOpacity>
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
              {onSelectWorkout && (
                <TouchableOpacity
                  style={styles.emptyStartButton}
                  onPress={() => onSelectWorkout('Pushups')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.emptyStartButtonText}>Start First Workout</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.soft,
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
    marginBottom: Theme.spacing.xl,
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
  recentSection: {
    marginBottom: Theme.spacing.xl,
  },
  sectionHeader: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
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
  },
  recentRepsText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
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
  emptyStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primaryGreen,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm + 2,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
    ...Theme.shadows.card,
  },
  emptyStartButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '700',
  },
});
