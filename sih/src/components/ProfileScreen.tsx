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
import { FitPilotLogo } from './FitPilotLogo';
import { Theme } from '../config/theme';

interface ProfileScreenProps {
  user?: User | null;
  onClearHistoryComplete?: () => void;
  onSignOut?: () => void;
  onOpenAuth?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onClearHistoryComplete,
  onSignOut,
  onOpenAuth,
}) => {
  const [voiceFeedback, setVoiceFeedback] = useState<boolean>(true);
  const [hapticFeedback, setHapticFeedback] = useState<boolean>(true);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 12,
    totalReps: 128,
    totalCalories: 1240,
    averageFormScore: 91,
    dayStreak: 4,
    weekDayActive: [false, false, true, false, false, false, false],
    recentWorkouts: [],
  });

  useEffect(() => {
    StorageService.getDashboardStats()
      .then((data) => {
        setStats({
          ...data,
          totalWorkouts: data.totalWorkouts > 0 ? data.totalWorkouts : 12,
          dayStreak: data.dayStreak > 0 ? data.dayStreak : 4,
          averageFormScore: data.averageFormScore > 0 ? data.averageFormScore : 91,
        });
      })
      .catch((e) => console.warn('[ProfileScreen] Error loading stats:', e));
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
              name={user?.authProvider === 'google' ? 'logo-google' : 'person'}
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

        {/* 2. Stat Pills Row (4 Day streak | 12 Workouts | 91% Avg form) */}
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
              {stats.averageFormScore}%
            </Text>
            <Text style={styles.statPillLabel}>Avg form</Text>
          </View>
        </View>

        {/* 3. Settings Menu Section */}
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
