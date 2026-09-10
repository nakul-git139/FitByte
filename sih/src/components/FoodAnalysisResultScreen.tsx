import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FoodAnalysisResult, MealLogRecord } from '../types/food';
import { StorageService } from '../services/storageService';
import { Theme } from '../config/theme';

interface FoodAnalysisResultScreenProps {
  result: FoodAnalysisResult;
  onScanAnother: () => void;
  onDone: () => void;
}

export const FoodAnalysisResultScreen: React.FC<FoodAnalysisResultScreenProps> = ({
  result,
  onScanAnother,
  onDone,
}) => {
  const [isLogged, setIsLogged] = useState<boolean>(false);

  const {
    isFood = true,
    totalCalories = 0,
    proteinGrams = 0,
    carbsGrams = 0,
    fatGrams = 0,
    foodItems = [],
    goalAlignment,
    suggestions = [],
    confidenceNote,
    photoUri,
  } = result;

  // Calculate Macro Percentages for Visual Split Bar
  const totalMacroGrams = Math.max(1, proteinGrams + carbsGrams + fatGrams);
  const proteinPercent = Math.round((proteinGrams / totalMacroGrams) * 100);
  const carbsPercent = Math.round((carbsGrams / totalMacroGrams) * 100);
  const fatPercent = Math.max(0, 100 - proteinPercent - carbsPercent);

  const status = goalAlignment?.status || 'good';
  const badgeText = goalAlignment?.badgeText || (status === 'good' ? 'Good choice' : status === 'could_improve' ? 'Could be improved' : 'Poor choice for your goal');

  const handleLogMeal = async () => {
    if (isLogged) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const mealRecord: MealLogRecord = {
      id: `meal-${Date.now()}`,
      timestamp: new Date().toISOString(),
      mealName: foodItems.length > 0 ? foodItems[0].name : 'Scanned Meal',
      totalCalories,
      proteinGrams,
      carbsGrams,
      fatGrams,
      foodItems,
      status,
      badgeText,
      photoUri,
    };

    try {
      await StorageService.saveMealLog(mealRecord);
      setIsLogged(true);
      Alert.alert('Meal Logged', 'This meal was added to your daily nutrition record.');
    } catch (e) {
      console.warn('[FoodAnalysisResult] Error logging meal:', e);
      setIsLogged(true);
    }
  };

  const handleScanAnother = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onScanAnother();
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={onDone} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Nutrition Breakdown</Text>
            <Text style={styles.headerSubtitle}>AI Calorie & Macro Analysis</Text>
          </View>
        </View>

        {/* Meal Photo Preview & Goal Alignment Badge */}
        {photoUri && (
          <View style={styles.photoBannerContainer}>
            <Image
              source={{ uri: photoUri }}
              style={styles.photoBanner}
              resizeMode="cover"
            />
            <View style={styles.photoOverlayGradient} />

            {/* Goal Alignment Badge */}
            <View
              style={[
                styles.goalBadgePill,
                status === 'good' && styles.goalBadgeGood,
                status === 'could_improve' && styles.goalBadgeWarning,
                status === 'poor_choice' && styles.goalBadgeDanger,
              ]}
            >
              <Ionicons
                name={
                  status === 'good'
                    ? 'checkmark-circle'
                    : status === 'could_improve'
                    ? 'warning'
                    : 'close-circle'
                }
                size={16}
                color={
                  status === 'good'
                    ? '#10B981'
                    : status === 'could_improve'
                    ? '#F59E0B'
                    : '#EF4444'
                }
              />
              <Text
                style={[
                  styles.goalBadgeText,
                  status === 'good' && styles.goalTextGood,
                  status === 'could_improve' && styles.goalTextWarning,
                  status === 'poor_choice' && styles.goalTextDanger,
                ]}
              >
                {badgeText}
              </Text>
            </View>
          </View>
        )}

        {/* If Not Food or Ambiguous Warning */}
        {!isFood ? (
          <View style={styles.unclearCard}>
            <Ionicons name="alert-circle-outline" size={32} color="#F59E0B" />
            <Text style={styles.unclearTitle}>Unable to estimate accurately</Text>
            <Text style={styles.unclearText}>
              {confidenceNote || 'The photo was too blurry or the food could not be clearly identified. Please retake with good lighting.'}
            </Text>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={handleScanAnother}
              activeOpacity={0.8}
            >
              <Text style={styles.retakeButtonText}>Take Another Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* 1. Big Estimated Calories Card */}
            <View style={styles.calorieHeroCard}>
              <View style={styles.calorieHeaderRow}>
                <View>
                  <Text style={styles.calorieLabel}>ESTIMATED CALORIES</Text>
                  <Text style={styles.calorieNumber}>
                    {totalCalories} <Text style={styles.calorieUnit}>kcal</Text>
                  </Text>
                </View>

                <View style={styles.calorieFlameCircle}>
                  <Ionicons name="flame" size={28} color="#EA580C" />
                </View>
              </View>

              {goalAlignment?.feedbackSummary ? (
                <Text style={styles.calorieSummaryText}>
                  {goalAlignment.feedbackSummary}
                </Text>
              ) : null}

              {/* Macro Proportion Bar */}
              <View style={styles.macroBarContainer}>
                <View style={[styles.macroSegment, { flex: proteinPercent, backgroundColor: '#10B981' }]} />
                <View style={[styles.macroSegment, { flex: carbsPercent, backgroundColor: '#38BDF8' }]} />
                <View style={[styles.macroSegment, { flex: fatPercent, backgroundColor: '#F59E0B' }]} />
              </View>

              <View style={styles.macroLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>Protein {proteinPercent}%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#38BDF8' }]} />
                  <Text style={styles.legendText}>Carbs {carbsPercent}%</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>Fats {fatPercent}%</Text>
                </View>
              </View>
            </View>

            {/* 2. Three Macro Stat Cards */}
            <View style={styles.macroCardsRow}>
              {/* Protein */}
              <View style={styles.macroCard}>
                <Text style={styles.macroCardLabel}>Protein</Text>
                <Text style={[styles.macroCardValue, { color: '#10B981' }]}>
                  {proteinGrams}g
                </Text>
                <Text style={styles.macroCardCal}>
                  {proteinGrams * 4} kcal
                </Text>
              </View>

              {/* Carbs */}
              <View style={styles.macroCard}>
                <Text style={styles.macroCardLabel}>Carbs</Text>
                <Text style={[styles.macroCardValue, { color: '#0284C7' }]}>
                  {carbsGrams}g
                </Text>
                <Text style={styles.macroCardCal}>
                  {carbsGrams * 4} kcal
                </Text>
              </View>

              {/* Fats */}
              <View style={styles.macroCard}>
                <Text style={styles.macroCardLabel}>Fats</Text>
                <Text style={[styles.macroCardValue, { color: '#D97706' }]}>
                  {fatGrams}g
                </Text>
                <Text style={styles.macroCardCal}>
                  {fatGrams * 9} kcal
                </Text>
              </View>
            </View>

            {/* 3. Detected Food Items List */}
            {foodItems && foodItems.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="restaurant-outline" size={16} color={Theme.colors.primaryGreen} />
                  <Text style={styles.sectionTitle}>Detected Items & Portions</Text>
                </View>

                <View style={styles.foodItemsList}>
                  {foodItems.map((item, idx) => (
                    <View key={`food-item-${idx}`} style={styles.foodItemRow}>
                      <View style={styles.foodItemLeft}>
                        <Text style={styles.foodItemName}>{item.name}</Text>
                        <Text style={styles.foodItemPortion}>{item.portion}</Text>
                      </View>

                      <View style={styles.foodItemRight}>
                        <Text style={styles.foodItemCalories}>{item.calories} kcal</Text>
                        <Text style={styles.foodItemMacroSub}>
                          P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 4. Gemini Nutritionist Personalized Suggestions */}
            {suggestions && suggestions.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Ionicons name="sparkles" size={16} color={Theme.colors.primaryGreen} />
                  <Text style={styles.sectionTitle}>FitPilot Coach Suggestions</Text>
                </View>

                <View style={styles.suggestionsList}>
                  {suggestions.map((tip, idx) => (
                    <View key={`suggestion-${idx}`} style={styles.suggestionItem}>
                      <View style={styles.suggestionBullet}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                      <Text style={styles.suggestionText}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 5. Estimation Accuracy Disclaimer */}
            <View style={styles.disclaimerCard}>
              <Ionicons name="information-circle-outline" size={16} color={Theme.colors.textMuted} />
              <Text style={styles.disclaimerText}>
                {confidenceNote || 'Calorie and macro estimates are approximations based on visual portion analysis. Actual nutritional values may vary.'}
              </Text>
            </View>
          </>
        )}

        {/* 6. Action Buttons */}
        <View style={styles.actionsContainer}>
          {isFood && (
            <TouchableOpacity
              style={[styles.primaryButton, isLogged && styles.loggedButton]}
              onPress={handleLogMeal}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isLogged ? 'checkmark-circle' : 'bookmark-outline'}
                size={18}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.primaryButtonText}>
                {isLogged ? 'Meal Logged in History' : 'Log This Meal'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleScanAnother}
            activeOpacity={0.7}
          >
            <Ionicons name="camera-outline" size={18} color={Theme.colors.primaryGreen} style={{ marginRight: 6 }} />
            <Text style={styles.secondaryButtonText}>Scan Another Meal</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xxxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginRight: Theme.spacing.md,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 1,
  },
  photoBannerContainer: {
    width: '100%',
    height: 200,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.card,
  },
  photoBanner: {
    width: '100%',
    height: '100%',
  },
  photoOverlayGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  goalBadgePill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
  },
  goalBadgeGood: {
    borderColor: 'rgba(16, 185, 129, 0.6)',
  },
  goalBadgeWarning: {
    borderColor: 'rgba(245, 158, 11, 0.6)',
  },
  goalBadgeDanger: {
    borderColor: 'rgba(239, 68, 68, 0.6)',
  },
  goalBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  goalTextGood: {
    color: '#34D399',
  },
  goalTextWarning: {
    color: '#FBBF24',
  },
  goalTextDanger: {
    color: '#F87171',
  },
  calorieHeroCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.card,
  },
  calorieHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  calorieLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    letterSpacing: 1,
  },
  calorieNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  calorieUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  calorieFlameCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieSummaryText: {
    fontSize: Theme.typography.sizes.xs + 1,
    color: Theme.colors.textSecondary,
    lineHeight: 19,
    marginBottom: Theme.spacing.md,
  },
  macroBarContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: Theme.colors.surfaceSecondary,
    marginBottom: 10,
  },
  macroSegment: {
    height: '100%',
  },
  macroLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  macroCardsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  macroCard: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    alignItems: 'center',
    ...Theme.shadows.soft,
  },
  macroCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    marginBottom: 2,
  },
  macroCardValue: {
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '800',
  },
  macroCardCal: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.soft,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  foodItemsList: {
    gap: 10,
  },
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderSubtle,
  },
  foodItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  foodItemName: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  foodItemPortion: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 1,
  },
  foodItemRight: {
    alignItems: 'flex-end',
  },
  foodItemCalories: {
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  foodItemMacroSub: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  suggestionsList: {
    gap: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  suggestionBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  suggestionText: {
    flex: 1,
    fontSize: Theme.typography.sizes.xs + 1,
    color: Theme.colors.textPrimary,
    lineHeight: 18,
  },
  disclaimerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceSecondary,
    marginBottom: Theme.spacing.lg,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: Theme.colors.textMuted,
    lineHeight: 16,
  },
  unclearCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginVertical: Theme.spacing.lg,
    ...Theme.shadows.card,
  },
  unclearTitle: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginTop: Theme.spacing.md,
    marginBottom: 6,
  },
  unclearText: {
    fontSize: Theme.typography.sizes.xs + 1,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Theme.spacing.lg,
  },
  retakeButton: {
    backgroundColor: Theme.colors.primaryGreen,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm + 2,
    borderRadius: Theme.borderRadius.full,
  },
  retakeButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: 12,
    marginTop: Theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: Theme.colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.elevated,
  },
  loggedButton: {
    backgroundColor: '#059669',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm + 1,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: Theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: Theme.colors.primaryGreen,
  },
  secondaryButtonText: {
    color: Theme.colors.primaryGreen,
    fontSize: Theme.typography.sizes.sm + 1,
    fontWeight: '700',
  },
});
