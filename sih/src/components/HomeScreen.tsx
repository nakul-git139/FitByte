import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StorageService, DashboardStats } from '../services/storageService';
import { User } from '../types/auth';
import { Theme } from '../config/theme';

interface HomeScreenProps {
  user?: User | null;
  onStartMainWorkout: () => void;
  onSelectQuickExercise: (exerciseName: string) => void;
  onNavigateToWorkouts: () => void;
  onNavigateToProfile: () => void;
  onScanFood?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onStartMainWorkout,
  onSelectQuickExercise,
  onNavigateToWorkouts,
  onNavigateToProfile,
  onScanFood,
}) => {
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
      .catch((e) => console.warn('[HomeScreen] Error loading stats:', e));
  }, []);

  const handleStartWorkout = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onStartMainWorkout();
  };

  const handleQuickPlay = (exerciseName: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onSelectQuickExercise(exerciseName);
  };

  const quickExercises = [
    {
      name: 'Pushups',
      subtitle: 'Upper body',
      difficulty: 'Intermediate',
      imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Squats',
      subtitle: 'Lower body',
      difficulty: 'Beginner',
      imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Plank',
      subtitle: 'Core & Spine',
      difficulty: 'Beginner',
      imageUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=400&q=80',
    },
    {
      name: 'Bicep Curls',
      subtitle: 'Arms & Power',
      difficulty: 'Beginner',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const displayName = user?.name ? user.name.split(' ')[0] : 'Athlete';

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header: Greeting & Profile */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greetingTitle}>
              Good morning, {displayName} 👋
            </Text>
            <Text style={styles.greetingSub}>Ready to move today?</Text>
          </View>

          <TouchableOpacity
            style={styles.profileAvatarButton}
            onPress={onNavigateToProfile}
            activeOpacity={0.7}
          >
            <Ionicons
              name={user?.authProvider === 'google' ? 'logo-google' : 'person'}
              size={18}
              color={Theme.colors.primaryGreen}
            />
          </TouchableOpacity>
        </View>

        {/* 1. TODAY'S GOAL Hero Card */}
        <View style={styles.heroCardContainer}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80' }}
            style={styles.heroBackground}
            imageStyle={styles.heroBackgroundImage}
          >
            <View style={styles.heroOverlay}>
              <View style={styles.heroTagBadge}>
                <Text style={styles.heroTagText}>TODAY'S GOAL</Text>
              </View>

              <Text style={styles.heroTitle}>Feel stronger.{'\n'}Move better.</Text>

              <TouchableOpacity
                style={styles.startWorkoutButton}
                onPress={handleStartWorkout}
                activeOpacity={0.85}
              >
                <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* 2. YOUR DAY: Dual Metric Cards (Calories + Streak) */}
        <View style={styles.metricsRow}>
          {/* Calories Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconCircle}>
              <Ionicons name="flame" size={20} color="#EA580C" />
            </View>
            <View>
              <Text style={styles.metricValue}>{stats.totalCalories} kcal</Text>
              <Text style={styles.metricLabel}>Calories burned</Text>
            </View>
          </View>

          {/* Streak Card */}
          <View style={styles.metricCard}>
            <View style={styles.metricIconCircle}>
              <Ionicons name="trophy" size={20} color="#D97706" />
            </View>
            <View>
              <Text style={styles.metricValue}>{stats.dayStreak} day streak</Text>
              <Text style={styles.metricLabel}>Consistency</Text>
            </View>
          </View>
        </View>

        {/* 3. AI MEAL CALORIE SCANNER Banner */}
        {onScanFood && (
          <TouchableOpacity
            style={styles.foodScannerBanner}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              } catch {}
              onScanFood();
            }}
            activeOpacity={0.85}
          >
            <View style={styles.foodScannerLeft}>
              <View style={styles.foodScannerTag}>
                <Ionicons name="sparkles" size={12} color={Theme.colors.primaryGreen} />
                <Text style={styles.foodScannerTagText}>GEMINI NUTRITION</Text>
              </View>
              <Text style={styles.foodScannerTitle}>AI Food Calorie Scanner</Text>
              <Text style={styles.foodScannerDesc}>
                Snap your meal to estimate calories, macros & get personalized feedback.
              </Text>
              <View style={styles.foodScannerCta}>
                <Ionicons name="camera" size={15} color="#FFFFFF" />
                <Text style={styles.foodScannerCtaText}>Scan Food</Text>
              </View>
            </View>

            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80' }}
              style={styles.foodScannerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {/* 4. QUICK START Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick Start</Text>
          <TouchableOpacity onPress={onNavigateToWorkouts} activeOpacity={0.7}>
            <Text style={styles.sectionSeeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickStartScroll}
        >
          {quickExercises.map((item) => (
            <TouchableOpacity
              key={item.name}
              style={styles.quickCard}
              onPress={() => handleQuickPlay(item.name)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: item.imageUrl }}
                style={styles.quickCardImage}
                resizeMode="cover"
              />
              <View style={styles.quickCardContent}>
                <Text style={styles.quickCardTitle}>{item.name}</Text>
                <Text style={styles.quickCardSubtitle}>{item.subtitle}</Text>
                <View style={styles.quickCardBottomRow}>
                  <Text style={styles.quickCardDiff}>{item.difficulty}</Text>
                  <View style={styles.playArrowCircle}>
                    <Ionicons name="play" size={12} color="#FFFFFF" style={{ marginLeft: 2 }} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  greetingTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  greetingSub: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  profileAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(31, 107, 79, 0.15)',
  },
  heroCardContainer: {
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.card,
  },
  heroBackground: {
    width: '100%',
    height: 210,
  },
  heroBackgroundImage: {
    borderRadius: Theme.borderRadius.xl,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 26, 0.45)',
    padding: Theme.spacing.lg,
    justifyContent: 'space-between',
  },
  heroTagBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  heroTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.primaryGreen,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm + 2,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.soft,
  },
  startWorkoutButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    gap: 12,
    ...Theme.shadows.soft,
  },
  metricIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  metricLabel: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionSeeAll: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primaryGreen,
    fontWeight: '600',
  },
  quickStartScroll: {
    gap: Theme.spacing.md,
    paddingBottom: Theme.spacing.base,
  },
  quickCard: {
    width: 170,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  quickCardImage: {
    width: '100%',
    height: 110,
    backgroundColor: Theme.colors.surfaceSecondary,
  },
  quickCardContent: {
    padding: Theme.spacing.md,
  },
  quickCardTitle: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  quickCardSubtitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  quickCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  quickCardDiff: {
    fontSize: 10,
    fontWeight: '600',
    color: Theme.colors.primaryGreen,
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  playArrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodScannerBanner: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.card,
  },
  foodScannerLeft: {
    flex: 1,
    padding: Theme.spacing.md,
    justifyContent: 'center',
  },
  foodScannerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.borderRadius.full,
    marginBottom: 6,
  },
  foodScannerTagText: {
    color: Theme.colors.primaryGreenDark,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  foodScannerTitle: {
    fontSize: Theme.typography.sizes.sm + 1,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  foodScannerDesc: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    lineHeight: 16,
    marginBottom: 10,
  },
  foodScannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.primaryGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    alignSelf: 'flex-start',
    ...Theme.shadows.soft,
  },
  foodScannerCtaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  foodScannerImage: {
    width: 110,
    height: '100%',
    minHeight: 140,
  },
});
