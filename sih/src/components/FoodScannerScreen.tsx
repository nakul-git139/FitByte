import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FoodNutritionAnalysis, FoodLogRecord } from '../types/nutrition';
import { NutritionService } from '../services/nutritionService';
import { Theme } from '../config/theme';

interface FoodScannerScreenProps {
  onBack: () => void;
  onMealLogged?: (log: FoodLogRecord) => void;
}

const SAMPLE_MEALS = [
  {
    label: '🥗 Chicken Avocado Bowl',
    name: 'Grilled Chicken & Avocado Superbowl',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
    desc: 'Grilled chicken breast with quinoa, fresh avocado, steamed broccoli, and light vinaigrette',
  },
  {
    label: '🍔 Burger & Fries',
    name: 'Cheeseburger with French Fries',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    desc: 'Double beef cheeseburger with crispy deep-fried french fries and mayo sauce',
  },
  {
    label: '🍱 Indian Thali',
    name: 'Traditional Indian Thali',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
    desc: '2 Roti, Dal Makhani, Paneer Butter Masala, Basmati Rice, and Gulab Jamun',
  },
  {
    label: '🥣 Berry Oatmeal',
    name: 'Greek Yogurt & Berry Power Oatmeal',
    image: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=600&q=80',
    desc: 'Rolled oats with 0% Greek yogurt, fresh blueberries, chia seeds, and raw honey',
  },
  {
    label: '🍕 Pepperoni Pizza',
    name: 'Pepperoni Pizza Slices',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    desc: 'Deep dish pepperoni pizza with mozzarella cheese and tomato sauce',
  },
  {
    label: '🍣 Salmon Poke Bowl',
    name: 'Fresh Salmon Poke Bowl',
    image: 'https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?auto=format&fit=crop&w=600&q=80',
    desc: 'Fresh Atlantic salmon cubes with brown rice, edamame, and cucumber',
  },
];

export const FoodScannerScreen: React.FC<FoodScannerScreenProps> = ({
  onBack,
  onMealLogged,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [userMealNote, setUserMealNote] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<FoodNutritionAnalysis | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const cameraRef = useRef<any>(null);

  const handleToggleFacing = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const handleToggleFlash = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsFlashOn((prev) => !prev);
  };

  /**
   * 1. Capture live photo with Expo Camera and analyze with Gemini Vision
   */
  const handleCapturePhoto = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });

        if (photo?.uri) {
          setCapturedImageUri(photo.uri);
          const base64Data = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : '';
          performAnalysis(base64Data, photo.uri, userMealNote.trim() || undefined);
          return;
        }
      } catch (err) {
        console.warn('[FoodScanner] Camera capture error, falling back to gallery/sample:', err);
      }
    }

    // If hardware camera unavailable (e.g. simulator), open gallery or fallback
    handlePickFromGallery();
  };

  /**
   * 2. Select any food photo from the user's phone gallery / photo library
   */
  const handlePickFromGallery = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setCapturedImageUri(asset.uri);
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : '';
        performAnalysis(base64Data, asset.uri, userMealNote.trim() || undefined);
      }
    } catch (err) {
      console.warn('[FoodScanner] Gallery picker error:', err);
      Alert.alert('Photo Selection', 'Unable to load photo from gallery. Please try again or test a sample meal.');
    }
  };

  /**
   * 3. Select sample meal dish to query Gemini live
   */
  const handleSelectSampleMeal = (sample: typeof SAMPLE_MEALS[0]) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    setCapturedImageUri(sample.image);
    performAnalysis('', sample.image, sample.desc);
  };

  /**
   * Core Analysis Dispatcher — Calls Gemini Vision AI
   */
  const performAnalysis = async (base64Data: string, uri: string, mealDesc?: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setIsSaved(false);

    try {
      const result = await NutritionService.analyzeFood(base64Data, mealDesc);
      setAnalysisResult(result);
    } catch (e: any) {
      console.warn('[FoodScanner] Analysis error:', e);
      const fallback = NutritionService.getLocalFallbackFoodAnalysis(mealDesc);
      setAnalysisResult(fallback);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLogMeal = async () => {
    if (!analysisResult) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    const logged = await NutritionService.logMeal(analysisResult, capturedImageUri || undefined);
    setIsSaved(true);
    if (onMealLogged) {
      onMealLogged(logged);
    }
    Alert.alert(
      'Meal Logged! 🥗',
      `Logged ${analysisResult.mealName} (${analysisResult.totalCalories} kcal) to your daily intake.`,
      [{ text: 'Great!', onPress: () => {} }]
    );
  };

  const handleResetScanner = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setCapturedImageUri(null);
    setAnalysisResult(null);
    setIsSaved(false);
    setIsAnalyzing(false);
  };

  // 1. Permission Denied or Not Yet Granted
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.permissionContainer}>
          <TouchableOpacity style={styles.backButtonTop} onPress={onBack}>
            <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.permissionIconCircle}>
            <Ionicons name="camera-outline" size={40} color={Theme.colors.primaryGreen} />
          </View>

          <Text style={styles.permissionTitle}>Snap Meal Photo</Text>
          <Text style={styles.permissionSubtitle}>
            FitPilot uses Google Gemini AI to analyze your food photo, estimate calories, calculate macros (protein, carbs, fats, fiber), and provide clinical sports nutrition suggestions.
          </Text>

          <TouchableOpacity
            style={styles.grantButton}
            onPress={requestPermission}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.grantButtonText}>Grant Camera Access</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.galleryButtonAlt}
            onPress={handlePickFromGallery}
            activeOpacity={0.8}
          >
            <Ionicons name="images-outline" size={18} color={Theme.colors.primaryGreen} style={{ marginRight: 6 }} />
            <Text style={styles.galleryButtonAltText}>Upload Photo from Gallery</Text>
          </TouchableOpacity>

          {/* Quick Demo Options for testing */}
          <View style={styles.sampleDemoWrapper}>
            <Text style={styles.sampleDemoTitle}>Or test with sample meal:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {SAMPLE_MEALS.map((sample, sIdx) => (
                <TouchableOpacity
                  key={`perm-sample-${sIdx}`}
                  style={styles.sampleTestButton}
                  onPress={() => handleSelectSampleMeal(sample)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.sampleTestButtonText}>{sample.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Analyzing Loading State
  if (isAnalyzing) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <View style={styles.loadingContainer}>
          {capturedImageUri && (
            <Image
              source={{ uri: capturedImageUri }}
              style={styles.analyzingImagePreview}
              resizeMode="cover"
            />
          )}

          <View style={styles.analyzingCard}>
            <ActivityIndicator size="large" color={Theme.colors.primaryGreen} style={{ marginBottom: 16 }} />
            <Text style={styles.analyzingTitle}>Google Gemini AI is analyzing your food...</Text>
            <Text style={styles.analyzingSubtitle}>
              Identifying dishes · Estimating calories & portions · Generating clinical sports nutrition coaching
            </Text>

            <View style={styles.analyzingSteps}>
              <View style={styles.stepItem}>
                <Ionicons name="checkmark-circle" size={16} color={Theme.colors.primaryGreen} />
                <Text style={styles.stepText}>Image scan received</Text>
              </View>
              <View style={styles.stepItem}>
                <Ionicons name="sparkles" size={16} color={Theme.colors.primaryGreen} />
                <Text style={styles.stepText}>Gemini Vision processing food composition & volume</Text>
              </View>
              <View style={styles.stepItem}>
                <Ionicons name="nutrition" size={16} color="#F59E0B" />
                <Text style={styles.stepText}>Calculating macronutrients (protein, carbs, fats, fiber)</Text>
              </View>
              <View style={styles.stepItem}>
                <Ionicons name="heart" size={16} color="#EF4444" />
                <Text style={styles.stepText}>Synthesizing personalized coaching & healthy swaps</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Results View (Analysis Ready)
  if (analysisResult) {
    const isQualityPoor = analysisResult.quality === 'poor';
    const isQualityModerate = analysisResult.quality === 'moderate';
    const isQualityGood = analysisResult.quality === 'good' || analysisResult.quality === 'excellent';

    return (
      <SafeAreaView style={styles.safeContainer}>
        <ScrollView
          contentContainerStyle={styles.resultsScroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.resultsHeader}>
            <TouchableOpacity style={styles.backButtonTop} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={Theme.colors.textPrimary} />
            </TouchableOpacity>
            <View style={styles.geminiBadgeHeader}>
              <Ionicons name="sparkles" size={14} color={Theme.colors.primaryGreen} />
              <Text style={styles.geminiBadgeHeaderText}>Google Gemini AI Analysis</Text>
            </View>
            <TouchableOpacity style={styles.resetButton} onPress={handleResetScanner} activeOpacity={0.7}>
              <Ionicons name="camera-reverse" size={20} color={Theme.colors.primaryGreen} />
            </TouchableOpacity>
          </View>

          {/* Meal Photo & Hero Title */}
          <View style={styles.mealHeroCard}>
            {capturedImageUri && (
              <Image
                source={{ uri: capturedImageUri }}
                style={styles.mealHeroImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.mealHeroOverlay}>
              <Text style={styles.mealHeroName}>{analysisResult.mealName}</Text>
              <View style={styles.heroBadgeRow}>
                <View style={styles.calorieBadge}>
                  <Ionicons name="flame" size={14} color="#FFFFFF" />
                  <Text style={styles.calorieBadgeText}>{analysisResult.totalCalories} kcal</Text>
                </View>

                <View
                  style={[
                    styles.qualityBadge,
                    isQualityPoor && styles.qualityBadgePoor,
                    isQualityModerate && styles.qualityBadgeModerate,
                    isQualityGood && styles.qualityBadgeGood,
                  ]}
                >
                  <Text
                    style={[
                      styles.qualityBadgeText,
                      isQualityPoor && styles.qualityTextPoor,
                      isQualityModerate && styles.qualityTextModerate,
                      isQualityGood && styles.qualityTextGood,
                    ]}
                  >
                    {analysisResult.qualityLabel || `${analysisResult.quality.toUpperCase()} QUALITY`}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Macronutrients 4-Grid */}
          <View style={styles.macrosSection}>
            <Text style={styles.sectionHeading}>Macronutrients</Text>
            <View style={styles.macrosGrid}>
              {/* Protein */}
              <View style={[styles.macroCard, { borderLeftColor: Theme.colors.primaryGreen }]}>
                <Text style={styles.macroCardValue}>{analysisResult.macros.proteinGrams}g</Text>
                <Text style={styles.macroCardLabel}>Protein</Text>
              </View>

              {/* Carbs */}
              <View style={[styles.macroCard, { borderLeftColor: '#38BDF8' }]}>
                <Text style={styles.macroCardValue}>{analysisResult.macros.carbsGrams}g</Text>
                <Text style={styles.macroCardLabel}>Carbs</Text>
              </View>

              {/* Fats */}
              <View style={[styles.macroCard, { borderLeftColor: '#F59E0B' }]}>
                <Text style={styles.macroCardValue}>{analysisResult.macros.fatsGrams}g</Text>
                <Text style={styles.macroCardLabel}>Fats</Text>
              </View>

              {/* Fiber */}
              <View style={[styles.macroCard, { borderLeftColor: '#10B981' }]}>
                <Text style={styles.macroCardValue}>{analysisResult.macros.fiberGrams || 0}g</Text>
                <Text style={styles.macroCardLabel}>Fiber</Text>
              </View>
            </View>
          </View>

          {/* Google Gemini AI Coaching & Nutritional Suggestions */}
          <View
            style={[
              styles.coachingCard,
              isQualityPoor && styles.coachingCardPoor,
              isQualityGood && styles.coachingCardGood,
            ]}
          >
            <View style={styles.coachingHeaderRow}>
              <View
                style={[
                  styles.coachingIconCircle,
                  isQualityPoor && { backgroundColor: '#FEE2E2' },
                  isQualityGood && { backgroundColor: Theme.colors.lightGreen },
                ]}
              >
                <Ionicons
                  name={isQualityPoor ? 'warning' : 'sparkles'}
                  size={18}
                  color={isQualityPoor ? '#EF4444' : Theme.colors.primaryGreen}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.coachingCardTitle,
                    isQualityPoor && { color: '#B91C1C' },
                    isQualityGood && { color: Theme.colors.primaryGreenDark },
                  ]}
                >
                  {isQualityPoor ? 'Gemini Nutritional Assessment & Alert' : 'Gemini AI Nutrition Coach'}
                </Text>
                <Text style={styles.coachingCardScore}>
                  Health Balance Score: <Text style={{ fontWeight: '800' }}>{analysisResult.healthScore} / 100</Text>
                </Text>
              </View>
            </View>

            <Text style={styles.coachingBodyText}>
              {analysisResult.geminiSuggestions}
            </Text>

            {/* Actionable Healthy Swaps */}
            {analysisResult.healthySwaps && analysisResult.healthySwaps.length > 0 && (
              <View style={styles.swapsContainer}>
                <Text style={styles.swapsHeaderTitle}>
                  {isQualityPoor ? 'Recommended Healthier Swaps:' : 'Smart Additions & Adjustments:'}
                </Text>
                {analysisResult.healthySwaps.map((swap, sIdx) => (
                  <View key={`swap-${sIdx}`} style={styles.swapItemRow}>
                    <Ionicons
                      name="arrow-forward-circle"
                      size={16}
                      color={isQualityPoor ? '#EF4444' : Theme.colors.primaryGreen}
                    />
                    <Text style={styles.swapItemText}>{swap}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Identified Food Items Breakdown */}
          {analysisResult.foodItems && analysisResult.foodItems.length > 0 && (
            <View style={styles.itemsBreakdownCard}>
              <Text style={styles.sectionHeading}>Identified Food Items</Text>
              <View style={styles.itemsList}>
                {analysisResult.foodItems.map((item, idx) => (
                  <View key={`food-item-${idx}`} style={styles.foodItemRow}>
                    <View style={styles.foodItemDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.foodItemName}>{item.name}</Text>
                      {item.portion ? (
                        <Text style={styles.foodItemPortion}>{item.portion}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.foodItemCalories}>{item.calories} kcal</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={[styles.logMealButton, isSaved && styles.logMealButtonSaved]}
              onPress={handleLogMeal}
              disabled={isSaved}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isSaved ? 'checkmark-circle' : 'add-circle-outline'}
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.logMealButtonText}>
                {isSaved ? 'Logged to Daily Intake' : 'Log Meal to Daily Intake'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.scanAnotherButton}
              onPress={handleResetScanner}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={18} color={Theme.colors.textPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.scanAnotherButtonText}>Scan Another Meal</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 4. Live Camera View
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.cameraScreenContainer}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={cameraFacing}
          enableTorch={isFlashOn}
        />

        {/* Camera UI Controls Overlay */}
        <SafeAreaView style={styles.cameraOverlaySafe} pointerEvents="box-none">
          {/* Top Navigation Bar */}
          <View style={styles.topControlBar}>
            <TouchableOpacity style={styles.glassCircleButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerTitleBadge}>
              <Ionicons name="sparkles" size={15} color={Theme.colors.primaryGreen} />
              <Text style={styles.headerTitleText}>AI Food Scanner</Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Flash Button */}
              <TouchableOpacity
                style={[styles.glassCircleButton, isFlashOn && styles.glassButtonActive]}
                onPress={handleToggleFlash}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isFlashOn ? 'flash' : 'flash-off'}
                  size={18}
                  color={isFlashOn ? '#F59E0B' : '#FFFFFF'}
                />
              </TouchableOpacity>

              {/* Camera Switch */}
              <TouchableOpacity
                style={styles.glassCircleButton}
                onPress={handleToggleFacing}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-reverse" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Food Reticle Guide */}
          <View style={styles.reticleContainer} pointerEvents="none">
            <View style={styles.reticleBox}>
              <View style={[styles.cornerGuide, styles.topLeftCorner]} />
              <View style={[styles.cornerGuide, styles.topRightCorner]} />
              <View style={[styles.cornerGuide, styles.bottomLeftCorner]} />
              <View style={[styles.cornerGuide, styles.bottomRightCorner]} />

              <View style={styles.guideTextPill}>
                <Ionicons name="scan-outline" size={14} color="#FFFFFF" />
                <Text style={styles.guideText}>Point camera at your food</Text>
              </View>
            </View>
          </View>

          {/* Bottom Area: Note Input, Sample Chips, Gallery Picker, & Camera Capture */}
          <View style={styles.bottomCameraControls} pointerEvents="box-none">
            {/* Optional Meal Note Input */}
            <View style={styles.noteInputContainer}>
              <Ionicons name="create-outline" size={16} color="rgba(255, 255, 255, 0.7)" />
              <TextInput
                style={styles.noteInput}
                placeholder="Optional dish note (e.g. 2 eggs, avocado toast)..."
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={userMealNote}
                onChangeText={setUserMealNote}
                returnKeyType="done"
              />
              {userMealNote.length > 0 && (
                <TouchableOpacity onPress={() => setUserMealNote('')}>
                  <Ionicons name="close-circle" size={16} color="rgba(255, 255, 255, 0.7)" />
                </TouchableOpacity>
              )}
            </View>

            {/* Sample Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sampleChipsScroll}
            >
              {SAMPLE_MEALS.map((sample, idx) => (
                <TouchableOpacity
                  key={`sample-chip-${idx}`}
                  style={styles.sampleChip}
                  onPress={() => handleSelectSampleMeal(sample)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.sampleChipText}>{sample.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Action Row: Gallery Upload & Capture Button */}
            <View style={styles.captureActionRow}>
              {/* Gallery Button */}
              <TouchableOpacity
                style={styles.gallerySquareButton}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
                accessibilityLabel="Choose from photo gallery"
              >
                <Ionicons name="images" size={22} color="#FFFFFF" />
                <Text style={styles.galleryButtonText}>Gallery</Text>
              </TouchableOpacity>

              {/* Capture Circular Button */}
              <View style={styles.captureFabWrapper}>
                <TouchableOpacity
                  style={styles.captureFabOuter}
                  onPress={handleCapturePhoto}
                  activeOpacity={0.85}
                  accessibilityLabel="Capture Food Photo"
                >
                  <View style={styles.captureFabInner}>
                    <Ionicons name="camera" size={32} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.captureFabLabel}>Take Photo</Text>
              </View>

              {/* Placeholder to balance row */}
              <View style={{ width: 64 }} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  cameraScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraOverlaySafe: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
  },
  topControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  glassCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  glassButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    borderColor: '#F59E0B',
  },
  headerTitleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitleText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
  },
  reticleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  reticleBox: {
    width: 270,
    height: 270,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cornerGuide: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: Theme.colors.primaryGreen,
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  guideTextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomCameraControls: {
    alignItems: 'center',
    gap: 10,
  },
  noteInputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  noteInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    paddingVertical: 0,
  },
  sampleChipsScroll: {
    gap: 8,
    paddingHorizontal: 4,
  },
  sampleChip: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sampleChipText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  captureActionRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  gallerySquareButton: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  galleryButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  captureFabWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  captureFabOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(31, 107, 79, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(47, 138, 100, 0.6)',
  },
  captureFabInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.elevated,
  },
  captureFabLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  permissionContainer: {
    flex: 1,
    paddingHorizontal: Theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonTop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
  },
  permissionTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionSubtitle: {
    fontSize: Theme.typography.sizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.xl,
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.primaryGreen,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.elevated,
    marginBottom: 12,
    width: '100%',
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.base,
    fontWeight: '700',
  },
  galleryButtonAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.lg,
    width: '100%',
  },
  galleryButtonAltText: {
    color: Theme.colors.primaryGreen,
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
  },
  sampleDemoWrapper: {
    width: '100%',
    alignItems: 'center',
    gap: 8,
  },
  sampleDemoTitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  sampleTestButton: {
    backgroundColor: Theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  sampleTestButtonText: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    padding: Theme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingImagePreview: {
    width: 220,
    height: 180,
    borderRadius: Theme.borderRadius.xl,
    marginBottom: Theme.spacing.xl,
  },
  analyzingCard: {
    width: '100%',
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    ...Theme.shadows.soft,
  },
  analyzingTitle: {
    fontSize: Theme.typography.sizes.md,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  analyzingSubtitle: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Theme.spacing.lg,
  },
  analyzingSteps: {
    width: '100%',
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepText: {
    fontSize: Theme.typography.sizes.xs,
    color: Theme.colors.textPrimary,
    fontWeight: '600',
  },
  resultsScroll: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    paddingBottom: Theme.spacing.xxxl,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  geminiBadgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
  },
  geminiBadgeHeaderText: {
    fontSize: Theme.typography.sizes.xs,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
  },
  resetButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  mealHeroCard: {
    width: '100%',
    height: 190,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.card,
  },
  mealHeroImage: {
    width: '100%',
    height: '100%',
  },
  mealHeroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(28, 28, 26, 0.45)',
    padding: Theme.spacing.base,
    justifyContent: 'flex-end',
  },
  mealHeroName: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  calorieBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EA580C',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
  },
  calorieBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  qualityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: Theme.colors.surface,
  },
  qualityBadgeGood: {
    backgroundColor: Theme.colors.lightGreen,
  },
  qualityBadgeModerate: {
    backgroundColor: '#FEF3C7',
  },
  qualityBadgePoor: {
    backgroundColor: '#FEE2E2',
  },
  qualityBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  qualityTextGood: {
    color: Theme.colors.primaryGreenDark,
  },
  qualityTextModerate: {
    color: '#B45309',
  },
  qualityTextPoor: {
    color: '#B91C1C',
  },
  sectionHeading: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  macrosSection: {
    marginBottom: Theme.spacing.md,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: Theme.borderRadius.lg,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    alignItems: 'center',
    ...Theme.shadows.soft,
  },
  macroCardValue: {
    fontSize: Theme.typography.sizes.base,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  macroCardLabel: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  coachingCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.soft,
  },
  coachingCardGood: {
    borderColor: 'rgba(31, 107, 79, 0.3)',
  },
  coachingCardPoor: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: '#FFF7F7',
  },
  coachingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  coachingIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachingCardTitle: {
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '800',
  },
  coachingCardScore: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 1,
  },
  coachingBodyText: {
    fontSize: Theme.typography.sizes.xs + 1,
    color: Theme.colors.textPrimary,
    lineHeight: 20,
    marginBottom: 10,
  },
  swapsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 10,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    gap: 6,
  },
  swapsHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 2,
  },
  swapItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  swapItemText: {
    flex: 1,
    fontSize: 11,
    color: Theme.colors.textSecondary,
    lineHeight: 16,
  },
  itemsBreakdownCard: {
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.base,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.soft,
  },
  itemsList: {
    gap: 8,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  foodItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.primaryGreen,
  },
  foodItemName: {
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  foodItemPortion: {
    fontSize: 10,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  foodItemCalories: {
    fontSize: Theme.typography.sizes.xs + 1,
    fontWeight: '700',
    color: Theme.colors.primaryGreenDark,
  },
  bottomActions: {
    gap: 10,
    marginTop: Theme.spacing.xs,
  },
  logMealButton: {
    backgroundColor: Theme.colors.primaryGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    ...Theme.shadows.elevated,
  },
  logMealButtonSaved: {
    backgroundColor: '#059669',
  },
  logMealButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.md,
    fontWeight: '700',
  },
  scanAnotherButton: {
    backgroundColor: Theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.base,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  scanAnotherButtonText: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
  },
});
