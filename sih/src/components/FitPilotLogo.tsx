import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../config/theme';

interface FitPilotLogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  taglineText?: string;
  theme?: 'light' | 'dark';
}

export const FitPilotLogo: React.FC<FitPilotLogoProps> = ({
  size = 'medium',
  showTagline = false,
  taglineText = 'Your Personal AI Fitness Coach',
  theme = 'light',
}) => {
  const isDark = theme === 'dark';

  const getDimensions = () => {
    switch (size) {
      case 'small':
        return { iconSize: 22, titleSize: 18, badgeSize: 36, taglineSize: 11 };
      case 'large':
        return { iconSize: 34, titleSize: 30, badgeSize: 64, taglineSize: 13 };
      case 'medium':
      default:
        return { iconSize: 28, titleSize: 24, badgeSize: 50, taglineSize: 12 };
    }
  };

  const dim = getDimensions();

  return (
    <View style={styles.container}>
      {/* Brand Icon Badge - Direction / Guidance Emblem */}
      <View
        style={[
          styles.logoBadge,
          {
            width: dim.badgeSize,
            height: dim.badgeSize,
            borderRadius: dim.badgeSize * 0.35,
            backgroundColor: isDark ? 'rgba(31, 107, 79, 0.25)' : Theme.colors.lightGreen,
          },
        ]}
      >
        <Ionicons
          name="navigate"
          size={dim.iconSize}
          color={Theme.colors.primaryGreen}
          style={{ transform: [{ rotate: '-45deg' }], marginLeft: 2, marginTop: -1 }}
        />
      </View>

      {/* Brand Wordmark */}
      <View style={styles.textColumn}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.brandTitle,
              {
                fontSize: dim.titleSize,
                color: isDark ? '#FFFFFF' : Theme.colors.textPrimary,
              },
            ]}
          >
            Fit<Text style={{ color: Theme.colors.primaryGreen }}>Pilot</Text>
          </Text>
        </View>

        {showTagline && (
          <Text
            style={[
              styles.brandTagline,
              {
                fontSize: dim.taglineSize,
                color: isDark ? '#94A3B8' : Theme.colors.textSecondary,
              },
            ]}
          >
            {taglineText}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(31, 107, 79, 0.15)',
  },
  textColumn: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandTagline: {
    marginTop: 3,
    fontWeight: '500',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
});
