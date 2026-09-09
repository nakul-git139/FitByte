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

interface ChooseWorkoutScreenProps {
  initialExercise?: string;
  onSelectExerciseAndContinue: (exerciseName: string) => void;
  onBack?: () => void;
  onOpenSettings?: () => void;
}

export const ChooseWorkoutScreen: React.FC<ChooseWorkoutScreenProps> = ({
  initialExercise = 'Pushups',
  onSelectExerciseAndContinue,
  onBack,
  onOpenSettings,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<string>(initialExercise);

  const workoutOptions = [
    {
      id: 'Pushups',
      name: 'Pushups',
      category: 'UPPER BODY STRENGTH',
      difficulty: 'Intermediate',
      description: 'Build upper-body strength while FitByte analyzes your posture and form.',
      icon: 'barbell' as const,
      color: '#10B981',
    },
    {
      id: 'Squats',
      name: 'Squats',
      category: 'LOWER BODY STRENGTH',
      difficulty: 'Beginner',
      description: 'Strengthen your lower body with real-time AI-powered form feedback.',
      icon: 'body' as const,
      color: '#38BDF8',
    },
    {
      id: 'Pullups',
      name: 'Pullups',
      category: 'BACK & BICEPS STRENGTH',
      difficulty: 'Advanced',
      description: 'Master pull-up mechanics with chin-over-bar and lockout tracking.',
      icon: 'trending-up' as const,
      color: '#8B5CF6',
    },
    {
      id: 'Plank',
      name: 'Plank',
      category: 'CORE & SPINE STABILITY',
      difficulty: 'Beginner',
      description: 'Hold a solid straight-line posture while AI monitors hip sagging.',
      icon: 'timer' as const,
      color: '#F59E0B',
    },
    {
      id: 'Lunges',
      name: 'Lunges',
      category: 'UNILATERAL LEG POWER',
      difficulty: 'Intermediate',
      description: 'Target quads and glutes with depth alignment and torso stability.',
      icon: 'footsteps' as const,
      color: '#EC4899',
    },
    {
      id: 'Bicep Curls',
      name: 'Bicep Curls',
      category: 'ARM HYPERTROPHY',
      difficulty: 'Beginner',
      description: 'Isolate arm flexors with full range of motion elbow tracking.',
      icon: 'fitness' as const,
      color: '#06B6D4',
    },
  ];

  const handleSelectCard = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback
    }
    setSelectedExercise(id);
  };

  const handleContinue = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Fallback
    }
    onSelectExerciseAndContinue(selectedExercise);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header & Optional Back Arrow */}
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Choose Your Workout</Text>
          <Text style={styles.subtitle}>
            Select an exercise and let FitByte analyze your form in real time.
          </Text>
        </View>

        {/* Exercise Cards List */}
        <View style={styles.cardsContainer}>
          {workoutOptions.map((item) => {
            const isSelected = selectedExercise === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.exerciseCard,
                  isSelected && styles.exerciseCardSelected,
                ]}
                onPress={() => handleSelectCard(item.id)}
                activeOpacity={0.8}
              >
                {/* Header Row of Card */}
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.exerciseIconBox, { backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)' }]}>
                    <Ionicons name={item.icon} size={22} color={isSelected ? '#10B981' : item.color} />
                  </View>

                  <View style={styles.cardHeaderTextCol}>
                    <Text style={[styles.exerciseName, isSelected && styles.exerciseNameSelected]}>
                      {item.name}
                    </Text>
                    <Text style={styles.exerciseCategory}>{item.category}</Text>
                  </View>

                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                    </View>
                  )}
                </View>

                {/* Difficulty Tag */}
                <View style={styles.difficultyPill}>
                  <Text style={styles.difficultyText}>{item.difficulty}</Text>
                </View>

                {/* Description Text */}
                <Text style={styles.cardDescription}>{item.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom CTA Button */}
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.continueButtonText}>CONTINUE</Text>
        </TouchableOpacity>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#162238',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
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
  cardsContainer: {
    gap: 14,
    marginBottom: 24,
  },
  exerciseCard: {
    backgroundColor: '#162238',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  exerciseCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseIconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardHeaderTextCol: {
    flex: 1,
  },
  exerciseName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  exerciseNameSelected: {
    color: '#10B981',
  },
  exerciseCategory: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  checkBadge: {
    marginLeft: 8,
  },
  difficultyPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  difficultyText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '700',
  },
  cardDescription: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 19,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 24,
    paddingVertical: 16,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
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
