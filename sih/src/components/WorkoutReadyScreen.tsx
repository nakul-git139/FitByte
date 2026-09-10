import React from 'react';
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

interface WorkoutReadyScreenProps {
  exerciseName: string;
  category?: string;
  difficulty?: string;
  targetReps?: number;
  onStartWorkout: () => void;
  onChangeExercise: () => void;
  onBack?: () => void;
}

const EXERCISE_PHOTOS: Record<string, string> = {
  pushups: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80',
  squats: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=600&q=80',
  plank: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=600&q=80',
  bicepcurls: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80',
  pullups: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=600&q=80',
  lunges: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
};

export const WorkoutReadyScreen: React.FC<WorkoutReadyScreenProps> = ({
  exerciseName,
  category = 'Upper body',
  difficulty = 'Intermediate',
  targetReps,
  onStartWorkout,
  onChangeExercise,
  onBack,
}) => {
  const getPhoto = (name: string) => {
    const norm = (name || '').toLowerCase().replace(/[^a-z]/g, '');
    for (const key of Object.keys(EXERCISE_PHOTOS)) {
      if (norm.includes(key) || key.includes(norm)) {
        return EXERCISE_PHOTOS[key];
      }
    }
    return EXERCISE_PHOTOS.pushups;
  };

  const handleStart = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onStartWorkout();
  };

  const checklistItems = [
    {
      icon: 'body-outline' as const,
      title: 'Position yourself',
      desc: 'Place your full body inside the camera frame',
    },
    {
      icon: 'sunny-outline' as const,
      title: 'Lighting',
      desc: 'Make sure the workout area is well lit',
    },
    {
      icon: 'phone-portrait-outline' as const,
      title: 'Device stability',
      desc: 'Keep your phone propped upright against a wall',
    },
    {
      icon: 'checkmark-circle-outline' as const,
      title: 'Follow form cues',
      desc: 'Listen to real-time audio guidance as you move',
    },
  ];

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
            </TouchableOpacity>
          )}
          <View style={styles.headerTitles}>
            <Text style={styles.mainTitle}>Get Ready</Text>
            <Text style={styles.subtitle}>Let's prepare for your workout.</Text>
          </View>
        </View>

        {/* Selected Exercise Hero Card */}
        <View style={styles.exerciseBannerCard}>
          <Image
            source={{ uri: getPhoto(exerciseName) }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <View>
              <Text style={styles.bannerName}>{exerciseName}</Text>
              <Text style={styles.bannerCategory}>
                {category} · {difficulty}
                {targetReps ? ` · Target: ${targetReps} reps` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Preparation Checklist */}
        <View style={styles.checklistCard}>
          <Text style={styles.checklistHeader}>BEFORE YOU START</Text>

          <View style={styles.checklistItemsList}>
            {checklistItems.map((item, index) => (
              <View key={`check-${index}`} style={styles.checkItem}>
                <View style={styles.checkIconBox}>
                  <Ionicons name={item.icon} size={20} color={Theme.colors.primaryGreen} />
                </View>
                <View style={styles.checkTextCol}>
                  <Text style={styles.checkTitle}>{item.title}</Text>
                  <Text style={styles.checkDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Form Coach Callout */}
        <View style={styles.coachBanner}>
          <View style={styles.coachIconCircle}>
            <Ionicons name="sparkles" size={16} color={Theme.colors.primaryGreen} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.coachBannerTitle}>FitPilot Form Coach</Text>
            <Text style={styles.coachBannerText}>Ready to guide your movement in real time.</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsCol}>
          <TouchableOpacity
            style={styles.startWorkoutButton}
            onPress={handleStart}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.startWorkoutButtonText}>Start Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.changeExerciseButton}
            onPress={onChangeExercise}
            activeOpacity={0.7}
          >
            <Text style={styles.changeExerciseButtonText}>Change Exercise</Text>
          </TouchableOpacity>
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
  exerciseBannerCard: {
    width: '100%',
    height: 180,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.card,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 28, 26, 0.45)',
    padding: Theme.spacing.lg,
    justifyContent: 'flex-end',
  },
  bannerName: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bannerCategory: {
    fontSize: Theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontWeight: '500',
  },
  checklistCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.soft,
  },
  checklistHeader: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Theme.spacing.md,
  },
  checklistItemsList: {
    gap: Theme.spacing.base,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTextCol: {
    flex: 1,
  },
  checkTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  checkDesc: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  coachBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Theme.colors.lightGreen,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    marginBottom: Theme.spacing.xl,
  },
  coachIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachBannerTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
  },
  coachBannerText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.primaryGreenDark,
    marginTop: 2,
  },
  actionButtonsCol: {
    gap: Theme.spacing.sm,
  },
  startWorkoutButton: {
    backgroundColor: Theme.colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.elevated,
  },
  startWorkoutButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
  },
  changeExerciseButton: {
    paddingVertical: Theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeExerciseButtonText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
});
