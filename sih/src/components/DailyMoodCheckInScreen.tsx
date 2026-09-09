import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MoodType, MoodOption, MoodCheckInData } from '../types/mood';
import { GeneratedWorkout } from '../types/aiWorkout';
import { WorkoutAiService } from '../services/workoutAiService';
import { StorageService } from '../services/storageService';

const MOOD_OPTIONS: MoodOption[] = [
  { type: 'Great', emoji: '😊', label: 'Great', description: 'Feeling awesome & strong' },
  { type: 'Good', emoji: '🙂', label: 'Good', description: 'Positive & ready to move' },
  { type: 'Okay', emoji: '😐', label: 'Okay', description: 'Balanced & steady' },
  { type: 'Tired', emoji: '😴', label: 'Tired', description: 'Need gentle pacing' },
  { type: 'Low Energy', emoji: '😓', label: 'Low Energy', description: 'Light recovery focus' },
  { type: 'Stressed', emoji: '😤', label: 'Stressed', description: 'Release tension & sweat' },
  { type: 'Motivated', emoji: '🔥', label: 'Motivated', description: 'Ready to crush it' },
];

const ENERGY_LEVELS = [
  { level: 1, label: 'Low', desc: 'Relaxed' },
  { level: 2, label: 'Mild', desc: 'Light' },
  { level: 3, label: 'Moderate', desc: 'Steady' },
  { level: 4, label: 'High', desc: 'Energetic' },
  { level: 5, label: 'Peak', desc: 'Max Power' },
];

interface DailyMoodCheckInScreenProps {
  initialMood?: MoodType;
  initialEnergy?: number;
  onSubmitCheckIn: (data: MoodCheckInData, workout?: GeneratedWorkout) => void;
  onSkip?: () => void;
  onBack?: () => void;
}

export const DailyMoodCheckInScreen: React.FC<DailyMoodCheckInScreenProps> = ({
  initialMood,
  initialEnergy = 3,
  onSubmitCheckIn,
  onSkip,
  onBack,
}) => {
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(initialMood || null);
  const [energyLevel, setEnergyLevel] = useState<number>(initialEnergy);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [historySummary, setHistorySummary] = useState<{
    averageFormScore: number;
    totalSessions: number;
    lastExercise: string;
    historySummaryText: string;
  } | null>(null);

  useEffect(() => {
    StorageService.getRecentFormSummary()
      .then((summary) => setHistorySummary(summary))
      .catch((e) => console.warn('[DailyMoodCheckInScreen] Error reading summary:', e));
  }, []);

  const handleSelectMood = (mood: MoodType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback
    }
    setSelectedMood(mood);
  };

  const handleSelectEnergy = (level: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback
    }
    setEnergyLevel(level);
  };

  const handleCreateWorkout = async () => {
    if (!selectedMood || isGenerating) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Fallback
    }

    const moodObj = MOOD_OPTIONS.find((m) => m.type === selectedMood);
    const checkInData: MoodCheckInData = {
      mood: selectedMood,
      emoji: moodObj ? moodObj.emoji : '😊',
      energyLevel,
      timestamp: new Date(),
    };

    setIsGenerating(true);

    try {
      const generatedWorkout = await WorkoutAiService.generateDailyWorkout(checkInData, {
        workoutHistory: historySummary?.historySummaryText,
        previousFormScores: historySummary
          ? `Average form score: ${historySummary.averageFormScore}% across ${historySummary.totalSessions} sessions. Last exercise: ${historySummary.lastExercise}`
          : undefined,
      });

      setIsGenerating(false);
      onSubmitCheckIn(checkInData, generatedWorkout);
    } catch (err) {
      console.warn('[DailyMoodCheckInScreen] Workout generation error:', err);
      setIsGenerating(false);
      onSubmitCheckIn(checkInData);
    }
  };

  const isButtonEnabled = selectedMood !== null && !isGenerating;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Nav Row */}
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={22} color="#E2E8F0" />
          </TouchableOpacity>
        )}

        {/* Header Badge & Title */}
        <View style={styles.headerSection}>
          <View style={styles.badgePill}>
            <Ionicons name="sparkles" size={14} color="#10B981" />
            <Text style={styles.badgeText}>GEMINI ADAPTIVE COACH</Text>
          </View>

          {historySummary && historySummary.totalSessions > 0 && (
            <View style={styles.historyBadgeRow}>
              <Ionicons name="trophy-outline" size={13} color="#38BDF8" />
              <Text style={styles.historyBadgeText}>
                Session #{historySummary.totalSessions + 1} • Past Avg Form: {historySummary.averageFormScore}%
              </Text>
            </View>
          )}

          <Text style={styles.mainTitle}>How are you feeling today?</Text>
          <Text style={styles.subtitle}>
            Select your mood and energy level so Gemini can customize today's workout.
          </Text>
        </View>

        {/* Mood Selection Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>CHOOSE YOUR MOOD</Text>
          <View style={styles.moodGrid}>
            {MOOD_OPTIONS.map((item) => {
              const isSelected = selectedMood === item.type;
              return (
                <TouchableOpacity
                  key={item.type}
                  style={[
                    styles.moodCard,
                    isSelected && styles.moodCardSelected,
                  ]}
                  onPress={() => handleSelectMood(item.type)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.moodEmoji}>{item.emoji}</Text>
                  <View style={styles.moodTextContainer}>
                    <Text
                      style={[
                        styles.moodLabel,
                        isSelected && styles.moodLabelSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <Text style={styles.moodDesc}>{item.description}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedCheckIcon}>
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Energy Level Scale (1 to 5) */}
        <View style={styles.sectionContainer}>
          <View style={styles.energyHeaderRow}>
            <Text style={styles.sectionLabel}>HOW IS YOUR ENERGY?</Text>
            <Text style={styles.energyValueText}>
              Level {energyLevel}/5 • {ENERGY_LEVELS[energyLevel - 1]?.label}
            </Text>
          </View>

          <View style={styles.energySelectorRow}>
            {ENERGY_LEVELS.map((item) => {
              const isSelected = energyLevel === item.level;
              return (
                <TouchableOpacity
                  key={item.level}
                  style={[
                    styles.energyButton,
                    isSelected && styles.energyButtonSelected,
                  ]}
                  onPress={() => handleSelectEnergy(item.level)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.energyNumber,
                      isSelected && styles.energyNumberSelected,
                    ]}
                  >
                    {item.level}
                  </Text>
                  <Text
                    style={[
                      styles.energyButtonLabel,
                      isSelected && styles.energyButtonLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Bottom CTA Button: Create My Workout */}
        <View style={styles.footerSection}>
          <TouchableOpacity
            style={[
              styles.createWorkoutButton,
              !isButtonEnabled && styles.createWorkoutButtonDisabled,
            ]}
            onPress={handleCreateWorkout}
            disabled={!isButtonEnabled}
            activeOpacity={0.85}
          >
            {isGenerating ? (
              <View style={styles.generatingRow}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.createWorkoutButtonText}>
                  Gemini is crafting workout...
                </Text>
              </View>
            ) : (
              <>
                <Ionicons
                  name="flash"
                  size={20}
                  color={isButtonEnabled ? '#FFFFFF' : '#64748B'}
                />
                <Text
                  style={[
                    styles.createWorkoutButtonText,
                    !isButtonEnabled && styles.createWorkoutButtonTextDisabled,
                  ]}
                >
                  Create My Workout
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={isButtonEnabled ? '#FFFFFF' : '#64748B'}
                />
              </>
            )}
          </TouchableOpacity>

          {onSkip && !isGenerating && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          )}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerSection: {
    marginBottom: 24,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 6,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  historyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  historyBadgeText: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
  },
  mainTitle: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionContainer: {
    marginBottom: 28,
  },
  sectionLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  moodGrid: {
    gap: 10,
  },
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  moodCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  moodEmoji: {
    fontSize: 26,
    marginRight: 14,
  },
  moodTextContainer: {
    flex: 1,
  },
  moodLabel: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  moodLabelSelected: {
    color: '#10B981',
  },
  moodDesc: {
    color: '#64748B',
    fontSize: 12,
  },
  selectedCheckIcon: {
    marginLeft: 8,
  },
  energyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  energyValueText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  energySelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  energyButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  energyButtonSelected: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  energyNumber: {
    color: '#94A3B8',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  energyNumberSelected: {
    color: '#38BDF8',
  },
  energyButtonLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  energyButtonLabelSelected: {
    color: '#38BDF8',
  },
  footerSection: {
    marginTop: 8,
    gap: 12,
  },
  createWorkoutButton: {
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
  createWorkoutButtonDisabled: {
    backgroundColor: '#1E293B',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  createWorkoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  createWorkoutButtonTextDisabled: {
    color: '#64748B',
  },
  generatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
