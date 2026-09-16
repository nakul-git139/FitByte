import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { CommunityService } from '../../services/communityService';
import { CommunityPost } from '../../types/community';
import { Theme } from '../../config/theme';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onPostCreated: (newPost: CommunityPost) => void;
}

const SAMPLE_PRESETS = [
  {
    label: '🏋️‍♂️ Squats PR',
    url: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80',
    caption: 'Crushed 50 consecutive bodyweight squats today with 95% form score! Feeling the burn 🔥💪 #SquatChallenge',
  },
  {
    label: '🏃 Calisthenics Flow',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80',
    caption: 'Morning calisthenics routine completed. Push-ups, lunges, and plank holds. Energy is through the roof! ⚡',
  },
  {
    label: '🔥 Core & Abs',
    url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80',
    caption: 'Day 5 daily streak active! 3-minute continuous plank and mountain climbers. Consistency is key 🎯',
  },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  visible,
  onClose,
  onPostCreated,
}) => {
  const [caption, setCaption] = useState<string>('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittingStep, setSubmittingStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setCaption('');
    setSelectedImageUri(null);
    setImageBase64(null);
    setErrorMessage(null);
    setIsSubmitting(false);
    setSubmittingStep('');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handlePickFromGallery = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setErrorMessage(null);
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
        setSelectedImageUri(asset.uri);
        setImageBase64(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null);
      }
    } catch (err: any) {
      console.warn('[CreatePostModal] Picker error:', err.message);
      setErrorMessage('Failed to open photo library. You can also pick a sample preset.');
    }
  };

  const handleSelectPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    setSelectedImageUri(preset.url);
    setImageBase64(null);
    if (!caption.trim()) {
      setCaption(preset.caption);
    }
    setErrorMessage(null);
  };

  const handleRemoveImage = () => {
    if (isSubmitting) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedImageUri(null);
    setImageBase64(null);
  };

  const handleSubmitPost = async () => {
    if (isSubmitting) return;

    if (!caption.trim()) {
      setErrorMessage('Please add a short caption or workout note.');
      return;
    }

    if (caption.trim().length > 2000) {
      setErrorMessage('Caption cannot exceed 2,000 characters.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsSubmitting(true);
    setSubmittingStep('Preparing workout post...');
    setErrorMessage(null);

    try {
      let finalImageUrl = selectedImageUri || '';

      // If local gallery base64 image, upload it
      if (imageBase64) {
        setSubmittingStep('Uploading workout photo...');
        try {
          const uploadRes = await CommunityService.uploadImage(imageBase64);
          if (uploadRes.success && uploadRes.imageUrl) {
            finalImageUrl = uploadRes.imageUrl;
          }
        } catch (uploadErr) {
          console.warn('[CreatePostModal] Photo upload fallback:', uploadErr);
          // Fallback to local image URI
          finalImageUrl = selectedImageUri || '';
        }
      }

      setSubmittingStep('Publishing to community...');
      // Create post via service
      const res = await CommunityService.createPost({
        caption: caption.trim(),
        imageUrl: finalImageUrl,
      });

      if (res.success && res.post) {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
        onPostCreated(res.post);
        handleClose();
      } else {
        throw new Error(res.error || 'Failed to publish post');
      }
    } catch (err: any) {
      console.error('[CreatePostModal] Error creating post:', err.message);
      setErrorMessage(err.message || 'Error publishing post. Please try again.');
    } finally {
      setIsSubmitting(false);
      setSubmittingStep('');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.cancelBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>New Post</Text>

          <TouchableOpacity
            onPress={handleSubmitPost}
            disabled={isSubmitting || !caption.trim()}
            style={[
              styles.publishBtn,
              (!caption.trim() || isSubmitting) && styles.publishBtnDisabled,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.publishBtnText}>Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Submitting Progress Banner */}
          {isSubmitting && (
            <View style={styles.progressBanner}>
              <ActivityIndicator size="small" color={Theme.colors.primaryGreen} />
              <Text style={styles.progressText}>{submittingStep || 'Publishing workout post...'}</Text>
            </View>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={Theme.colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Image Picker / Preview Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Workout Photo</Text>

            {selectedImageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImageUri }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity style={styles.removeImageBtn} onPress={handleRemoveImage}>
                  <Ionicons name="close-circle" size={26} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pickerBox}>
                <TouchableOpacity style={styles.uploadTrigger} onPress={handlePickFromGallery}>
                  <View style={styles.uploadIconCircle}>
                    <Ionicons name="camera-outline" size={28} color={Theme.colors.primaryGreen} />
                  </View>
                  <Text style={styles.uploadTitle}>Upload Workout Photo</Text>
                  <Text style={styles.uploadSubtitle}>Choose from photo library</Text>
                </TouchableOpacity>

                {/* Preset Chips */}
                <View style={styles.presetSection}>
                  <Text style={styles.presetHeading}>Or pick a workout preset:</Text>
                  <View style={styles.presetRow}>
                    {SAMPLE_PRESETS.map((preset, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.presetChip}
                        onPress={() => handleSelectPreset(preset)}
                      >
                        <Text style={styles.presetChipText}>{preset.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Caption Input */}
          <View style={styles.section}>
            <View style={styles.captionHeader}>
              <Text style={styles.sectionLabel}>Caption & Notes</Text>
              <Text style={styles.charCount}>{caption.length}/2000</Text>
            </View>

            <TextInput
              style={styles.captionInput}
              placeholder="Share your achievements, reps, form milestones, or motivational message..."
              placeholderTextColor={Theme.colors.textMuted}
              multiline
              numberOfLines={4}
              maxLength={2000}
              value={caption}
              onChangeText={setCaption}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.base,
    paddingTop: Platform.OS === 'ios' ? 54 : 16,
    paddingBottom: 14,
    backgroundColor: Theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderSubtle,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelBtnText: {
    fontSize: 15,
    color: Theme.colors.textSecondary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  publishBtn: {
    backgroundColor: Theme.colors.primaryGreen,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.full,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishBtnDisabled: {
    backgroundColor: Theme.colors.borderSubtle,
  },
  publishBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: Theme.spacing.base,
  },
  progressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.lightGreen,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
    gap: 10,
    borderWidth: 1,
    borderColor: Theme.colors.primaryGreen,
  },
  progressText: {
    fontSize: 13,
    color: Theme.colors.primaryGreenDark,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.errorLight,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    marginBottom: Theme.spacing.md,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: Theme.colors.error,
    fontWeight: '500',
  },
  section: {
    marginBottom: Theme.spacing.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  pickerBox: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderSubtle,
    borderStyle: 'dashed',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.lg,
    alignItems: 'center',
  },
  uploadTrigger: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  presetSection: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderLight,
    paddingTop: Theme.spacing.md,
    marginTop: Theme.spacing.md,
    alignItems: 'center',
  },
  presetHeading: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginBottom: Theme.spacing.sm,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  presetChip: {
    backgroundColor: Theme.colors.surfaceSecondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Theme.borderRadius.full,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: Theme.colors.textPrimary,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    height: 260,
    backgroundColor: '#0F172A',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
  },
  captionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  charCount: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  captionInput: {
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    fontSize: 14,
    color: Theme.colors.textPrimary,
    minHeight: 110,
    lineHeight: 20,
  },
});
