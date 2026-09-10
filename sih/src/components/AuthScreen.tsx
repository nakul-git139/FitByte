import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AuthService } from '../services/authService';
import { User } from '../types/auth';
import { FitPilotLogo } from './FitPilotLogo';
import { Theme } from '../config/theme';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
  onContinueAsGuest: () => void;
}

type AuthMode = 'login' | 'register';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onAuthSuccess,
  onContinueAsGuest,
}) => {
  const [showEmailForm, setShowEmailForm] = useState<boolean>(false);
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [showGoogleModal, setShowGoogleModal] = useState<boolean>(false);
  const [googleEmailInput, setGoogleEmailInput] = useState<string>('');
  const [googleNameInput, setGoogleNameInput] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTabSwitch = (newMode: AuthMode) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setMode(newMode);
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    if (mode === 'register' && !name.trim()) {
      setErrorMessage('Please enter your full name');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      let res;
      if (mode === 'register') {
        res = await AuthService.register(name, email, password);
      } else {
        res = await AuthService.login(email, password);
      }

      setIsLoading(false);
      if (res.success && res.user) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        onAuthSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please try again.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'An unexpected error occurred');
    }
  };

  const executeGoogleAuth = async (targetEmail: string, targetName?: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Please enter a valid Gmail address');
      return;
    }

    const cleanName = (targetName && targetName.trim().length > 0)
      ? targetName.trim()
      : cleanEmail.split('@')[0];

    setShowGoogleModal(false);
    setIsGoogleLoading(true);
    setErrorMessage(null);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    try {
      const res = await AuthService.loginWithGoogle({
        idToken: `mock_google_${cleanEmail}`,
        userInfo: {
          id: `google_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: cleanEmail,
          name: cleanName,
          picture: 'https://lh3.googleusercontent.com/a/default-user',
        },
      });

      setIsGoogleLoading(false);
      if (res.success && res.user) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        onAuthSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Google Sign-In failed');
      }
    } catch (err: any) {
      setIsGoogleLoading(false);
      setErrorMessage(err.message || 'Google Sign-In error');
    }
  };

  const handleGoogleSignIn = () => {
    if (email.trim().length > 0 && email.includes('@')) {
      executeGoogleAuth(email, name);
    } else {
      setGoogleEmailInput(email.trim());
      setGoogleNameInput(name.trim());
      setShowGoogleModal(true);
    }
  };

  const handleGuest = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onContinueAsGuest();
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* FitPilot Brand Header */}
          <View style={styles.brandHeader}>
            <FitPilotLogo size="medium" />
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>
              Continue your fitness journey.
            </Text>
          </View>

          {/* Error Message Pill */}
          {errorMessage && (
            <View style={styles.errorPill}>
              <Ionicons name="alert-circle" size={16} color={Theme.colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Primary Authentication Buttons */}
          <View style={styles.authButtonsContainer}>
            {/* 1. Continue with Google */}
            <TouchableOpacity
              style={styles.socialAuthButton}
              onPress={handleGoogleSignIn}
              disabled={isGoogleLoading}
              activeOpacity={0.8}
            >
              {isGoogleLoading ? (
                <ActivityIndicator size="small" color={Theme.colors.primaryGreen} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
                  <Text style={styles.socialAuthButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* 2. Continue as Guest */}
            <TouchableOpacity
              style={styles.guestAuthButton}
              onPress={handleGuest}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={18} color={Theme.colors.textPrimary} style={{ marginRight: 10 }} />
              <Text style={styles.guestAuthButtonText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>

          {/* Clean Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* 3. Sign in with Email Toggle / Collapsible Form */}
          {!showEmailForm ? (
            <TouchableOpacity
              style={styles.emailToggleCard}
              onPress={() => setShowEmailForm(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="mail-outline" size={18} color={Theme.colors.textSecondary} style={{ marginRight: 10 }} />
              <Text style={styles.emailToggleText}>Sign in with Email</Text>
              <Ionicons name="chevron-forward" size={16} color={Theme.colors.textMuted} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ) : (
            <View style={styles.emailFormCard}>
              {/* Tab Selector: Login vs Register */}
              <View style={styles.tabSelector}>
                <TouchableOpacity
                  style={[styles.tabButton, mode === 'login' && styles.tabButtonActive]}
                  onPress={() => handleTabSwitch('login')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabButtonText, mode === 'login' && styles.tabButtonTextActive]}>
                    Sign In
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tabButton, mode === 'register' && styles.tabButtonActive]}
                  onPress={() => handleTabSwitch('register')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabButtonText, mode === 'register' && styles.tabButtonTextActive]}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Name Input (Register mode only) */}
              {mode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={18} color={Theme.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Alex Rivera"
                      placeholderTextColor={Theme.colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={Theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="alex@example.com"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={Theme.colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={Theme.colors.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((prev) => !prev)}
                    style={styles.passwordToggle}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={Theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {mode === 'login' ? 'Sign In to FitPilot' : 'Create Account'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Legal / Terms Footer */}
          <View style={styles.legalFooter}>
            <Text style={styles.legalText}>
              By continuing, you agree to our{' '}
              <Text style={styles.legalLink}>Terms of Service</Text> and{' '}
              <Text style={styles.legalLink}>Privacy Policy</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Google Sign-In Input Modal */}
      <Modal
        visible={showGoogleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGoogleModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.googleModalOverlay}
        >
          <View style={styles.googleModalCard}>
            <View style={styles.googleModalHeader}>
              <Ionicons name="logo-google" size={24} color="#EA4335" />
              <Text style={styles.googleModalTitle}>Sign in with Google</Text>
              <TouchableOpacity
                onPress={() => setShowGoogleModal(false)}
                style={styles.googleModalClose}
              >
                <Ionicons name="close" size={20} color={Theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.googleModalSubtitle}>
              Connect your Google account with FitPilot to personalize workouts and track progress.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Google Account Name</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={Theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Alex Rivera"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={googleNameInput}
                  onChangeText={setGoogleNameInput}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gmail Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={Theme.colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="alex.athlete@gmail.com"
                  placeholderTextColor={Theme.colors.textMuted}
                  value={googleEmailInput}
                  onChangeText={setGoogleEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.googleConfirmButton}
              onPress={() => executeGoogleAuth(googleEmailInput, googleNameInput)}
              activeOpacity={0.85}
            >
              <Text style={styles.googleConfirmButtonText}>Continue with Account</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.xxl,
    paddingBottom: Theme.spacing.xl,
    justifyContent: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxl,
  },
  welcomeTitle: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    marginTop: Theme.spacing.md,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: Theme.typography.sizes.base,
    color: Theme.colors.textSecondary,
    marginTop: 4,
    fontWeight: '400',
  },
  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.errorLight,
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '500',
    flex: 1,
  },
  authButtonsContainer: {
    gap: Theme.spacing.md,
  },
  socialAuthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  socialAuthButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  guestAuthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surfaceSecondary,
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  guestAuthButtonText: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Theme.spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.borderSubtle,
  },
  dividerText: {
    paddingHorizontal: Theme.spacing.base,
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
    color: Theme.colors.textMuted,
    letterSpacing: 1,
  },
  emailToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.base,
    paddingHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  emailToggleText: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  emailFormCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.card,
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: Theme.borderRadius.md,
    padding: 3,
    marginBottom: Theme.spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    alignItems: 'center',
    borderRadius: Theme.borderRadius.sm,
  },
  tabButtonActive: {
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.soft,
  },
  tabButtonText: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: Theme.colors.primaryGreen,
  },
  inputGroup: {
    marginBottom: Theme.spacing.md,
  },
  inputLabel: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    paddingHorizontal: Theme.spacing.md,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: Theme.typography.sizes.base,
    color: Theme.colors.textPrimary,
  },
  passwordToggle: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: Theme.colors.primaryGreen,
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.sm,
    ...Theme.shadows.elevated,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
  },
  legalFooter: {
    marginTop: Theme.spacing.xxl,
    alignItems: 'center',
  },
  legalText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: Theme.colors.primaryGreen,
    fontWeight: '600',
  },
  googleModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 26, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },
  googleModalCard: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.xl,
    ...Theme.shadows.card,
  },
  googleModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  googleModalTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginLeft: 10,
    flex: 1,
  },
  googleModalClose: {
    padding: 4,
  },
  googleModalSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.lg,
    lineHeight: 20,
  },
  googleConfirmButton: {
    backgroundColor: Theme.colors.primaryGreen,
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.sm,
  },
  googleConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
  },
});
