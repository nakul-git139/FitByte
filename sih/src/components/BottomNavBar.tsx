import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../config/theme';

export type MainTabType = 'home' | 'workout' | 'progress' | 'profile';

interface BottomNavBarProps {
  activeTab: MainTabType;
  onTabSelect: (tab: MainTabType) => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ activeTab, onTabSelect }) => {
  const handlePress = (tab: MainTabType) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onTabSelect(tab);
  };

  const tabs: Array<{
    id: MainTabType;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    activeIcon: keyof typeof Ionicons.glyphMap;
  }> = [
    { id: 'home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { id: 'workout', label: 'Workout', icon: 'barbell-outline', activeIcon: 'barbell' },
    { id: 'progress', label: 'Progress', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
    { id: 'profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];

  return (
    <View style={styles.navContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabButton}
            onPress={() => handlePress(tab.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isActive ? tab.activeIcon : tab.icon}
              size={22}
              color={isActive ? Theme.colors.primaryGreen : Theme.colors.textSecondary}
            />
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderSubtle,
    paddingVertical: 10,
    paddingHorizontal: Theme.spacing.md,
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: Theme.colors.primaryGreen,
    fontWeight: '700',
  },
});
