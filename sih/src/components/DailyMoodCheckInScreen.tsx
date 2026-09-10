import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MoodType, MoodOption, MoodCheckInData } from '../types/mood';
import { GeneratedWorkout } from '../types/aiWorkout';
import { UserFitnessProfile } from '../types/user';
import { WorkoutAiService } from '../services/workoutAiService';
import { StorageService } from '../services/storageService';
import { Theme } from '../config/theme';

const MOOD_OPTIONS: MoodOption[] = [
  { type: 'Great', emoji: '😊', label: 'Great', description: 'Feeling strong & energized' },
  { type: 'Okay', emoji: '😐', label: 'Okay', description: 'Balanced & steady pace' },
  { type: 'Tired', emoji: '😴', label: 'Tired', description: 'Gentle recovery & mobility' },
];

const SECONDARY_MOODS: MoodOption[] = [
  { type: 'Motivated', emoji: '🔥', label: 'Motivated', description: 'Ready to crush it' },
  { type: 'Stressed', emoji: '😤', label: 'Stressed', description: 'Release tension & sweat' },
  { type: 'Low Energy', emoji: '😓', label: 'Low Energy', description: 'Light movement' },
];

const DURATION_PRESETS = [
  { minutes: 15, label: '15 min' },
  { minutes: 20, label: '20 min' },
  { minutes: 25, label: '25 min' },
  { minutes: 30, label: '30 min' },
  { minutes: 45, label: '45 min' },
];

interface DailyMoodCheckInScreenProps {
  initialMood?: MoodType;
  initialEnergy?: number;
  onSubmitCheckIn: (data: MoodCheckInData, workout?: GeneratedWorkout) => void;
  onSkip?: () => void;
  onBack?: () => void;
  onOpenProfileSetup?: () => void;
}

export const DailyMoodCheckInScreen: React.FC<DailyMoodCheckInScreenProps> = ({
  initialMood = 'Great',
  initialEnergy = 4,
  onSubmitCheckIn,
  onSkip,
  onBack,
  onOpenProfileSetup,
}) => {
  const [selectedMood, setSelectedMood] = useState<MoodType>(initialMood);
  const [energyLevel, setEnergyLevel] = useState<number>(initialEnergy);
  const [durationMinutes, setDurationMinutes] = useState<number>(25);
  const [isCustomDuration, setIsCustomDuration] = useState<boolean>(false);
  const [customInputText, setCustomInputText] = useState<string>('25');
  const [showMoreMoods, setShowMoreMoods] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserFitnessProfile | null>(null);
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

    StorageService.getUserProfile()
      .then((p) => {
        if (p) setUserProfile(p);
      })
      .catch((e) => console.warn('[DailyMoodCheckInScreen] Error reading profile:', e));
  }, []);

  const handleSelectMood = (mood: MoodType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedMood(mood);
  };

  const handleSelectEnergy = (level: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setEnergyLevel(level);
  };

  const handleSelectPreset = (mins: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsCustomDuration(false);
    setDurationMinutes(mins);
    setCustomInputText(String(mins));
  };

  const handleSelectCustom = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsCustomDuration(true);
  };

  const handleStepDuration = (delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsCustomDuration(true);
    const nextVal = Math.max(5, Math.min(120, durationMinutes + delta));
    setDurationMinutes(nextVal);
    setCustomInputText(String(nextVal));
  };

  const handleCustomInputChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setCustomInputText(cleaned);
    if (cleaned.length > 0) {
      const num = parseInt(cleaned, 10);
      if (!isNaN(num)) {
        const clamped = Math.max(1, Math.min(120, num));
        setDurationMinutes(clamped);
      }
    }
  };

  const handleCustomInputBlur = () => {
    const num = parseInt(customInputText, 10);
    const safe = isNaN(num) || num < 5 ? 5 : Math.min(120, num);
    setDurationMinutes(safe);
    setCustomInputText(String(safe));
  };

  const handleCreateWorkout = async () => {
    if (!selectedMood || isGenerating) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const safeDurationMinutes = Math.max(5, Math.min(120, Number(durationMinutes) || 25));
    const allOptions = [...MOOD_OPTIONS, ...SECONDARY_MOODS];
    const moodObj = allOptions.find((m) => m.type === selectedMood);
    const checkInData: MoodCheckInData = {
      mood: selectedMood,
      emoji: moodObj ? moodObj.emoji : '😊',
      energyLevel,
      durationMinutes: safeDurationMinutes,
      timestamp: new Date(),
    };

    setIsGenerating(true);

    try {
      const generated = await WorkoutAiService.generateDailyWorkout(checkInData, {
        gender: userProfile?.gender,
        age: userProfile?.age,
        height: userProfile?.heightCm ? `${userProfile.heightCm} cm` : undefined,
        weight: userProfile?.weightKg ? `${userProfile.weightKg} kg` : undefined,
        fitnessGoal: userProfile?.fitnessGoal,
        experienceLevel: userProfile?.experienceLevel,
        workoutHistory: historySummary?.historySummaryText || undefined,
        previousFormScores: historySummary?.averageFormScore ? `Average form score: ${historySummary.averageFormScore}%` : undefined,
      });

      setIsGenerating(false);
      onSubmitCheckIn(checkInData, generated);
    } catch (e) {
      console.warn('[DailyMoodCheckInScreen] Error generating workout:', e);
      setIsGenerating(false);
      // Fallback structured plan calibrated with biometrics
      const genderLabel = userProfile?.gender === 'female' ? "Women's" : "Men's";
      const goalDesc = userProfile?.fitnessGoal ? ` • ${userProfile.fitnessGoal.split(' ')[0]}` : '';
      onSubmitCheckIn(checkInData, {
        workoutName: `${genderLabel} ${selectedMood} Flow${goalDesc}`,
        durationMinutes: safeDurationMinutes,
        difficulty: energyLevel >= 4 ? 'intense' : energyLevel >= 3 ? 'moderate' : 'light',
        reason: `Personalized ${safeDurationMinutes}-min routine calibrated for ${userProfile?.gender || 'athlete'} (${userProfile?.age || 24}y, ${userProfile?.weightKg || 70}kg) matching your ${selectedMood.toLowerCase()} state and energy level ${energyLevel}/5.`,
        exercises: [
          { name: 'Push-ups', sets: 3, reps: energyLevel >= 4 ? 12 : 10, restSeconds: 45 },
          { name: 'Bodyweight Squats', sets: 3, reps: energyLevel >= 4 ? 15 : 12, restSeconds: 45 },
          { name: 'Plank Hold', sets: 3, reps: energyLevel >= 4 ? 45 : 30, restSeconds: 45 },
        ],
      });
    }
  };

  const allDisplayedMoods = showMoreMoods ? [...MOOD_OPTIONS, ...SECONDARY_MOODS] : MOOD_OPTIONS;

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Row */}
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
            </TouchableOpacity>
          )}

          {onSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.7}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>How are you feeling today?</Text>
          <Text style={styles.subtitle}>
            Your check-in helps FitPilot recommend a better workout for you.
          </Text>
        </View>

        {/* Biometrics Calibration Badge */}
        {userProfile && (
          <TouchableOpacity
            style={styles.biometricBadgeCard}
            onPress={onOpenProfileSetup}
            activeOpacity={0.8}
          >
            <View style={styles.biometricBadgeLeft}>
              <View style={styles.biometricIconBox}>
                <Ionicons
                  name={userProfile.gender === 'female' ? 'female' : 'male'}
                  size={16}
                  color={Theme.colors.primaryGreen}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.biometricTitle}>
                    {userProfile.gender === 'female' ? 'Female (Women)' : 'Male (Men)'}, {userProfile.age}y
                  </Text>
                  <View style={styles.biometricGoalDot} />
                  <Text style={styles.biometricSub}>
                    {userProfile.heightCm}cm · {userProfile.weightKg}kg
                  </Text>
                </View>
                <Text style={styles.biometricGoalText} numberOfLines={1}>
                  Target: {userProfile.fitnessGoal}
                </Text>
              </View>
            </View>
            <View style={styles.biometricEditPill}>
              <Ionicons name="options-outline" size={13} color={Theme.colors.primaryGreen} />
              <Text style={styles.biometricEditText}>Change</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* 1. Mood Cards (😊 Great, 😐 Okay, 😴 Tired) */}
        <View style={styles.moodGrid}>
          {allDisplayedMoods.map((option) => {
            const isSelected = selectedMood === option.type;
            return (
              <TouchableOpacity
                key={option.type}
                style={[
                  styles.moodCard,
                  isSelected && styles.moodCardSelected,
                ]}
                onPress={() => handleSelectMood(option.type)}
                activeOpacity={0.8}
              >
                <Text style={styles.moodEmoji}>{option.emoji}</Text>
                <Text style={[styles.moodLabel, isSelected && styles.moodLabelSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* More Moods Toggle */}
        <TouchableOpacity
          style={styles.moreMoodsButton}
          onPress={() => setShowMoreMoods((prev) => !prev)}
          activeOpacity={0.7}
        >
          <Text style={styles.moreMoodsText}>
            {showMoreMoods ? 'Show fewer moods' : 'More mood options'}
          </Text>
          <Ionicons
            name={showMoreMoods ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={Theme.colors.primaryGreen}
          />
        </TouchableOpacity>

        {/* 2. Energy Slider (Low ───●─── High) */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionLabel}>How's your energy?</Text>
            <Text style={styles.energyValueText}>{energyLevel} / 5</Text>
          </View>

          <View style={styles.energySelector}>
            {[1, 2, 3, 4, 5].map((lvl) => {
              const isActive = energyLevel >= lvl;
              const isCurrent = energyLevel === lvl;
              return (
                <TouchableOpacity
                  key={`energy-${lvl}`}
                  style={[
                    styles.energyStep,
                    isActive && styles.energyStepActive,
                    isCurrent && styles.energyStepCurrent,
                  ]}
                  onPress={() => handleSelectEnergy(lvl)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.energyStepNumber, isActive && styles.energyStepNumberActive]}>
                    {lvl}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.energyLabelsRow}>
            <Text style={styles.energyLabelSub}>Low</Text>
            <Text style={styles.energyLabelSub}>Moderate</Text>
            <Text style={styles.energyLabelSub}>High</Text>
          </View>
        </View>

        {/* 3. Duration Selector */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.sectionLabel}>Workout Duration</Text>
            <Text style={styles.durationValueText}>{durationMinutes} min</Text>
          </View>

          {/* Preset & Custom Pills Row */}
          <View style={styles.presetRow}>
            {DURATION_PRESETS.map((preset) => {
              const isSelected = !isCustomDuration && durationMinutes === preset.minutes;
              return (
                <TouchableOpacity
                  key={preset.minutes}
                  style={[
                    styles.presetPill,
                    isSelected && styles.presetPillSelected,
                  ]}
                  onPress={() => handleSelectPreset(preset.minutes)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.presetText, isSelected && styles.presetTextSelected]}>
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom Time Pill */}
            <TouchableOpacity
              style={[
                styles.presetPill,
                styles.customPresetPill,
                isCustomDuration && styles.presetPillSelected,
              ]}
              onPress={handleSelectCustom}
              activeOpacity={0.8}
            >
              <Ionicons
                name="timer-outline"
                size={14}
                color={isCustomDuration ? '#FFFFFF' : Theme.colors.primaryGreen}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.presetText, isCustomDuration && styles.presetTextSelected]}>
                Custom
              </Text>
            </TouchableOpacity>
          </View>

          {/* Custom Duration Interactive Stepper */}
          {isCustomDuration && (
            <View style={styles.customDurationBox}>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => handleStepDuration(-5)}
                  activeOpacity={0.7}
                  accessibilityLabel="Decrease duration by 5 minutes"
                >
                  <Ionicons name="remove" size={20} color={Theme.colors.textPrimary} />
                </TouchableOpacity>

                <View style={styles.stepperInputContainer}>
                  <TextInput
                    style={styles.stepperTextInput}
                    value={customInputText}
                    onChangeText={handleCustomInputChange}
                    onBlur={handleCustomInputBlur}
                    keyboardType="number-pad"
                    maxLength={3}
                    selectTextOnFocus
                  />
                  <Text style={styles.stepperUnitText}>minutes</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperButton}
                  onPress={() => handleStepDuration(5)}
                  activeOpacity={0.7}
                  accessibilityLabel="Increase duration by 5 minutes"
                >
                  <Ionicons name="add" size={20} color={Theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Quick Custom Time Chips */}
              <View style={styles.quickChipsRow}>
                {[10, 35, 50, 60].map((mins) => (
                  <TouchableOpacity
                    key={`quick-${mins}`}
                    style={[
                      styles.quickChip,
                      durationMinutes === mins && styles.quickChipActive,
                    ]}
                    onPress={() => handleSelectPreset(mins)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        durationMinutes === mins && styles.quickChipTextActive,
                      ]}
                    >
                      {mins}m
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleStepDuration(5)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>+5m</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickChip}
                  onPress={() => handleStepDuration(10)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>+10m</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.durationCoachNote}>
                {durationMinutes <= 10
                  ? '⚡ Express Activation — short, focused session to activate your body.'
                  : durationMinutes <= 20
                  ? '🌱 Steady Consistency — balanced volume without accumulating fatigue.'
                  : durationMinutes <= 35
                  ? '🔥 Optimal Volume — full-body conditioning across key movement patterns.'
                  : '🏆 High Capacity Mastery — progressive overload and endurance.'}
              </Text>
            </View>
          )}
        </View>

        {/* 4. Empathetic Coach Quote */}
        <View style={styles.coachQuoteCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={18} color={Theme.colors.primaryGreen} style={{ marginTop: 2 }} />
          <Text style={styles.coachQuoteText}>
            “Let's find the right workout for today.”
          </Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleCreateWorkout}
          disabled={isGenerating}
          activeOpacity={0.85}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
            </>
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
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
  skipButton: {
    marginLeft: 'auto',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  titleSection: {
    marginBottom: Theme.spacing.xl,
  },
  mainTitle: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.base,
    color: Theme.colors.textSecondary,
    marginTop: 6,
    lineHeight: 22,
  },
  moodGrid: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  moodCard: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  moodCardSelected: {
    borderColor: Theme.colors.primaryGreen,
    backgroundColor: Theme.colors.lightGreen,
  },
  moodEmoji: {
    fontSize: 34,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  moodLabelSelected: {
    color: Theme.colors.primaryGreenDark,
  },
  moreMoodsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Theme.spacing.xs,
    marginBottom: Theme.spacing.lg,
  },
  moreMoodsText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.primaryGreen,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.soft,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  sectionLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  energyValueText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.primaryGreen,
  },
  energySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  energyStep: {
    flex: 1,
    height: 44,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyStepActive: {
    backgroundColor: Theme.colors.lightGreen,
  },
  energyStepCurrent: {
    backgroundColor: Theme.colors.primaryGreen,
  },
  energyStepNumber: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  energyStepNumberActive: {
    color: '#FFFFFF',
  },
  energyLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  energyLabelSub: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '500',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  durationValueText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.primaryGreen,
  },
  customPresetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(31, 107, 79, 0.25)',
  },
  customDurationBox: {
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderSubtle,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
    gap: 12,
  },
  stepperButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  stepperInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceSecondary,
    height: 48,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: Theme.colors.primaryGreen,
    gap: 6,
  },
  stepperTextInput: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.primaryGreenDark,
    textAlign: 'center',
    minWidth: 44,
  },
  stepperUnitText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Theme.spacing.sm,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  quickChipActive: {
    backgroundColor: Theme.colors.lightGreen,
    borderColor: Theme.colors.primaryGreen,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  quickChipTextActive: {
    color: Theme.colors.primaryGreenDark,
  },
  durationCoachNote: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
    fontStyle: 'italic',
  },
  presetPill: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surfaceSecondary,
  },
  presetPillSelected: {
    backgroundColor: Theme.colors.primaryGreen,
  },
  presetText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  presetTextSelected: {
    color: '#FFFFFF',
  },
  coachQuoteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Theme.colors.lightGreen,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    marginVertical: Theme.spacing.md,
  },
  coachQuoteText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.primaryGreenDark,
    fontWeight: '600',
    flex: 1,
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: Theme.colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    marginTop: Theme.spacing.sm,
    ...Theme.shadows.elevated,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
  },
  biometricBadgeCard: {
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
  biometricBadgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  biometricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  biometricGoalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.textMuted,
  },
  biometricSub: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  biometricGoalText: {
    fontSize: 10,
    color: Theme.colors.primaryGreenDark,
    fontWeight: '600',
    marginTop: 2,
  },
  biometricEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    marginLeft: 8,
  },
  biometricEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
  },
});
