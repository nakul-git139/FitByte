import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../config/theme';

export type WeightUnit = 'kg' | 'lbs';

interface ExerciseWeightSelectorProps {
  weightKg: number;
  onChangeWeightKg: (weightKg: number) => void;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

const KG_PRESETS = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 25];
const LBS_PRESETS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 50];

// Conversion helper: 1 kg ≈ 2.20462 lbs
const kgToLbs = (kg: number): number => Math.round(kg * 2.20462 * 2) / 2;
const lbsToKg = (lbs: number): number => Math.round((lbs / 2.20462) * 2) / 2;

export const ExerciseWeightSelector: React.FC<ExerciseWeightSelectorProps> = ({
  weightKg,
  onChangeWeightKg,
  title = 'Dumbbell Weight',
  subtitle = 'Select weight per arm for bicep curls',
  compact = false,
}) => {
  const [unit, setUnit] = useState<WeightUnit>('kg');

  const displayedWeight = unit === 'kg' ? weightKg : kgToLbs(weightKg);

  const handleSelectPreset = (val: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const targetKg = unit === 'kg' ? val : lbsToKg(val);
    onChangeWeightKg(targetKg);
  };

  const handleStep = (delta: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (unit === 'kg') {
      const step = 0.5;
      const next = Math.max(0, Math.min(60, Math.round((weightKg + delta * step) * 10) / 10));
      onChangeWeightKg(next);
    } else {
      const step = 1; // 1 lb step
      const currentLbs = kgToLbs(weightKg);
      const nextLbs = Math.max(0, Math.min(130, currentLbs + delta * step));
      onChangeWeightKg(lbsToKg(nextLbs));
    }
  };

  const toggleUnit = (newUnit: WeightUnit) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setUnit(newUnit);
  };

  const presets = unit === 'kg' ? KG_PRESETS : LBS_PRESETS;
  const isBodyweight = weightKg <= 0;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {/* Header with Title and Unit Switcher */}
      <View style={styles.headerRow}>
        <View style={styles.titleCol}>
          <View style={styles.titleWithIcon}>
            <Ionicons name="barbell-outline" size={18} color={Theme.colors.primaryGreen} />
            <Text style={styles.titleText}>{title}</Text>
          </View>
          {!compact && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>

        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[styles.unitBtn, unit === 'kg' && styles.unitBtnActive]}
            onPress={() => toggleUnit('kg')}
            activeOpacity={0.8}
          >
            <Text style={[styles.unitBtnText, unit === 'kg' && styles.unitBtnTextActive]}>
              KG
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.unitBtn, unit === 'lbs' && styles.unitBtnActive]}
            onPress={() => toggleUnit('lbs')}
            activeOpacity={0.8}
          >
            <Text style={[styles.unitBtnText, unit === 'lbs' && styles.unitBtnTextActive]}>
              LBS
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Display & Stepper Controls */}
      <View style={styles.displayRow}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => handleStep(-1)}
          activeOpacity={0.7}
          disabled={weightKg <= 0}
        >
          <Ionicons
            name="remove"
            size={22}
            color={weightKg <= 0 ? Theme.colors.textMuted : Theme.colors.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.weightValueBox}>
          {isBodyweight ? (
            <View style={styles.bodyweightBadge}>
              <Ionicons name="body-outline" size={20} color={Theme.colors.primaryGreen} />
              <Text style={styles.bodyweightText}>Bodyweight / Band</Text>
            </View>
          ) : (
            <View style={styles.valueWithUnit}>
              <Text style={styles.weightNumber}>{displayedWeight}</Text>
              <Text style={styles.weightUnitLabel}>{unit}</Text>
            </View>
          )}

          {!isBodyweight && (
            <Text style={styles.totalLoadText}>
              2 × {displayedWeight} {unit} = {Math.round(displayedWeight * 2 * 10) / 10} {unit} total
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => handleStep(1)}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={22} color={Theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Quick Preset Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetScroll}
      >
        {presets.map((val) => {
          const isSelected =
            unit === 'kg'
              ? Math.abs(weightKg - val) < 0.25
              : Math.abs(kgToLbs(weightKg) - val) < 0.5;

          return (
            <TouchableOpacity
              key={`preset-${val}`}
              style={[styles.presetPill, isSelected && styles.presetPillActive]}
              onPress={() => handleSelectPreset(val)}
              activeOpacity={0.7}
            >
              <Text style={[styles.presetText, isSelected && styles.presetTextActive]}>
                {val === 0 ? 'No Wt' : `${val} ${unit}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.base,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.soft,
  },
  containerCompact: {
    padding: Theme.spacing.sm,
    marginBottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  titleCol: {
    flex: 1,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  subtitleText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: Theme.borderRadius.full,
    padding: 3,
  },
  unitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  unitBtnActive: {
    backgroundColor: Theme.colors.primaryGreen,
  },
  unitBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
  },
  unitBtnTextActive: {
    color: '#FFFFFF',
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: Theme.spacing.md,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  weightValueBox: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  valueWithUnit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  weightNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  weightUnitLabel: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
    color: Theme.colors.primaryGreen,
  },
  bodyweightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  bodyweightText: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
  },
  totalLoadText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  presetScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetPill: {
    backgroundColor: Theme.colors.surfaceSecondary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  presetPillActive: {
    backgroundColor: Theme.colors.primaryGreen,
    borderColor: Theme.colors.primaryGreen,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  presetTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
