import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SpeechService } from '../engine/core/SpeechService';
import { StorageService, DashboardStats } from '../services/storageService';
import { User } from '../types/auth';

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
  const [stats, setStats] = useState<DashboardStats>({
    totalWorkouts: 1,
    totalReps: 0,
    totalCalories: 0,
    averageFormScore: 100,
    dayStreak: 4,
    weekDayActive: [false, false, true, false, false, false, false],
    recentWorkouts: [],
  });

  useEffect(() => {
    StorageService.getDashboardStats()
      .then((data) => setStats(data))
      .catch((e) => console.warn('[ProfileScreen] Error loading stats:', e));
  }, []);

  const handleToggleVoice = (value: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Fallback
    }
    setVoiceFeedback(value);
    SpeechService.setMuted(!value);
  };

  const handleToggleHaptics = (value: boolean) => {
    try {
      if (value) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {
      // Fallback
    }
    setHapticFeedback(value);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear Workout History',
      'Are you sure you want to reset your workout history and performance metrics?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearHistory();
            const refreshed = await StorageService.getDashboardStats();
            setStats(refreshed);
            if (onClearHistoryComplete) onClearHistoryComplete();
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your FitByte account?',
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

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Avatar & Profile Header */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Ionicons
              name={user?.authProvider === 'google' ? 'logo-google' : 'person'}
              size={user?.authProvider === 'google' ? 40 : 48}
              color="#10B981"
            />
          </View>
          <Text style={styles.profileName}>
            {user ? user.name.toUpperCase() : 'FITBYTE ATHLETE'}
          </Text>
          <Text style={styles.profileSubtitle}>
            {user ? user.email : 'Guest Athlete • AI-Powered Journey'}
          </Text>
          {user && (
            <View style={styles.providerBadge}>
              <Ionicons
                name={user.authProvider === 'google' ? 'logo-google' : 'shield-checkmark'}
                size={12}
                color={user.authProvider === 'google' ? '#EA4335' : '#10B981'}
              />
              <Text style={styles.providerBadgeText}>
                {user.authProvider === 'google' ? 'Google Account' : 'FitByte Verified'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats Overview Card */}
        <View style={styles.statsSummaryCard}>
          <View style={styles.statColumn}>
            <Text style={styles.statValueNumber}>{stats.totalWorkouts}</Text>
            <Text style={styles.statLabelText}>WORKOUTS</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statValueNumber}>{stats.totalReps}</Text>
            <Text style={styles.statLabelText}>REPS</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statColumn}>
            <Text style={styles.statValueNumberGreen}>{stats.averageFormScore}%</Text>
            <Text style={styles.statLabelText}>AVG FORM</Text>
          </View>
        </View>

        {/* 1. WORKOUT SETTINGS Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>WORKOUT SETTINGS</Text>
          <View style={styles.settingsCard}>
            {/* Voice Feedback */}
            <View style={styles.settingItemRow}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(37, 99, 235, 0.2)' }]}>
                <Ionicons name="volume-high" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.settingItemText}>Voice Feedback</Text>
              <Switch
                value={voiceFeedback}
                onValueChange={handleToggleVoice}
                trackColor={{ false: '#334155', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.cardDivider} />

            {/* Haptic Feedback */}
            <View style={styles.settingItemRow}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
                <Ionicons name="phone-portrait" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.settingItemText}>Haptic Feedback</Text>
              <Switch
                value={hapticFeedback}
                onValueChange={handleToggleHaptics}
                trackColor={{ false: '#334155', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </View>

        {/* 2. APP SETTINGS Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>APP SETTINGS</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItemRow}>
              <View style={[styles.settingIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="moon" size={20} color="#10B981" />
              </View>
              <Text style={styles.settingItemText}>Appearance</Text>
              <Text style={styles.settingValueRight}>Dark Mode</Text>
            </View>
          </View>
        </View>

        {/* 3. ABOUT Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>ABOUT</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItemRow}>
              <Text style={styles.aboutLabelText}>Version</Text>
              <Text style={styles.settingValueRight}>1.0.0</Text>
            </View>

            <View style={styles.cardDivider} />

            <TouchableOpacity
              style={styles.settingItemRow}
              onPress={handleClearHistory}
              activeOpacity={0.7}
            >
              <Text style={styles.clearHistoryText}>Clear Workout History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. ACCOUNT & SESSION Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeader}>ACCOUNT</Text>
          <View style={styles.settingsCard}>
            {user ? (
              <>
                <View style={styles.settingItemRow}>
                  <View style={[styles.settingIconBox, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                    <Ionicons name="mail" size={18} color="#38BDF8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingItemText}>{user.email}</Text>
                    <Text style={styles.settingSubtext}>
                      {user.authProvider === 'google' ? 'Connected via Google' : 'FitByte Password Account'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <TouchableOpacity
                  style={styles.settingItemRow}
                  onPress={handleSignOut}
                  activeOpacity={0.7}
                >
                  <View style={[styles.settingIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                  </View>
                  <Text style={[styles.settingItemText, { color: '#EF4444', fontWeight: '700' }]}>
                    Sign Out
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.settingItemRow}
                onPress={onOpenAuth}
                activeOpacity={0.7}
              >
                <View style={[styles.settingIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Ionicons name="log-in-outline" size={18} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingItemText, { color: '#10B981', fontWeight: '700' }]}>
                    Sign In or Create Account
                  </Text>
                  <Text style={styles.settingSubtext}>
                    Save progress and sync with AI coach
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom FitByte Brand Watermark */}
        <Text style={styles.brandWatermark}>FitByte</Text>
      </ScrollView>

      {/* Floating Settings/Action Button */}
      <TouchableOpacity style={styles.floatingSettingsButton} activeOpacity={0.85}>
        <Ionicons name="settings" size={22} color="#FFFFFF" />
      </TouchableOpacity>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#162238',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    marginBottom: 14,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  profileName: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  profileSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 8,
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    gap: 5,
  },
  providerBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  settingSubtext: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  statsSummaryCard: {
    flexDirection: 'row',
    backgroundColor: '#162238',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 26,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValueNumber: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statValueNumberGreen: {
    color: '#10B981',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabelText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  settingsCard: {
    backgroundColor: '#162238',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingItemText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  settingValueRight: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },
  aboutLabelText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '600',
  },
  clearHistoryText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
    paddingVertical: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  brandWatermark: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
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
