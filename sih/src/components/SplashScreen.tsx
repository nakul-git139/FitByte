import React, { useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FitPilotLogo } from './FitPilotLogo';
import { Theme } from '../config/theme';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 1800,
}) => {
  useEffect(() => {
    if (!onFinish) return;
    const timer = setTimeout(() => {
      onFinish();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [onFinish, durationMs]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        <FitPilotLogo
          size="large"
          showTagline={true}
          taglineText="Your Personal AI Fitness Coach"
          theme="light"
        />

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Theme.colors.primaryGreen} />
          <Text style={styles.loadingText}>Getting things ready...</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTag}>TRAIN SMARTER • MOVE BETTER</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xxl,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  loadingContainer: {
    marginTop: Theme.spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  loadingText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    paddingBottom: Theme.spacing.base,
  },
  footerTag: {
    fontSize: Theme.typography.sizes.xs,
    letterSpacing: 1.5,
    color: Theme.colors.textMuted,
    fontWeight: '600',
  },
});
