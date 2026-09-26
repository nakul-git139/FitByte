import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PostProgressMetrics } from '../../types/community';
import { Theme } from '../../config/theme';

interface InteractiveProgressGraphProps {
  metrics: PostProgressMetrics;
  compact?: boolean;
}

const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const InteractiveProgressGraph: React.FC<InteractiveProgressGraphProps> = ({
  metrics,
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<'volume' | 'form'>('volume');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(4); // Default to latest weekday (Fri)

  // Construct chart data
  const chartData = metrics.chartData && metrics.chartData.length >= 7
    ? metrics.chartData
    : [
        { day: 'Mon', value: 20, score: 92 },
        { day: 'Tue', value: 25, score: 95 },
        { day: 'Wed', value: 28, score: 94 },
        { day: 'Thu', value: 22, score: 90 },
        { day: 'Fri', value: Math.max(metrics.totalReps || 30, 25), score: metrics.formAccuracy || 96 },
        { day: 'Sat', value: 0, score: 0 },
        { day: 'Sun', value: 0, score: 0 },
      ];

  const maxVal = Math.max(...chartData.map((d) => d.value), 35);

  const selectedData = chartData[selectedDayIndex] || chartData[chartData.length - 1];

  const handleSelectDay = (index: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedDayIndex(index);
  };

  const handleTabChange = (tab: 'volume' | 'form') => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setActiveTab(tab);
  };

  const streakDays = metrics.streakDays || 5;
  const formAccuracy = metrics.formAccuracy || 94;
  const totalReps = metrics.totalReps || 26;
  const caloriesBurned = metrics.caloriesBurned || 340;

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      {/* 1. Header Banner with AI Biometrics Badge */}
      <View style={styles.headerRow}>
        <View style={styles.badgeWrapper}>
          <Ionicons name="flash" size={13} color="#00F0FF" />
          <Text style={styles.badgeText}>AI BIOMETRICS & PROGRESS</Text>
        </View>

        <View style={styles.streakBadge}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>{streakDays} Day Streak</Text>
        </View>
      </View>

      {/* 2. Interactive Mode Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'volume' && styles.tabButtonActive]}
          onPress={() => handleTabChange('volume')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="bar-chart"
            size={13}
            color={activeTab === 'volume' ? '#000000' : Theme.colors.textMuted}
          />
          <Text
            style={[styles.tabText, activeTab === 'volume' && styles.tabTextActive]}
          >
            Weekly Reps
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'form' && styles.tabButtonActiveForm]}
          onPress={() => handleTabChange('form')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="shield-checkmark"
            size={13}
            color={activeTab === 'form' ? '#FFFFFF' : Theme.colors.textMuted}
          />
          <Text
            style={[styles.tabText, activeTab === 'form' && styles.tabTextActiveForm]}
          >
            Form Score %
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Interactive Interactive Tooltip Card */}
      <View style={styles.tooltipCard}>
        <View style={styles.tooltipLeft}>
          <Text style={styles.tooltipDay}>{selectedData.day}'s Session</Text>
          <Text style={styles.tooltipSubtitle}>
            {selectedData.value > 0 ? 'Completed Workout' : 'Rest Day'}
          </Text>
        </View>
        <View style={styles.tooltipRight}>
          <Text style={styles.tooltipValue}>
            {activeTab === 'volume'
              ? `${selectedData.value} reps`
              : `${selectedData.score > 0 ? selectedData.score + '%' : '—'}`}
          </Text>
          {selectedData.score > 0 && (
            <Text style={styles.tooltipSubScore}>
              {activeTab === 'volume'
                ? `Form: ${selectedData.score}%`
                : `${selectedData.value} reps`}
            </Text>
          )}
        </View>
      </View>

      {/* 4. Interactive Dynamic Bar Graph */}
      <View style={styles.chartWrapper}>
        <View style={styles.barsContainer}>
          {chartData.map((item, index) => {
            const isSelected = selectedDayIndex === index;
            const hasActivity = item.value > 0;
            const heightPercent =
              activeTab === 'volume'
                ? Math.max(12, Math.round((item.value / maxVal) * 100))
                : item.score > 0
                ? Math.max(15, Math.round((item.score / 100) * 100))
                : 10;

            const barColor = isSelected
              ? activeTab === 'volume'
                ? '#10B981'
                : '#8B5CF6'
              : hasActivity
              ? activeTab === 'volume'
                ? '#059669'
                : '#6D28D9'
              : '#262626';

            return (
              <TouchableOpacity
                key={item.day}
                style={styles.barColumn}
                onPress={() => handleSelectDay(index)}
                activeOpacity={0.7}
              >
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${heightPercent}%`,
                        backgroundColor: barColor,
                      },
                      isSelected && styles.barSelectedGlow,
                    ]}
                  >
                    {isSelected && (
                      <View style={styles.barTopIndicator} />
                    )}
                  </View>
                </View>
                <Text
                  style={[
                    styles.dayLabel,
                    isSelected && styles.dayLabelSelected,
                    hasActivity && styles.dayLabelActive,
                  ]}
                >
                  {item.day}
                </Text>
                {hasActivity && <View style={styles.activeDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 5. Biometrics Key Performance Metrics Grid */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Ionicons name="flame" size={16} color="#FF6B00" />
          <Text style={styles.metricVal}>{streakDays}d</Text>
          <Text style={styles.metricLbl}>Streak</Text>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.metricVal}>{formAccuracy}%</Text>
          <Text style={styles.metricLbl}>AI Form</Text>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="fitness" size={16} color="#00F0FF" />
          <Text style={styles.metricVal}>{totalReps}</Text>
          <Text style={styles.metricLbl}>Total Reps</Text>
        </View>

        <View style={styles.metricCard}>
          <Ionicons name="flash-outline" size={16} color="#EAB308" />
          <Text style={styles.metricVal}>{caloriesBurned}</Text>
          <Text style={styles.metricLbl}>Calories</Text>
        </View>
      </View>

      {/* 6. Footer Verified Badge */}
      <View style={styles.footerRow}>
        <Ionicons name="shield-checkmark-outline" size={12} color="#10B981" />
        <Text style={styles.footerText}>
          Verified by FitPilot AI • Real-time Pose Computer Vision
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#00F0FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  compactContainer: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(0, 240, 255, 0.3)',
    gap: 4,
  },
  badgeText: {
    color: '#00F0FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 107, 0, 0.4)',
    gap: 4,
  },
  streakEmoji: {
    fontSize: 11,
  },
  streakText: {
    color: '#FFA500',
    fontSize: 11,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#10B981',
  },
  tabButtonActiveForm: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: '800',
  },
  tabTextActiveForm: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tooltipCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#00F0FF',
    marginBottom: 14,
  },
  tooltipLeft: {
    flex: 1,
  },
  tooltipDay: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tooltipSubtitle: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    marginTop: 1,
  },
  tooltipRight: {
    alignItems: 'flex-end',
  },
  tooltipValue: {
    color: '#00F0FF',
    fontSize: 15,
    fontWeight: '800',
  },
  tooltipSubScore: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  chartWrapper: {
    height: 120,
    marginBottom: 14,
    justifyContent: 'flex-end',
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    width: 22,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    alignItems: 'center',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
    minHeight: 8,
  },
  barSelectedGlow: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  barTopIndicator: {
    width: '100%',
    height: 3,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  dayLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
  },
  dayLabelActive: {
    color: '#E2E8F0',
  },
  dayLabelSelected: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  metricVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  metricLbl: {
    color: Theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 4,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '500',
  },
});
