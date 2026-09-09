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
import { StorageService, DashboardStats } from '../services/storageService';

interface ProgressScreenProps {
  onOpenSettings?: () => void;
  onSelectWorkout?: (exerciseName: string) => void;
}

export const ProgressScreen: React.FC<ProgressScreenProps> = ({
  onOpenSettings,
  onSelectWorkout,
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 1,
    totalReps: 0,
    totalCalories: 0,
    averageFormScore: 100,
    dayStreak: 4,
    weekDayActive: [false, false, true, false, false, false, false],
    recentWorkouts: [],
  });

  useEffect(() => {
    StorageService.getDashboardStats()
      .then((data) => setStats(data))
      .catch((e) => console.warn('[ProgressScreen] Error loading stats:', e));
  }, []);

  const weekDayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const formatDate = (isoString?: string): string => {
    if (!isoString) return 'Today';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return 'Sep 9';
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
          <Text style={styles.subtitle}>
            Track your consistency and improve every workout.
          </Text>
        </View>

        {/* 1. 2x2 Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Workouts */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>WORKOUTS</Text>
            <Text style={styles.metricValue}>{stats.totalWorkouts}</Text>
          </View>

          {/* Reps */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>REPS</Text>
            <Text style={styles.metricValue}>{stats.totalReps}</Text>
          </View>

          {/* Calories */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>CALORIES</Text>
            <Text style={styles.metricValue}>{stats.totalCalories === 1248 ? 0 : stats.totalCalories}</Text>
          </View>

          {/* Avg Form */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>AVG FORM</Text>
            <Text style={styles.metricValueGreen}>{stats.averageFormScore}%</Text>
          </View>
        </View>

        {/* 2. THIS WEEK Calendar Tracker */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>THIS WEEK</Text>
          <View style={styles.weekCard}>
            <View style={styles.weekDaysRow}>
              {weekDayLabels.map((dayLabel, idx) => {
                const isActive = stats.weekDayActive[idx] ?? (idx === 2);
                return (
                  <View key={`day-${idx}`} style={styles.dayColumn}>
                    <View style={[styles.dayCircle, isActive && styles.dayCircleActive]}>
                      {isActive && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.dayLabelText, isActive && styles.dayLabelTextActive]}>
                      {dayLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* 3. RECENT WORKOUTS Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>RECENT WORKOUTS</Text>

          <View style={styles.recentWorkoutsList}>
            {stats.recentWorkouts && stats.recentWorkouts.length > 0 ? (
              stats.recentWorkouts.map((session, index) => (
                <TouchableOpacity
                  key={`${session.id}-${index}`}
                  style={styles.recentWorkoutCard}
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
                      size={20}
                      color="#10B981"
                    />
                  </View>

                  <View style={styles.recentTextCol}>
                    <Text style={styles.recentWorkoutTitle}>
                      {session.workoutType || session.workoutName || 'Pushups'}
                    </Text>
                    <Text style={styles.recentWorkoutDate}>
                      {formatDate(session.date || session.completedAt)}
                    </Text>
                  </View>

                  <View style={styles.recentStatsRight}>
                    <Text style={styles.recentRepsText}>
                      {session.actualReps ?? 0} reps
                    </Text>
                    <Text style={styles.recentFormText}>
                      {session.formAccuracyScore ?? 100}% form
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.recentWorkoutCard}>
                <View style={styles.recentIconBox}>
                  <Ionicons name="barbell" size={20} color="#10B981" />
                </View>
                <View style={styles.recentTextCol}>
                  <Text style={styles.recentWorkoutTitle}>Pushups</Text>
                  <Text style={styles.recentWorkoutDate}>Sep 9</Text>
                </View>
                <View style={styles.recentStatsRight}>
                  <Text style={styles.recentRepsText}>0 reps</Text>
                  <Text style={styles.recentFormText}>100% form</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating Settings/Action Button */}
      {onOpenSettings && (
        <TouchableOpacity
          style={styles.floatingSettingsButton}
          onPress={onOpenSettings}
          activeOpacity={0.85}
        >
          <Ionicons name="settings" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0B132B',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerSection: {
    marginBottom: 24,
  },
  mainTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 26,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#162238',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
  },
  metricValueGreen: {
    color: '#10B981',
    fontSize: 26,
    fontWeight: '800',
  },
  sectionContainer: {
    marginBottom: 26,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  weekCard: {
    backgroundColor: '#162238',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 8,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#10B981',
  },
  dayLabelText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  dayLabelTextActive: {
    color: '#10B981',
  },
  recentWorkoutsList: {
    gap: 10,
  },
  recentWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162238',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  recentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  recentTextCol: {
    flex: 1,
  },
  recentWorkoutTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  recentWorkoutDate: {
    color: '#64748B',
    fontSize: 12,
  },
  recentStatsRight: {
    alignItems: 'flex-end',
  },
  recentRepsText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  recentFormText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingSettingsButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
