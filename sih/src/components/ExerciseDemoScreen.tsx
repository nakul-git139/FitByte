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
import { Theme } from '../config/theme';
import { getExerciseDemo } from '../config/exerciseDemoData';
import { ExerciseGender } from '../types/exerciseDemo';
import { ExerciseVideoPlayer } from './ExerciseVideoPlayer';

interface ExerciseDemoScreenProps {
  exerciseName: string;
  targetReps?: number;
  initialGender?: ExerciseGender;
  onStartExercise: (exerciseName: string, targetReps?: number) => void;
  onBack: () => void;
}

export const ExerciseDemoScreen: React.FC<ExerciseDemoScreenProps> = ({
  exerciseName,
  targetReps,
  initialGender = 'men',
  onStartExercise,
  onBack,
}) => {
  const [selectedGender, setSelectedGender] = useState<ExerciseGender>(initialGender);
  
  // Resolve exercise demo data mapped to this exercise ID and selected gender
  const demoData = getExerciseDemo(exerciseName, selectedGender);

  const handleStart = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onStartExercise(demoData.name || exerciseName, targetReps);
  };

  const handleGenderChange = (gender: ExerciseGender) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedGender(gender);
  };

  const hasBothGenders = Boolean(demoData.demoVideoMen && demoData.demoVideoWomen);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerTitles}>
          <Text style={styles.headerPretitle}>3D Form Guide</Text>
          <Text style={styles.headerMainTitle} numberOfLines={1}>
            {demoData.name}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.closeButton}
          onPress={onBack}
          activeOpacity={0.7}
          accessibilityLabel="Close Demo"
        >
          <Ionicons name="close" size={20} color={Theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Gender Toggle Selector (if both 3D demo variants exist) */}
        {hasBothGenders && (
          <View style={styles.genderToggleContainer}>
            <TouchableOpacity
              style={[
                styles.genderOption,
                selectedGender === 'men' && styles.genderOptionActive,
              ]}
              onPress={() => handleGenderChange('men')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-outline"
                size={14}
                color={selectedGender === 'men' ? '#FFFFFF' : Theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.genderOptionText,
                  selectedGender === 'men' && styles.genderOptionTextActive,
                ]}
              >
                Men 3D Model
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderOption,
                selectedGender === 'women' && styles.genderOptionActive,
              ]}
              onPress={() => handleGenderChange('women')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-outline"
                size={14}
                color={selectedGender === 'women' ? '#FFFFFF' : Theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.genderOptionText,
                  selectedGender === 'women' && styles.genderOptionTextActive,
                ]}
              >
                Women 3D Model
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3D Video Player Component */}
        <View style={styles.videoPlayerWrapper}>
          <ExerciseVideoPlayer
            source={demoData.demoVideo}
            hasDemoVideo={demoData.hasDemoVideo}
            exerciseName={demoData.name}
            autoPlay={true}
            loop={true}
            onStartExercisePress={handleStart}
          />
        </View>

        {/* Exercise Metadata Chips */}
        <View style={styles.metaRow}>
          <View style={styles.categoryBadge}>
            <Ionicons name="barbell-outline" size={13} color={Theme.colors.primaryGreen} />
            <Text style={styles.categoryBadgeText}>{demoData.category}</Text>
          </View>

          <View style={styles.difficultyBadge}>
            <Ionicons name="speedometer-outline" size={13} color="#D97706" />
            <Text style={styles.difficultyBadgeText}>{demoData.difficulty}</Text>
          </View>

          {targetReps && (
            <View style={styles.targetRepsBadge}>
              <Ionicons name="repeat-outline" size={13} color={Theme.colors.info} />
              <Text style={styles.targetRepsBadgeText}>Target: {targetReps} reps</Text>
            </View>
          )}
        </View>

        {/* Target Muscles */}
        {demoData.targetMuscles && demoData.targetMuscles.length > 0 && (
          <View style={styles.targetMusclesSection}>
            <Text style={styles.sectionSubtitle}>TARGET MUSCLES</Text>
            <View style={styles.musclesWrap}>
              {demoData.targetMuscles.map((muscle, index) => (
                <View key={`muscle-${index}`} style={styles.muscleChip}>
                  <Text style={styles.muscleChipText}>{muscle}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* How to Perform - Step-by-Step Instructions */}
        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <View style={styles.sectionIconBox}>
              <Ionicons name="list-outline" size={18} color={Theme.colors.primaryGreen} />
            </View>
            <Text style={styles.cardSectionTitle}>How to Perform</Text>
          </View>

          <View style={styles.instructionsList}>
            {demoData.instructions.map((step, index) => (
              <View key={`step-${index}`} style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepInstructionText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Form Coaching & Breathing Tips */}
        {demoData.breathingCue && (
          <View style={styles.breathingCard}>
            <View style={styles.breathingHeaderRow}>
              <Ionicons name="fitness-outline" size={16} color={Theme.colors.primaryGreenDark} />
              <Text style={styles.breathingTitle}>Breathing & Form Rhythm</Text>
            </View>
            <Text style={styles.breathingText}>{demoData.breathingCue}</Text>
          </View>
        )}

        {/* Common Mistakes to Avoid */}
        {demoData.commonMistakes && demoData.commonMistakes.length > 0 && (
          <View style={styles.mistakesCard}>
            <View style={styles.mistakesHeaderRow}>
              <Ionicons name="warning-outline" size={16} color="#D97706" />
              <Text style={styles.mistakesTitle}>Common Mistakes to Avoid</Text>
            </View>
            <View style={styles.mistakesList}>
              {demoData.commonMistakes.map((mistake, index) => (
                <View key={`mistake-${index}`} style={styles.mistakeItem}>
                  <Text style={styles.mistakeBullet}>•</Text>
                  <Text style={styles.mistakeText}>{mistake}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Real-time AI Tracking Notice */}
        <View style={styles.aiNoticeCard}>
          <Ionicons name="sparkles" size={18} color={Theme.colors.primaryGreen} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiNoticeTitle}>Real-time AI Guidance</Text>
            <Text style={styles.aiNoticeSubtitle}>
              FitPilot will track your joint angles and rep cadence using on-device computer vision during the workout.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.startExerciseButton}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.startExerciseButtonText}>Start Exercise</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xs,
    paddingBottom: Theme.spacing.sm,
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
    marginRight: Theme.spacing.md,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginLeft: Theme.spacing.md,
  },
  headerTitles: {
    flex: 1,
  },
  headerPretitle: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
    color: Theme.colors.primaryGreen,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerMainTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xs,
    paddingBottom: Theme.spacing.xxxl * 2,
  },
  genderToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: Theme.borderRadius.full,
    padding: 3,
    marginBottom: Theme.spacing.md,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
  },
  genderOptionActive: {
    backgroundColor: Theme.colors.primaryGreen,
    ...Theme.shadows.soft,
  },
  genderOptionText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  genderOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  videoPlayerWrapper: {
    marginBottom: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    ...Theme.shadows.card,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Theme.spacing.base,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    gap: 5,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.primaryGreenDark,
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    gap: 5,
  },
  difficultyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  targetRepsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    gap: 5,
  },
  targetRepsBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  targetMusclesSection: {
    marginBottom: Theme.spacing.lg,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  musclesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleChip: {
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  muscleChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.colors.textPrimary,
  },
  cardSection: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.base,
    ...Theme.shadows.soft,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
    gap: 8,
  },
  sectionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSectionTitle: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  instructionsList: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNumberBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepInstructionText: {
    flex: 1,
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    lineHeight: 20,
  },
  breathingCard: {
    backgroundColor: Theme.colors.lightGreen,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.base,
  },
  breathingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  breathingTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breathingText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textPrimary,
    lineHeight: 20,
  },
  mistakesCard: {
    backgroundColor: '#FFFBEB',
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: Theme.spacing.base,
  },
  mistakesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  mistakesTitle: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mistakesList: {
    gap: 6,
  },
  mistakeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  mistakeBullet: {
    fontSize: 14,
    color: '#B45309',
    lineHeight: 18,
  },
  mistakeText: {
    flex: 1,
    fontSize: Theme.typography.sizes.xs,
    color: '#78350F',
    lineHeight: 18,
  },
  aiNoticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.base,
  },
  aiNoticeTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  aiNoticeSubtitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  bottomBar: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.base,
    backgroundColor: Theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderSubtle,
  },
  startExerciseButton: {
    backgroundColor: Theme.colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.elevated,
  },
  startExerciseButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
  },
});
