import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FoodAnalysisResult, UserFitnessProfileContext } from '../types/food';
import { FoodAnalysisService } from '../services/foodAnalysisService';
import { Theme } from '../config/theme';

interface FoodScannerScreenProps {
  userProfile?: UserFitnessProfileContext;
  onAnalysisComplete: (result: FoodAnalysisResult) => void;
  onBack: () => void;
}

const SAMPLE_MEALS = [
  {
    name: 'Grilled Chicken & Quinoa Salad',
    photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Oatmeal with Berries & Nuts',
    photoUrl: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Salmon with Avocado & Greens',
    photoUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80',
  },
];

export const FoodScannerScreen: React.FC<FoodScannerScreenProps> = ({
  userProfile,
  onAnalysisComplete,
  onBack,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [selectedMealType, setSelectedMealType] = useState<string>('Lunch');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingStep, setAnalyzingStep] = useState<string>('Examining food photo...');
  const cameraRef = useRef<any>(null);

  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  const handleCapture = async () => {
    if (isAnalyzing) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}

    setIsAnalyzing(true);
    setAnalyzingStep('Capturing meal photo...');

    try {
      let base64Image = '';
      let photoUri = '';

      if (cameraRef.current) {
        try {
          const photo = await cameraRef.current.takePictureAsync({
            base64: true,
            quality: 0.7,
            skipProcessing: false,
          });
          if (photo && photo.base64) {
            base64Image = photo.base64;
            photoUri = photo.uri;
          }
        } catch (camErr) {
          console.warn('[FoodScanner] Camera capture error, using sample image fallback:', camErr);
        }
      }

      setAnalyzingStep('Gemini AI analyzing ingredients & portions...');
      const stepTimer = setTimeout(() => {
        setAnalyzingStep('Estimating calories, macros & coach feedback...');
      }, 2000);

      const result = await FoodAnalysisService.analyzeMeal({
        imageBase64: base64Image,
        mimeType: 'image/jpeg',
        userProfile,
        mealType: selectedMealType,
        photoUri: photoUri || SAMPLE_MEALS[0].photoUrl,
      });

      clearTimeout(stepTimer);
      setIsAnalyzing(false);
      onAnalysisComplete(result);
    } catch (err: any) {
      console.error('[FoodScanner] Analysis error:', err);
      setIsAnalyzing(false);
      Alert.alert('Analysis Notice', 'Analyzing local nutritional breakdown...');
      const fallbackResult = FoodAnalysisService.getLocalFallbackAnalysis(userProfile, SAMPLE_MEALS[0].photoUrl);
      onAnalysisComplete(fallbackResult);
    }
  };

  const handleSelectSample = async (sample: typeof SAMPLE_MEALS[0]) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsAnalyzing(true);
    setAnalyzingStep(`Analyzing ${sample.name}...`);

    const result = await FoodAnalysisService.analyzeMeal({
      imageBase64: '',
      userProfile,
      mealType: selectedMealType,
      photoUri: sample.photoUrl,
    });

    setIsAnalyzing(false);
    onAnalysisComplete(result);
  };

  const toggleFacing = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFacing((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const toggleFlash = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  return (
    <View style={styles.container}>
      {/* 1. Camera View with Framing Reticle */}
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={flash === 'on'}
        />
      ) : (
        <View style={styles.permissionFallback}>
          <Image
            source={{ uri: SAMPLE_MEALS[0].photoUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.permissionOverlay}>
            <Ionicons name="camera-outline" size={48} color={Theme.colors.primaryGreen} />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionDesc}>
              Allow FitPilot to access your camera to scan and estimate meal calories instantly.
            </Text>
            <TouchableOpacity
              style={styles.grantButton}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.grantButtonText}>Enable Camera</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. Top Header Navigation Controls */}
      <SafeAreaView style={styles.safeTopBar} edges={['top', 'left', 'right']}>
        <View style={styles.topBarRow}>
          <TouchableOpacity style={styles.iconCircle} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitlePill}>
            <Ionicons name="restaurant-outline" size={15} color={Theme.colors.primaryGreen} />
            <Text style={styles.headerTitleText}>Scan Food</Text>
          </View>

          <View style={styles.topRightControls}>
            <TouchableOpacity
              style={[styles.iconCircle, flash === 'on' && styles.iconActive]}
              onPress={toggleFlash}
              activeOpacity={0.7}
            >
              <Ionicons
                name={flash === 'on' ? 'flash' : 'flash-off'}
                size={18}
                color={flash === 'on' ? Theme.colors.primaryGreen : '#FFFFFF'}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconCircle} onPress={toggleFacing} activeOpacity={0.7}>
              <Ionicons name="camera-reverse" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Meal Type Selector Chips */}
        <View style={styles.mealTypeRow}>
          {mealTypes.map((type) => {
            const isSelected = selectedMealType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.mealTypeChip, isSelected && styles.mealTypeChipSelected]}
                onPress={() => setSelectedMealType(type)}
                activeOpacity={0.8}
              >
                <Text style={[styles.mealTypeText, isSelected && styles.mealTypeTextSelected]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>

      {/* 3. Center Framing Reticle Guide */}
      <View style={styles.reticleContainer} pointerEvents="none">
        <View style={styles.reticleBox}>
          {/* 4 Corner Accents */}
          <View style={[styles.cornerBracket, styles.topLeft]} />
          <View style={[styles.cornerBracket, styles.topRight]} />
          <View style={[styles.cornerBracket, styles.bottomLeft]} />
          <View style={[styles.cornerBracket, styles.bottomRight]} />

          <View style={styles.reticleHintBox}>
            <Text style={styles.reticleHintText}>
              Center meal inside the frame for best calorie accuracy
            </Text>
          </View>
        </View>
      </View>

      {/* 4. Bottom Controls & Capture Shutter */}
      <SafeAreaView style={styles.safeBottomControls} edges={['bottom', 'left', 'right']}>
        {/* Quick Sample Meals Carousel for Testing */}
        <View style={styles.sampleCarouselContainer}>
          <Text style={styles.sampleSectionTitle}>Or choose a sample meal:</Text>
          <View style={styles.sampleChipsRow}>
            {SAMPLE_MEALS.map((sample, idx) => (
              <TouchableOpacity
                key={`sample-${idx}`}
                style={styles.sampleChip}
                onPress={() => handleSelectSample(sample)}
                activeOpacity={0.8}
              >
                <Image source={{ uri: sample.photoUrl }} style={styles.sampleThumb} />
                <Text style={styles.sampleChipText} numberOfLines={1}>
                  {sample.name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shutter Button */}
        <View style={styles.shutterWrapper}>
          <TouchableOpacity
            style={styles.shutterOuter}
            onPress={handleCapture}
            activeOpacity={0.85}
            disabled={isAnalyzing}
          >
            <View style={styles.shutterInner}>
              <Ionicons name="scan" size={30} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={styles.shutterLabel}>Analyze Meal</Text>
        </View>
      </SafeAreaView>

      {/* 5. Analyzing Loading Modal Overlay */}
      {isAnalyzing && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={Theme.colors.primaryGreen} />
            <Text style={styles.loadingTitle}>AI Food Analysis</Text>
            <Text style={styles.loadingSubtitle}>{analyzingStep}</Text>
            <View style={styles.loadingPillsRow}>
              <View style={styles.loadingPill}>
                <Ionicons name="sparkles" size={12} color={Theme.colors.primaryGreen} />
                <Text style={styles.loadingPillText}>Gemini Vision</Text>
              </View>
              <View style={styles.loadingPill}>
                <Ionicons name="fitness-outline" size={12} color={Theme.colors.primaryGreen} />
                <Text style={styles.loadingPillText}>Macro Estimation</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  permissionFallback: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  permissionTitle: {
    fontSize: Theme.typography.sizes.xl,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  permissionDesc: {
    fontSize: Theme.typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.75)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.lg,
  },
  grantButton: {
    backgroundColor: Theme.colors.primaryGreen,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.md,
    borderRadius: Theme.borderRadius.full,
    ...Theme.shadows.elevated,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.sm,
    fontWeight: '700',
  },
  safeTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xs,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconActive: {
    backgroundColor: 'rgba(31, 107, 79, 0.4)',
    borderColor: Theme.colors.primaryGreen,
  },
  headerTitlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 16,
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
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTypeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  mealTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.full,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  mealTypeChipSelected: {
    backgroundColor: Theme.colors.primaryGreen,
    borderColor: Theme.colors.primaryGreen,
  },
  mealTypeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  mealTypeTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reticleContainer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  reticleBox: {
    width: 270,
    height: 270,
    borderRadius: 24,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
  },
  cornerBracket: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderColor: Theme.colors.primaryGreen,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderTopLeftRadius: 16,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderTopRightRadius: 16,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderBottomLeftRadius: 16,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderBottomRightRadius: 16,
  },
  reticleHintBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.borderRadius.md,
    maxWidth: 220,
  },
  reticleHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
  },
  safeBottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 20,
  },
  sampleCarouselContainer: {
    width: '100%',
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: 16,
    alignItems: 'center',
  },
  sampleSectionTitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
  },
  sampleChipsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sampleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingRight: 10,
    paddingLeft: 4,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sampleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  sampleChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  shutterWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  shutterOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(31, 107, 79, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(47, 138, 100, 0.6)',
  },
  shutterInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.elevated,
  },
  shutterLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    zIndex: 50,
  },
  loadingCard: {
    backgroundColor: '#1E293B',
    padding: Theme.spacing.xl,
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    ...Theme.shadows.elevated,
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: Theme.typography.sizes.lg,
    fontWeight: '800',
    marginTop: Theme.spacing.md,
    marginBottom: 4,
  },
  loadingSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: Theme.typography.sizes.xs + 1,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
    lineHeight: 18,
  },
  loadingPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(31, 107, 79, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(31, 107, 79, 0.4)',
  },
  loadingPillText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
});
