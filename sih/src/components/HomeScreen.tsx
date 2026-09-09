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

interface HomeScreenProps {
  onStartMainWorkout: () => void;
  onSelectQuickExercise: (exerciseName: string) => void;
  onNavigateToWorkouts: () => void;
  onNavigateToProfile: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartMainWorkout,
  onSelectQuickExercise,
  onNavigateToWorkouts,
  onNavigateToProfile,
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 1,
    totalReps: 0,
    totalCalories: 1248,
    averageFormScore: 92,
    dayStreak: 4,
    weekDayActive: [false, false, true, false, false, false, false],
    recentWorkouts: [],
  });

  const [showAllQuickWorkouts, setShowAllQuickWorkouts] = useState<boolean>(false);

  useEffect(() => {
    StorageService.getDashboardStats()
      .then((data) => setStats(data))
      .catch((e) => console.warn('[HomeScreen] Error loading stats:', e));
  }, []);

  const handleStartWorkout = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Fallback
    }
    onStartMainWorkout();
  };

  const handleQuickPlay = (exerciseName: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Fallback
    }
    onSelectQuickExercise(exerciseName);
  };

  const quickExercises = [
    {
      name: 'Pushups',
      subtitle: 'Intermediate • Upper Body',
      icon: 'barbell' as const,
      color: '#10B981',
    },
    {
      name: 'Squats',
      subtitle: 'Beginner • Lower Body',
      icon: 'body' as const,
      color: '#38BDF8',
    },
    {
      name: 'Plank',
      subtitle: 'Beginner • Core & Spine',
      icon: 'timer' as const,
      color: '#F59E0B',
    },
    {
      name: 'Pullups',
      subtitle: 'Advanced • Back & Arms',
      icon: 'trending-up' as const,
      color: '#8B5CF6',
    },
  ];

  const displayedQuickExercises = showAllQuickWorkouts ? quickExercises : quickExercises.slice(0, 2);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Greeting Header */}
        <View style={styles.topHeaderRow}>
          <View>
            <Text style={styles.greetingSub}>Good morning,</Text>
            <Text style={styles.greetingTitle}>Athlete</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={onNavigateToProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="person" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 1. Hero Card: Ready for today's workout? */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>Ready for today's{'\n'}workout?</Text>
              <Text style={styles.heroSubtitle}>
                Train smarter with AI-powered form analysis.
              </Text>
            </View>
            <View style={styles.heroIconCircle}>
              <Ionicons name="pulse" size={28} color="#10B981" />
            </View>
          </View>

          <TouchableOpacity
            style={styles.startWorkoutHeroButton}
            onPress={handleStartWorkout}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.startWorkoutHeroButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Dual Metrics Row (KCAL BURNED + DAY STREAK) */}
        <View style={styles.statsRow}>
          {/* Calories Card */}
          <View style={styles.statCard}>
            <Ionicons name="flame" size={22} color="#F59E0B" style={styles.statIcon} />
            <Text style={styles.statNumber}>
              {stats.totalCalories.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>KCAL BURNED</Text>
          </View>

          {/* Day Streak Card */}
          <View style={styles.statCard}>
            <Ionicons name="flash" size={22} color="#38BDF8" style={styles.statIcon} />
            <Text style={styles.statNumber}>{stats.dayStreak}</Text>
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </View>
        </View>

        {/* 3. Quick Workouts Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick Workouts</Text>
          <TouchableOpacity
            onPress={() => setShowAllQuickWorkouts((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.seeAllText}>
              {showAllQuickWorkouts ? 'Show Less' : 'See All'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickWorkoutsList}>
          {displayedQuickExercises.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.quickWorkoutCard}
              onPress={() => handleQuickPlay(item.name)}
              activeOpacity={0.75}
            >
              <View style={[styles.exerciseIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>

              <View style={styles.exerciseTextColumn}>
                <Text style={styles.exerciseNameText}>{item.name}</Text>
                <Text style={styles.exerciseCategoryText}>{item.subtitle}</Text>
              </View>

              <TouchableOpacity
                style={styles.playButtonCircle}
                onPress={() => handleQuickPlay(item.name)}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* 4. Weekly Progress Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Weekly Progress</Text>
        </View>

        <View style={styles.weeklyProgressCard}>
          <View style={styles.progressHeaderRow}>
            <Text style={styles.progressTitle}>Form Accuracy</Text>
            <Text style={styles.progressPercentText}>{stats.averageFormScore}%</Text>
          </View>

          {/* Progress Bar Track */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, Math.max(10, stats.averageFormScore))}%` },
              ]}
            />
          </View>

          <Text style={styles.progressFooterText}>
            {stats.averageFormScore >= 90
              ? 'Great consistency! Keep it up.'
              : 'Keep practicing to refine joint alignment.'}
          </Text>
        </View>
      </ScrollView>

      {/* Floating Settings/Action Button */}
      <TouchableOpacity
        style={styles.floatingSettingsButton}
        onPress={onNavigateToProfile}
        activeOpacity={0.85}
      >
        <Ionicons name="settings" size={22} color="#FFFFFF" />
      </TouchableOpacity>
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
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingSub: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  greetingTitle: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  avatarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  heroCard: {
    backgroundColor: '#162238',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  heroTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 6,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  heroIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  startWorkoutHeroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 22,
    paddingVertical: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startWorkoutHeroButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#162238',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  statIcon: {
    marginBottom: 8,
  },
  statNumber: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  seeAllText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  quickWorkoutsList: {
    gap: 12,
    marginBottom: 24,
  },
  quickWorkoutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#162238',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  exerciseIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  exerciseTextColumn: {
    flex: 1,
  },
  exerciseNameText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  exerciseCategoryText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  playButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weeklyProgressCard: {
    backgroundColor: '#162238',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
  },
  progressPercentText: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressFooterText: {
    color: '#94A3B8',
    fontSize: 12,
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
