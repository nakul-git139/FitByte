import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

const ONBOARDING_SLIDES = [
  {
    id: '1',
    title: 'A stronger you,\none rep at a time.',
    subtitle: 'FitPilot helps you train smarter, move better, and track your progress.',
    imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80',
    tag: 'INTELLIGENT COACHING',
  },
  {
    id: '2',
    title: 'Real-time guidance,\nevery single rep.',
    subtitle: 'On-device camera vision tracks joint angles and form to keep you safe and effective.',
    imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    tag: 'COMPUTER VISION AI',
  },
  {
    id: '3',
    title: 'Workouts adapted\nto your daily mood.',
    subtitle: 'Check in with your energy level and get personalized routines tailored to your day.',
    imageUrl: 'https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=800&q=80',
    tag: 'DAILY PERSONALIZATION',
  },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onGetStarted,
  onSignIn,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  const handleNext = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (currentSlideIndex < ONBOARDING_SLIDES.length - 1) {
      setCurrentSlideIndex((prev) => prev + 1);
    } else {
      onGetStarted();
    }
  };

  const handleSkip = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onGetStarted();
  };

  const currentSlide = ONBOARDING_SLIDES[currentSlideIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header Row with Skip Button */}
      <View style={styles.headerRow}>
        <View style={styles.logoRow}>
          <View style={styles.miniLogoBadge}>
            <Ionicons
              name="navigate"
              size={14}
              color={Theme.colors.primaryGreen}
              style={{ transform: [{ rotate: '-45deg' }] }}
            />
          </View>
          <Text style={styles.miniLogoText}>Fit<Text style={{ color: Theme.colors.primaryGreen }}>Pilot</Text></Text>
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipButton} activeOpacity={0.7}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Slide Card with Realistic Fitness Photography */}
      <View style={styles.slideCard}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: currentSlide.imageUrl }}
            style={styles.slideImage}
            resizeMode="cover"
          />
          <View style={styles.imageBadge}>
            <Text style={styles.imageBadgeText}>{currentSlide.tag}</Text>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.slideTitle}>{currentSlide.title}</Text>
          <Text style={styles.slideSubtitle}>{currentSlide.subtitle}</Text>
        </View>
      </View>

      {/* Footer Navigation: Dots & Buttons */}
      <View style={styles.footerContainer}>
        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {ONBOARDING_SLIDES.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                index === currentSlideIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {currentSlideIndex === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Sign In Link */}
        <TouchableOpacity
          onPress={onSignIn}
          style={styles.signInLinkButton}
          activeOpacity={0.7}
        >
          <Text style={styles.signInLinkText}>
            Already have an account? <Text style={styles.signInLinkBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniLogoBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLogoText: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  skipButton: {
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
  },
  skipButtonText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  slideCard: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: Theme.spacing.md,
  },
  imageContainer: {
    width: '100%',
    height: SCREEN_WIDTH * 0.75,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surfaceSecondary,
    position: 'relative',
    ...Theme.shadows.card,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  imageBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: 'rgba(28, 28, 26, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  imageBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  textContainer: {
    marginTop: Theme.spacing.xl,
  },
  slideTitle: {
    fontSize: Theme.typography.sizes.xxl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  slideSubtitle: {
    marginTop: Theme.spacing.sm,
    fontSize: Theme.typography.sizes.base,
    color: Theme.colors.textSecondary,
    lineHeight: 22,
    fontWeight: '400',
  },
  footerContainer: {
    paddingBottom: Theme.spacing.base,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: Theme.colors.primaryGreen,
  },
  dotInactive: {
    width: 8,
    backgroundColor: Theme.colors.borderSubtle,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.elevated,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
  },
  signInLinkButton: {
    marginTop: Theme.spacing.md,
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
  },
  signInLinkText: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
  },
  signInLinkBold: {
    color: Theme.colors.primaryGreen,
    fontWeight: '700',
  },
});
