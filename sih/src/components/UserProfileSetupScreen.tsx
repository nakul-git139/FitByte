import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { UserFitnessProfile, Gender } from '../types/user';
import { StorageService } from '../services/storageService';
import { Theme } from '../config/theme';

interface UserProfileSetupScreenProps {
  initialProfile?: UserFitnessProfile;
  onSaveProfile: (profile: UserFitnessProfile) => void;
  onCancel?: () => void;
  isInitialSetup?: boolean;
}

const GENDER_OPTIONS: {
  id: Gender;
  label: string;
  sublabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  imageUrl: string;
}[] = [
  {
    id: 'male',
    label: 'Male (Men)',
    sublabel: 'Strength & athletic conditioning',
    icon: 'male',
    imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80',
  },
  {
    id: 'female',
    label: 'Female (Women)',
    sublabel: 'Tone, endurance & core power',
    icon: 'female',
    imageUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
  },
];

const FITNESS_GOALS = [
  {
    id: 'Muscle Building & Hypertrophy',
    label: 'Muscle Building',
    desc: 'Targeted progressive overload for muscle volume',
    icon: 'barbell-outline',
  },
  {
    id: 'Fat Loss & Calorie Burn',
    label: 'Fat Loss & Calorie Burn',
    desc: 'High-tempo kinetic output & conditioning',
    icon: 'flame-outline',
  },
  {
    id: 'Athletic Stamina & Conditioning',
    label: 'Athletic Stamina',
    desc: 'Functional full-body power & endurance',
    icon: 'flash-outline',
  },
  {
    id: 'Mobility & Core Strength',
    label: 'Mobility & Core',
    desc: 'Joint health, spine alignment & core bracing',
    icon: 'body-outline',
  },
];

const AGE_CHIPS = [18, 22, 26, 30, 35, 45, 55];
const HEIGHT_CHIPS = [155, 165, 172, 178, 185, 192];
const WEIGHT_CHIPS = [52, 60, 68, 75, 85, 95, 110];

export const UserProfileSetupScreen: React.FC<UserProfileSetupScreenProps> = ({
  initialProfile,
  onSaveProfile,
  onCancel,
  isInitialSetup = false,
}) => {
  const [selectedGender, setSelectedGender] = useState<Gender>(initialProfile?.gender || 'male');
  const [age, setAge] = useState<number>(initialProfile?.age || 24);
  const [heightCm, setHeightCm] = useState<number>(initialProfile?.heightCm || 175);
  const [weightKg, setWeightKg] = useState<number>(initialProfile?.weightKg || 70);
  const [fitnessGoal, setFitnessGoal] = useState<string>(
    initialProfile?.fitnessGoal || 'Muscle Building & Hypertrophy'
  );
  const [experienceLevel, setExperienceLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>(
    initialProfile?.experienceLevel || 'Intermediate'
  );
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Dynamic BMI Calculation
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : '22.9';
  const bmiNum = parseFloat(bmi);
  let bmiCategory = 'Normal / Athletic';
  let bmiColor = Theme.colors.primaryGreen;
  if (bmiNum < 18.5) {
    bmiCategory = 'Lean / Underweight';
    bmiColor = '#38BDF8';
  } else if (bmiNum >= 25 && bmiNum < 30) {
    bmiCategory = 'Overweight / Muscular';
    bmiColor = '#F59E0B';
  } else if (bmiNum >= 30) {
    bmiCategory = 'High Calorie Density';
    bmiColor = '#EF4444';
  }

  const handleGenderSelect = (gender: Gender) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setSelectedGender(gender);
  };

  const handleStepAge = (delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setAge((prev) => Math.max(14, Math.min(95, prev + delta)));
  };

  const handleStepHeight = (delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setHeightCm((prev) => Math.max(100, Math.min(230, prev + delta)));
  };

  const handleStepWeight = (delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setWeightKg((prev) => Math.max(30, Math.min(250, prev + delta)));
  };

  const handleSave = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setIsSaving(true);

    const profile: UserFitnessProfile = {
      gender: selectedGender,
      age,
      heightCm,
      weightKg,
      fitnessGoal,
      experienceLevel,
      updatedAt: new Date().toISOString(),
    };

    await StorageService.saveUserProfile(profile);
    setIsSaving(false);
    onSaveProfile(profile);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.headerBar}>
          {onCancel && (
            <TouchableOpacity style={styles.backButton} onPress={onCancel} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
            </TouchableOpacity>
          )}

          {isInitialSetup && (
            <View style={styles.stepBadge}>
              <Ionicons name="sparkles" size={14} color={Theme.colors.primaryGreen} />
              <Text style={styles.stepBadgeText}>Welcome to FitPilot • First-Time Setup</Text>
            </View>
          )}

          <View style={styles.headerTitleGroup}>
            <Text style={styles.screenTitle}>
              {isInitialSetup ? 'Personalize Your AI Coach' : 'Fitness Profile & Biometrics'}
            </Text>
            <Text style={styles.screenSubtitle}>
              {isInitialSetup
                ? 'Tell us your basic details so Google Gemini AI can calculate your exact workout difficulty, set/rep ranges, and calorie burn from day one.'
                : 'Google Gemini AI uses your gender, age, height & weight to calibrate exact workout volume, joint angles & calories.'}
            </Text>
          </View>
        </View>

        {/* SECTION 1: GENDER SELECTION (With Photos for Men & Women) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="people" size={18} color={Theme.colors.primaryGreen} />
            <Text style={styles.sectionTitle}>1. Choose Gender</Text>
          </View>
          <Text style={styles.sectionHint}>
            Used by Gemini AI to calibrate recovery rates, muscle mass distribution, and center of mass mechanics.
          </Text>

          <View style={styles.genderGrid}>
            {GENDER_OPTIONS.map((opt) => {
              const isSelected = selectedGender === opt.id;
              return (
                <TouchableOpacity
                  key={`gender-${opt.id}`}
                  style={[
                    styles.genderCard,
                    isSelected && styles.genderCardSelected,
                  ]}
                  onPress={() => handleGenderSelect(opt.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.genderImageWrapper}>
                    <Image
                      source={{ uri: opt.imageUrl }}
                      style={styles.genderImage}
                      resizeMode="cover"
                    />
                    <View style={styles.genderImageOverlay} />

                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={22} color={Theme.colors.primaryGreen} />
                      </View>
                    )}

                    <View style={styles.genderIconBadge}>
                      <Ionicons
                        name={opt.icon}
                        size={16}
                        color={isSelected ? Theme.colors.primaryGreen : '#FFFFFF'}
                      />
                    </View>
                  </View>

                  <View style={styles.genderCardInfo}>
                    <Text style={[styles.genderCardLabel, isSelected && styles.genderLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.genderCardSublabel}>{opt.sublabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* SECTION 2: BIOMETRICS (Age, Height, Weight & Live BMI) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="stats-chart" size={18} color={Theme.colors.primaryGreen} />
            <Text style={styles.sectionTitle}>2. Biometrics & Body Stats</Text>
          </View>

          {/* Age Selector */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperLabelRow}>
              <Text style={styles.stepperTitle}>Age</Text>
              <Text style={styles.stepperValueText}>{age} <Text style={{ fontSize: 13, color: Theme.colors.textMuted }}>years</Text></Text>
            </View>

            <View style={styles.stepperControlRow}>
              <TouchableOpacity style={styles.stepButton} onPress={() => handleStepAge(-1)}>
                <Ionicons name="remove" size={18} color={Theme.colors.textPrimary} />
              </TouchableOpacity>

              <TextInput
                style={styles.stepperInput}
                keyboardType="number-pad"
                value={String(age)}
                onChangeText={(t) => {
                  const val = parseInt(t.replace(/[^0-9]/g, ''), 10);
                  if (!isNaN(val)) setAge(Math.max(10, Math.min(100, val)));
                }}
              />

              <TouchableOpacity style={styles.stepButton} onPress={() => handleStepAge(1)}>
                <Ionicons name="add" size={18} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick Age Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {AGE_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={`age-chip-${chip}`}
                  style={[styles.quickChip, age === chip && styles.quickChipActive]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setAge(chip);
                  }}
                >
                  <Text style={[styles.quickChipText, age === chip && styles.quickChipTextActive]}>
                    {chip}y
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.divider} />

          {/* Height Selector */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperLabelRow}>
              <Text style={styles.stepperTitle}>Height</Text>
              <Text style={styles.stepperValueText}>{heightCm} <Text style={{ fontSize: 13, color: Theme.colors.textMuted }}>cm</Text></Text>
            </View>

            <View style={styles.stepperControlRow}>
              <TouchableOpacity style={styles.stepButton} onPress={() => handleStepHeight(-1)}>
                <Ionicons name="remove" size={18} color={Theme.colors.textPrimary} />
              </TouchableOpacity>

              <TextInput
                style={styles.stepperInput}
                keyboardType="number-pad"
                value={String(heightCm)}
                onChangeText={(t) => {
                  const val = parseInt(t.replace(/[^0-9]/g, ''), 10);
                  if (!isNaN(val)) setHeightCm(Math.max(100, Math.min(240, val)));
                }}
              />

              <TouchableOpacity style={styles.stepButton} onPress={() => handleStepHeight(1)}>
                <Ionicons name="add" size={18} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick Height Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {HEIGHT_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={`height-chip-${chip}`}
                  style={[styles.quickChip, heightCm === chip && styles.quickChipActive]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setHeightCm(chip);
                  }}
                >
                  <Text style={[styles.quickChipText, heightCm === chip && styles.quickChipTextActive]}>
                    {chip} cm
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.divider} />

          {/* Weight Selector */}
          <View style={styles.stepperContainer}>
            <View style={styles.stepperLabelRow}>
              <Text style={styles.stepperTitle}>Weight</Text>
              <Text style={styles.stepperValueText}>{weightKg} <Text style={{ fontSize: 13, color: Theme.colors.textMuted }}>kg</Text></Text>
            </View>

            <View style={styles.stepperControlRow}>
              <TouchableOpacity style={styles.stepButton} onPress={() => handleStepWeight(-1)}>
                <Ionicons name="remove" size={18} color={Theme.colors.textPrimary} />
              </TouchableOpacity>

              <TextInput
                style={styles.stepperInput}
                keyboardType="number-pad"
                value={String(weightKg)}
                onChangeText={(t) => {
                  const val = parseInt(t.replace(/[^0-9]/g, ''), 10);
                  if (!isNaN(val)) setWeightKg(Math.max(30, Math.min(250, val)));
                }}
              />

              <TouchableOpacity style={styles.stepButton} onPress={() => handleStepWeight(1)}>
                <Ionicons name="add" size={18} color={Theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Quick Weight Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {WEIGHT_CHIPS.map((chip) => (
                <TouchableOpacity
                  key={`weight-chip-${chip}`}
                  style={[styles.quickChip, weightKg === chip && styles.quickChipActive]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setWeightKg(chip);
                  }}
                >
                  <Text style={[styles.quickChipText, weightKg === chip && styles.quickChipTextActive]}>
                    {chip} kg
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Live BMI Summary Badge */}
          <View style={styles.bmiCard}>
            <View style={styles.bmiLeft}>
              <Text style={styles.bmiLabel}>BODY MASS INDEX</Text>
              <Text style={[styles.bmiValue, { color: bmiColor }]}>BMI {bmi}</Text>
            </View>
            <View style={[styles.bmiBadge, { backgroundColor: Theme.colors.lightGreen }]}>
              <Text style={[styles.bmiCategoryText, { color: bmiColor }]}>{bmiCategory}</Text>
            </View>
          </View>
        </View>

        {/* SECTION 3: PRIMARY FITNESS GOAL */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trophy" size={18} color={Theme.colors.primaryGreen} />
            <Text style={styles.sectionTitle}>3. Primary Fitness Goal</Text>
          </View>

          <View style={styles.goalsList}>
            {FITNESS_GOALS.map((goal) => {
              const isSelected = fitnessGoal === goal.id;
              return (
                <TouchableOpacity
                  key={`goal-${goal.id}`}
                  style={[styles.goalItem, isSelected && styles.goalItemSelected]}
                  onPress={() => {
                    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
                    setFitnessGoal(goal.id);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.goalIconCircle, isSelected && styles.goalIconCircleSelected]}>
                    <Ionicons
                      name={goal.icon as any}
                      size={20}
                      color={isSelected ? '#FFFFFF' : Theme.colors.primaryGreen}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
                      {goal.label}
                    </Text>
                    <Text style={styles.goalDesc}>{goal.desc}</Text>
                  </View>

                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={Theme.colors.primaryGreen} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Save & Apply Button */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.saveButtonText}>
                {isInitialSetup ? 'Complete Setup & Start AI Coaching' : 'Save & Apply to AI Coach'}
              </Text>
              <Ionicons
                name={isInitialSetup ? 'rocket-outline' : 'sparkles'}
                size={18}
                color="#FFFFFF"
                style={{ marginLeft: 6 }}
              />
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
  headerBar: {
    marginBottom: Theme.spacing.lg,
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(31, 107, 79, 0.2)',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
    letterSpacing: 0.3,
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
    marginBottom: Theme.spacing.sm,
  },
  headerTitleGroup: {
    gap: 4,
  },
  screenTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: Theme.typography.sizes.xs + 1,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.soft,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  sectionHint: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textMuted,
    lineHeight: 16,
    marginBottom: Theme.spacing.md,
  },
  genderGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  genderCard: {
    flex: 1,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.surfaceSecondary,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderCardSelected: {
    borderColor: Theme.colors.primaryGreen,
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.card,
  },
  genderImageWrapper: {
    width: '100%',
    height: 140,
    position: 'relative',
  },
  genderImage: {
    width: '100%',
    height: '100%',
  },
  genderImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(28, 28, 26, 0.35)',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  genderIconBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  genderCardInfo: {
    padding: 10,
  },
  genderCardLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  genderLabelSelected: {
    color: Theme.colors.primaryGreenDark,
  },
  genderCardSublabel: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 14,
  },
  stepperContainer: {
    marginVertical: 4,
  },
  stepperLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepperTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  stepperValueText: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '800',
    color: Theme.colors.primaryGreenDark,
  },
  stepperControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  stepButton: {
    width: 42,
    height: 42,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  stepperInput: {
    flex: 1,
    height: 42,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceSecondary,
    textAlign: 'center',
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  chipsRow: {
    gap: 6,
    paddingVertical: 4,
  },
  quickChip: {
    backgroundColor: Theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  quickChipActive: {
    backgroundColor: Theme.colors.primaryGreen,
    borderColor: Theme.colors.primaryGreen,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  quickChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Theme.colors.borderSubtle,
    marginVertical: 12,
  },
  bmiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceSecondary,
    padding: 12,
    borderRadius: Theme.borderRadius.lg,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  bmiLeft: {
    gap: 2,
  },
  bmiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.textMuted,
    letterSpacing: 0.5,
  },
  bmiValue: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '800',
  },
  bmiBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
  },
  bmiCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  goalsList: {
    gap: 8,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Theme.borderRadius.lg,
    backgroundColor: Theme.colors.surfaceSecondary,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  goalItemSelected: {
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.primaryGreen,
    ...Theme.shadows.soft,
  },
  goalIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalIconCircleSelected: {
    backgroundColor: Theme.colors.primaryGreen,
  },
  goalLabel: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  goalLabelSelected: {
    color: Theme.colors.primaryGreenDark,
  },
  goalDesc: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: Theme.colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.elevated,
    marginTop: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
  },
});
