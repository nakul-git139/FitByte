import React, { useState } from 'react';
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
import { MoodCheckInData } from '../types/mood';
import { GeneratedWorkout } from '../types/aiWorkout';

interface TodaysWorkoutScreenProps {
  checkInData: MoodCheckInData | null;
  generatedWorkout?: GeneratedWorkout | null;
  onStartWorkout: (initialExercise?: string) => void;
  onEditCheckIn: () => void;
  onBack?: () => void;
}

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
    reason: `Personalized for your ${checkInData?.mood?.toLowerCase() || 'positive'} mood and energy level (${checkInData?.energyLevel || 3}/5). Balanced strength and mobility flow.`,
    exercises: [
      { name: 'Push-ups', sets: 3, reps: 10, restSeconds: 45 },
      { name: 'Bodyweight Squats', sets: 3, reps: 12, restSeconds: 45 },
      { name: 'Plank Hold', sets: 3, reps: 30, restSeconds: 45 },
    ],
  };

  const handleStart = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Fallback
    }
    const chosenExercise = workout.exercises[selectedExerciseIndex]?.name || 'Pushups';
    onStartWorkout(chosenExercise);
  };

  const handleEdit = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback
    }
    onEditCheckIn();
  };

  const getDifficultyColor = (diff: string) => {
    if (diff === 'intense' || diff === 'hard') return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', icon: 'flame' as const };
    if (diff === 'moderate') return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', icon: 'flash' as const };
    return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38BDF8', icon: 'leaf' as const };
  };

  const diffStyle = getDifficultyColor(workout.difficulty);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {onBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={20} color="#E2E8F0" />
              </TouchableOpacity>
            )}
            <View>
              <View style={styles.badgeRow}>
                <Ionicons name="sparkles" size={13} color="#10B981" />
                <Text style={styles.headerTag}>GEMINI GENERATED PLAN</Text>
              </View>
              <Text style={styles.headerTitle}>Today's Workout</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editPill}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={14} color="#10B981" />
            <Text style={styles.editPillText}>Edit Mood</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Daily Mood & Energy Summary Card */}
        <View style={styles.checkInSummaryCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
              <Text style={styles.cardHeaderTitle}>DAILY CHECK-IN SUMMARY</Text>
            </View>
            <View style={[styles.intensityPill, { backgroundColor: diffStyle.bg }]}>
              <Ionicons name={diffStyle.icon} size={12} color={diffStyle.text} />
              <Text style={[styles.intensityText, { color: diffStyle.text }]}>
                {workout.difficulty.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.summaryStatsRow}>
            {/* Mood Item */}
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemEmoji}>
                {checkInData?.emoji || '😊'}
              </Text>
              <View>
                <Text style={styles.summaryItemLabel}>CURRENT MOOD</Text>
                <Text style={styles.summaryItemValue}>
                  {checkInData?.mood || 'Great'}
                </Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            {/* Energy Item */}
            <View style={styles.summaryItem}>
              <Text style={styles.summaryItemEmoji}>⚡</Text>
              <View>
                <Text style={styles.summaryItemLabel}>ENERGY LEVEL</Text>
                <Text style={styles.summaryItemValue}>
                  {checkInData?.energyLevel ? `${checkInData.energyLevel}/5` : '3/5'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Workout Name & Gemini AI Coaching Reason Card */}
        <View style={styles.routineCard}>
          <View style={styles.routineHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.workoutMainTitle}>{workout.workoutName}</Text>
              <Text style={styles.routineDuration}>⏱ ~{workout.durationMinutes} minutes</Text>
            </View>
          </View>

          {/* Gemini AI Reason Callout */}
          <View style={styles.reasonCard}>
            <View style={styles.reasonHeader}>
              <Ionicons name="bulb-outline" size={16} color="#38BDF8" />
              <Text style={styles.reasonTitle}>WHY THIS WORKOUT</Text>
            </View>
            <Text style={styles.reasonText}>{workout.reason}</Text>
          </View>

          {/* Exercise List */}
          <View style={styles.exerciseSectionHeader}>
            <Text style={styles.exerciseSectionTitle}>EXERCISES IN TODAY'S SESSION</Text>
            <Text style={styles.exerciseSectionSub}>Tap an exercise to start with it</Text>
          </View>

          <View style={styles.exerciseListContainer}>
            {workout.exercises.map((item, idx) => {
              const isSelected = selectedExerciseIndex === idx;
              return (
                <TouchableOpacity
                  key={`${item.name}-${idx}`}
                  style={[
                    styles.exerciseItem,
                    isSelected && styles.exerciseItemSelected,
                  ]}
                  onPress={() => setSelectedExerciseIndex(idx)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.exerciseIndexBadge, isSelected && styles.exerciseIndexBadgeSelected]}>
                    <Text style={[styles.exerciseIndexText, isSelected && styles.exerciseIndexTextSelected]}>
                      {idx + 1}
                    </Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]}>
                      {item.name}
                    </Text>
                    <Text style={styles.exerciseMeta}>
                      {item.sets} Sets × {item.reps} Reps • {item.restSeconds}s Rest
                    </Text>
                  </View>
                  <View style={styles.cameraPill}>
                    <Ionicons name="videocam" size={14} color={isSelected ? '#10B981' : '#64748B'} />
                    <Text style={[styles.cameraPillText, isSelected && styles.cameraPillTextSelected]}>
                      AI Vision
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Real-Time Vision Coaching Notice */}
        <View style={styles.aiFeatureCard}>
          <Ionicons name="sparkles" size={22} color="#38BDF8" />
          <View style={styles.aiFeatureTextContainer}>
            <Text style={styles.aiFeatureTitle}>Ready to start?</Text>
            <Text style={styles.aiFeatureDesc}>
              Position your phone so your full body is visible. Real-time audio form feedback and Gemini Vision will guide each repetition.
            </Text>
          </View>
        </View>

        {/* Bottom CTA: Start Workout */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={styles.startWorkoutButton}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Ionicons name="videocam" size={20} color="#FFFFFF" />
            <Text style={styles.startWorkoutButtonText}>
              Start Workout ({workout.exercises[selectedExerciseIndex]?.name || 'Camera'})
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retakeCheckInButton}
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.retakeCheckInText}>Change Mood Check-In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  headerTag: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  editPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  editPillText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  checkInSummaryCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardHeaderTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  intensityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  intensityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryItemEmoji: {
    fontSize: 26,
  },
  summaryItemLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  summaryItemValue: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '800',
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },
  routineCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 18,
  },
  routineHeader: {
    marginBottom: 12,
  },
  workoutMainTitle: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  routineDuration: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  reasonCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 16,
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  reasonTitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  reasonText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 18,
  },
  exerciseSectionHeader: {
    marginBottom: 10,
  },
  exerciseSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  exerciseSectionSub: {
    color: '#64748B',
    fontSize: 11,
  },
  exerciseListContainer: {
    gap: 10,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  exerciseItemSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  exerciseIndexBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseIndexBadgeSelected: {
    backgroundColor: '#10B981',
  },
  exerciseIndexText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
  exerciseIndexTextSelected: {
    color: '#FFFFFF',
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#F1F5F9',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  exerciseNameSelected: {
    color: '#10B981',
  },
  exerciseMeta: {
    color: '#64748B',
    fontSize: 12,
  },
  cameraPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cameraPillText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  cameraPillTextSelected: {
    color: '#10B981',
  },
  aiFeatureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginBottom: 20,
    gap: 12,
  },
  aiFeatureTextContainer: {
    flex: 1,
  },
  aiFeatureTitle: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  aiFeatureDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  footerSection: {
    gap: 12,
  },
  startWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startWorkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  retakeCheckInButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  retakeCheckInText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
