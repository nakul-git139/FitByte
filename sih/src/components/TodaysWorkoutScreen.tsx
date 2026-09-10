import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MoodCheckInData } from '../types/mood';
import { GeneratedWorkout } from '../types/aiWorkout';
import { Theme } from '../config/theme';

interface TodaysWorkoutScreenProps {
  checkInData: MoodCheckInData | null;
  generatedWorkout?: GeneratedWorkout | null;
  onStartWorkout: (initialExercise?: string, targetReps?: number) => void;
  onEditCheckIn: () => void;
  onBack?: () => void;
}

const EXERCISE_PHOTOS: Record<string, string> = {
  pushups: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=400&q=80',
  squats: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=400&q=80',
  plank: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=400&q=80',
  bicepcurls: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=400&q=80',
  pullups: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=400&q=80',
  lunges: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
  jumpingjacks: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80',
  mountainclimbers: 'https://images.unsplash.com/photo-1434682881908-b43d0467b798?auto=format&fit=crop&w=400&q=80',
};

export const TodaysWorkoutScreen: React.FC<TodaysWorkoutScreenProps> = ({
  checkInData,
  generatedWorkout,
  onStartWorkout,
  onEditCheckIn,
  onBack,
}) => {
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number>(0);

  const workout = generatedWorkout || {
    workoutName: 'Balanced Full Body Conditioning',
    durationMinutes: 25,
    difficulty: 'moderate' as const,
    reason: `Personalized for your ${checkInData?.mood?.toLowerCase() || 'positive'} mood and energy level (${checkInData?.energyLevel || 4}/5). Balanced strength and mobility flow.`,
    exercises: [
      { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 },
      { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
      { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 },
    ],
  };

  const handleStart = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    const chosenObj = workout.exercises[selectedExerciseIndex];
    const chosenExercise = chosenObj?.name || 'Pushups';
    const chosenReps = chosenObj?.reps;
    onStartWorkout(chosenExercise, chosenReps);
  };

  const handleEdit = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onEditCheckIn();
  };

  const getPhotoForExercise = (name: string) => {
    const norm = (name || '').toLowerCase().replace(/[^a-z]/g, '');
    for (const key of Object.keys(EXERCISE_PHOTOS)) {
      if (norm.includes(key) || key.includes(norm)) {
        return EXERCISE_PHOTOS[key];
      }
    }
    return EXERCISE_PHOTOS.pushups;
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitles}>
            <Text style={styles.mainTitle}>Today's Workout</Text>
            <Text style={styles.durationSubtitle}>
              {workout.durationMinutes} min · {workout.difficulty ? workout.difficulty.charAt(0).toUpperCase() + workout.difficulty.slice(1) : 'Moderate'}
            </Text>
          </View>
          <TouchableOpacity style={styles.settingsButton} onPress={handleEdit} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={20} color={Theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* 1. Check-in Reflection Pill */}
        <View style={styles.reflectionCard}>
          <Text style={styles.reflectionHeader}>Based on how you're feeling today:</Text>
          <View style={styles.reflectionBadges}>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeEmoji}>{checkInData?.emoji || '😊'}</Text>
              <Text style={styles.badgeText}>Feeling {checkInData?.mood?.toLowerCase() || 'good'}</Text>
            </View>
            <View style={styles.badgeDivider} />
            <View style={styles.badgeItem}>
              <Ionicons name="flash" size={14} color="#F59E0B" />
              <Text style={styles.badgeText}>Energy {checkInData?.energyLevel || 4}/5</Text>
            </View>
          </View>
        </View>

        {/* 2. YOUR PLAN: Numbered Exercise List */}
        <View style={styles.planSection}>
          <Text style={styles.sectionTitle}>YOUR PLAN</Text>

          <View style={styles.exerciseList}>
            {workout.exercises.map((item, idx) => {
              const isSelected = selectedExerciseIndex === idx;
              const isPlank = item.name.toLowerCase().includes('plank');
              const repDisplay = isPlank
                ? `${item.sets || 3} × ${item.reps || 30} sec`
                : `${item.sets || 3} × ${item.reps || 10}`;

              return (
                <TouchableOpacity
                  key={`${item.name}-${idx}`}
                  style={[
                    styles.exerciseCard,
                    isSelected && styles.exerciseCardSelected,
                  ]}
                  onPress={() => setSelectedExerciseIndex(idx)}
                  activeOpacity={0.8}
                >
                  <View style={styles.exerciseNumberCircle}>
                    <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
                  </View>

                  <Image
                    source={{ uri: getPhotoForExercise(item.name) }}
                    style={styles.exerciseThumb}
                  />

                  <View style={styles.exerciseTextCol}>
                    <Text style={styles.exerciseName}>{item.name}</Text>
                    <Text style={styles.exerciseReps}>{repDisplay}</Text>
                  </View>

                  {isSelected && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. FitPilot Coach Insight Card */}
        <View style={styles.coachCard}>
          <View style={styles.coachHeaderRow}>
            <Ionicons name="sparkles" size={16} color={Theme.colors.primaryGreen} />
            <Text style={styles.coachTitle}>FitPilot Coach</Text>
          </View>
          <Text style={styles.coachQuote}>
            “{workout.reason || 'Today looks like a good day for a balanced workout.'}”
          </Text>
        </View>

        {/* Start Workout CTA */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.startButtonText}>Start Workout</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  headerTitles: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  mainTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  durationSubtitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  reflectionCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.xl,
    ...Theme.shadows.soft,
  },
  reflectionHeader: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reflectionBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeEmoji: {
    fontSize: 16,
  },
  badgeText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  badgeDivider: {
    width: 1,
    height: 16,
    backgroundColor: Theme.colors.borderSubtle,
  },
  planSection: {
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Theme.spacing.md,
  },
  exerciseList: {
    gap: Theme.spacing.md,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  exerciseCardSelected: {
    borderColor: Theme.colors.primaryGreen,
    backgroundColor: '#FAFDFB',
  },
  exerciseNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  exerciseNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  exerciseThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: Theme.colors.surfaceSecondary,
  },
  exerciseTextCol: {
    flex: 1,
  },
  exerciseName: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  exerciseReps: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachCard: {
    backgroundColor: Theme.colors.lightGreen,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.xl,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  coachTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coachQuote: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  startButton: {
    backgroundColor: Theme.colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.elevated,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
  },
});
