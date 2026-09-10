import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SpeechService } from '../engine/core/SpeechService';
import { StorageService, DashboardStats } from '../services/storageService';
import { User } from '../types/auth';
import { UserFitnessProfile } from '../types/user';
import { FitPilotLogo } from './FitPilotLogo';
import { Theme } from '../config/theme';

interface ProfileScreenProps {
  user?: User | null;
  onClearHistoryComplete?: () => void;
  onSignOut?: () => void;
  onOpenAuth?: () => void;
  onEditProfile?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onClearHistoryComplete,
  onSignOut,
  onOpenAuth,
  onEditProfile,
}) => {
  const [voiceFeedback, setVoiceFeedback] = useState<boolean>(true);
  const [hapticFeedback, setHapticFeedback] = useState<boolean>(true);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [fitnessProfile, setFitnessProfile] = useState<UserFitnessProfile>({
    gender: 'male',
    age: 24,
    heightCm: 175,
    weightKg: 70,
    fitnessGoal: 'Muscle Building & Hypertrophy',
    experienceLevel: 'Intermediate',
  });
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
      .catch((e) => console.warn('[ProfileScreen] Error loading stats:', e));

    StorageService.getUserProfile()
      .then((p) => {
        if (p) setFitnessProfile(p);
      })
      .catch((e) => console.warn('[ProfileScreen] Error loading profile:', e));
  }, []);

  const handleToggleVoice = (value: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setVoiceFeedback(value);
    SpeechService.setMuted(!value);
  };

  const handleToggleHaptics = (value: boolean) => {
    try {
      if (value) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}
    setHapticFeedback(value);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your FitPilot account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => {
            if (onSignOut) onSignOut();
          },
        },
      ]
    );
  };

  const displayName = user?.name ? user.name : 'FitPilot Athlete';

  // Calculate BMI
  const heightM = fitnessProfile.heightCm / 100;
  const bmi = heightM > 0 ? (fitnessProfile.weightKg / (heightM * heightM)).toFixed(1) : '22.9';

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Avatar & Profile Header */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Ionicons
              name={user?.authProvider === 'google' ? 'logo-google' : (fitnessProfile.gender === 'female' ? 'woman' : 'man')}
              size={36}
              color={Theme.colors.primaryGreen}
            />
          </View>

          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileTagline}>Building a stronger everyday you.</Text>
          {user?.email && (
            <Text style={styles.profileEmail}>{user.email}</Text>
          )}
        </View>

        {/* 2. Stat Pills Row (Day streak | Workouts | Avg form) */}
        <View style={styles.statPillsRow}>
          <View style={styles.statPillCard}>
            <Text style={styles.statPillValue}>{stats.dayStreak}</Text>
            <Text style={styles.statPillLabel}>Day streak</Text>
          </View>

          <View style={styles.statPillCard}>
            <Text style={styles.statPillValue}>{stats.totalWorkouts}</Text>
            <Text style={styles.statPillLabel}>Workouts</Text>
          </View>

          <View style={styles.statPillCard}>
            <Text style={[styles.statPillValue, { color: Theme.colors.primaryGreen }]}>
              {stats.totalWorkouts > 0 ? `${stats.averageFormScore}%` : '—'}
            </Text>
            <Text style={styles.statPillLabel}>Avg form</Text>
          </View>
        </View>

        {/* 3. Fitness Profile & Biometrics Card */}
        <View style={styles.biometricsCard}>
          <View style={styles.biometricsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.biometricsIconPill}>
                <Ionicons
                  name={fitnessProfile.gender === 'female' ? 'female' : 'male'}
                  size={16}
                  color={Theme.colors.primaryGreen}
                />
              </View>
              <Text style={styles.biometricsTitle}>Biometrics & AI Calibration</Text>
            </View>

            {onEditProfile && (
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={onEditProfile}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={14} color={Theme.colors.primaryGreen} />
                <Text style={styles.editProfileButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.biometricsGrid}>
            <View style={styles.biometricGridItem}>
              <Text style={styles.biometricGridLabel}>Gender</Text>
              <Text style={styles.biometricGridValue}>
                {fitnessProfile.gender === 'female' ? 'Female' : 'Male'}
              </Text>
            </View>

            <View style={styles.biometricGridItem}>
              <Text style={styles.biometricGridLabel}>Age</Text>
              <Text style={styles.biometricGridValue}>{fitnessProfile.age} yrs</Text>
            </View>

            <View style={styles.biometricGridItem}>
              <Text style={styles.biometricGridLabel}>Height</Text>
              <Text style={styles.biometricGridValue}>{fitnessProfile.heightCm} cm</Text>
            </View>

            <View style={styles.biometricGridItem}>
              <Text style={styles.biometricGridLabel}>Weight</Text>
              <Text style={styles.biometricGridValue}>{fitnessProfile.weightKg} kg</Text>
            </View>
          </View>

          <View style={styles.biometricFooterRow}>
            <View style={styles.goalTagBadge}>
              <Ionicons name="trophy-outline" size={12} color={Theme.colors.primaryGreen} />
              <Text style={styles.goalTagText}>{fitnessProfile.fitnessGoal}</Text>
            </View>

            <View style={styles.bmiTagBadge}>
              <Text style={styles.bmiTagText}>BMI {bmi}</Text>
            </View>
          </View>
        </View>

        {/* 4. Settings Menu Section */}
        <View style={styles.menuCard}>
          {/* Workout Preferences */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Workout Preferences', 'Adjust rest periods and target rep defaults in your routines.')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="options-outline" size={20} color={Theme.colors.textPrimary} />
              <Text style={styles.menuItemText}>Workout preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Theme.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* Voice Feedback Toggle */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="volume-high-outline" size={20} color={Theme.colors.textPrimary} />
              <Text style={styles.menuItemText}>Voice feedback</Text>
            </View>
            <Switch
              value={voiceFeedback}
              onValueChange={handleToggleVoice}
              trackColor={{ false: Theme.colors.borderSubtle, true: Theme.colors.primaryGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.menuDivider} />

          {/* Haptic Feedback Toggle */}
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="phone-portrait-outline" size={20} color={Theme.colors.textPrimary} />
              <Text style={styles.menuItemText}>Haptic feedback</Text>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={handleToggleHaptics}
              trackColor={{ false: Theme.colors.borderSubtle, true: Theme.colors.primaryGreen }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.menuDivider} />

          {/* Appearance */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => Alert.alert('Appearance', 'FitPilot is currently optimized with the Warm Minimal theme.')}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="contrast-outline" size={20} color={Theme.colors.textPrimary} />
              <Text style={styles.menuItemText}>Appearance</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.menuItemValue}>Warm Minimal</Text>
              <Ionicons name="chevron-forward" size={16} color={Theme.colors.textMuted} />
            </View>
          </TouchableOpacity>

          <View style={styles.menuDivider} />

          {/* About FitPilot */}
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.7}
            onPress={() => setShowAboutModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={20} color={Theme.colors.textPrimary} />
              <Text style={styles.menuItemText}>About FitPilot</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* 4. Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={Theme.colors.error} style={{ marginRight: 6 }} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* About FitPilot Modal */}
      <Modal
        visible={showAboutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.aboutModalOverlay}>
          <View style={styles.aboutModalCard}>
            <FitPilotLogo size="small" />

            <Text style={styles.aboutModalTitle}>FitPilot</Text>
            <Text style={styles.aboutModalTagline}>Your Personal AI Fitness Coach</Text>

            <Text style={styles.aboutModalBody}>
              FitPilot helps users train smarter by combining personalized workouts with real-time form guidance and progress tracking.
            </Text>

            <View style={styles.aboutVersionBadge}>
              <Text style={styles.aboutVersionText}>Version 1.0.0 • AI Coach v2.4</Text>
            </View>

            <TouchableOpacity
              style={styles.aboutCloseButton}
              onPress={() => setShowAboutModal(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.aboutCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  avatarSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginBottom: 12,
    ...Theme.shadows.card,
  },
  profileName: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  profileTagline: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    marginTop: 3,
  },
  profileEmail: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textMuted,
    marginTop: 4,
  },
  statPillsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.xl,
  },
  statPillCard: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  statPillValue: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  statPillLabel: {
    fontSize: 10,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  biometricsCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.xl,
    ...Theme.shadows.soft,
  },
  biometricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  biometricsIconPill: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricsTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
  },
  editProfileButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
  },
  biometricsGrid: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  biometricGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  biometricGridLabel: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  biometricGridValue: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  biometricFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  goalTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    flex: 1,
  },
  goalTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  bmiTagBadge: {
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  bmiTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
  },
  menuCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    overflow: 'hidden',
    marginBottom: Theme.spacing.xl,
    ...Theme.shadows.soft,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.base,
    paddingHorizontal: Theme.spacing.base,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  menuItemValue: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: Theme.colors.borderSubtle,
    marginLeft: 48,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  signOutButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.error,
  },
  aboutModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 26, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  aboutModalCard: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    ...Theme.shadows.elevated,
  },
  aboutModalTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginTop: 8,
  },
  aboutModalTagline: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.primaryGreen,
    fontWeight: '700',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  aboutModalBody: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: Theme.spacing.md,
    lineHeight: 20,
  },
  aboutVersionBadge: {
    backgroundColor: Theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    marginTop: Theme.spacing.base,
  },
  aboutVersionText: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
  aboutCloseButton: {
    width: '100%',
    backgroundColor: Theme.colors.primaryGreen,
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: Theme.spacing.xl,
  },
  aboutCloseButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
  },
});
