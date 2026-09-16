import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CommunityPost } from '../../types/community';
import { CommunityService } from '../../services/communityService';
import { Theme } from '../../config/theme';

interface ReportModalProps {
  visible: boolean;
  post: CommunityPost | null;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Inappropriate or offensive content',
  'Spam or misleading promotion',
  'Harassment or disrespectful behavior',
  'Dangerous workout or false fitness advice',
  'Other reason',
];

export const ReportModal: React.FC<ReportModalProps> = ({
  visible,
  post,
  onClose,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]);
  const [customDetails, setCustomDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSelectReason = (reason: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setSelectedReason(reason);
  };

  const handleSubmit = async () => {
    if (!post || isSubmitting) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    setIsSubmitting(true);

    const finalReason = customDetails.trim()
      ? `${selectedReason}: ${customDetails.trim()}`
      : selectedReason;

    try {
      const res = await CommunityService.reportContent({
        postId: post.id,
        reason: finalReason,
      });

      if (res.success) {
        Alert.alert(
          'Report Received',
          'Thank you for helping keep the FitPilot community positive and safe. Our moderation team has been notified.',
          [{ text: 'OK', onPress: onClose }]
        );
      } else {
        Alert.alert('Error', res.error || 'Failed to submit report. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="flag" size={20} color={Theme.colors.warning} />
            </View>
            <Text style={styles.title}>Report Content</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Theme.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Please select the reason for reporting this post by{' '}
            <Text style={styles.authorHighlight}>{post?.userName || 'this athlete'}</Text>:
          </Text>

          {/* Reason Radio Options */}
          <View style={styles.reasonList}>
            {REPORT_REASONS.map((reason, idx) => {
              const isSelected = selectedReason === reason;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                  onPress={() => handleSelectReason(reason)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={isSelected ? Theme.colors.primaryGreen : Theme.colors.textMuted}
                  />
                  <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                    {reason}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Additional details (optional) */}
          {selectedReason === 'Other reason' && (
            <TextInput
              style={styles.detailsInput}
              placeholder="Provide additional details..."
              placeholderTextColor={Theme.colors.textMuted}
              value={customDetails}
              onChangeText={setCustomDetails}
              maxLength={200}
            />
          )}

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    ...Theme.shadows.elevated,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Theme.colors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  closeBtn: {
    padding: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: Theme.spacing.md,
  },
  authorHighlight: {
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  reasonList: {
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    gap: 10,
  },
  reasonOptionSelected: {
    backgroundColor: Theme.colors.lightGreen,
    borderColor: Theme.colors.primaryGreen,
  },
  reasonText: {
    fontSize: 13,
    color: Theme.colors.textPrimary,
    flex: 1,
  },
  reasonTextSelected: {
    fontWeight: '600',
    color: Theme.colors.primaryGreen,
  },
  detailsInput: {
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.md,
    fontSize: 13,
    color: Theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: Theme.spacing.sm,
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.md,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  submitBtn: {
    backgroundColor: Theme.colors.primaryGreen,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
