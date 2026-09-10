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
import { Theme } from '../config/theme';

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
      category: 'Upper body',
      difficulty: 'Intermediate',
      imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'Squats',
      name: 'Squats',
      category: 'Lower body',
      difficulty: 'Beginner',
      imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'Plank',
      name: 'Plank',
      category: 'Core & Spine',
      difficulty: 'Beginner',
      imageUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'Lunges',
      name: 'Lunges',
      category: 'Lower body',
      difficulty: 'Intermediate',
      imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'Bicep Curls',
      name: 'Bicep Curls',
      category: 'Arms & Power',
      difficulty: 'Beginner',
      imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=400&q=80',
    },
    {
      id: 'Pullups',
      name: 'Pullups',
      category: 'Back & Arms',
      difficulty: 'Advanced',
      imageUrl: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=400&q=80',
    },
  ];

  const handleSelectCard = (id: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedExercise(id);
    onSelectExerciseAndContinue(id);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header */}
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitles}>
            <Text style={styles.mainTitle}>Choose an exercise</Text>
            <Text style={styles.subtitle}>What would you like to work on?</Text>
          </View>
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
                <View style={styles.cardLeftContent}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardCategory}>
                    {item.category} · {item.difficulty}
                  </Text>
                </View>

                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />

                <View style={styles.arrowCircle}>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* "More coming soon" footer card */}
        <View style={styles.comingSoonCard}>
          <Ionicons name="barbell-outline" size={24} color={Theme.colors.primaryGreen} />
          <Text style={styles.comingSoonTitle}>More exercises coming soon</Text>
          <Text style={styles.comingSoonSubtitle}>
            We're working on adding new guided movements and routines for you.
          </Text>
        </View>
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
    marginBottom: Theme.spacing.xl,
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
  headerTitles: {
    flex: 1,
  },
  mainTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  cardsContainer: {
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  exerciseCardSelected: {
    borderColor: Theme.colors.primaryGreen,
    backgroundColor: '#FAFDFB',
  },
  cardLeftContent: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  cardCategory: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceSecondary,
    marginRight: 12,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonCard: {
    backgroundColor: Theme.colors.lightGreen,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    textAlign: 'center',
  },
  comingSoonTitle: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
    marginTop: 8,
  },
  comingSoonSubtitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
