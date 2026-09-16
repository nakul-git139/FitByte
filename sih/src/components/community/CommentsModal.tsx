import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CommunityPost, CommunityComment } from '../../types/community';
import { User } from '../../types/auth';
import { CommunityService } from '../../services/communityService';
import { CommunitySocketService } from '../../services/communitySocketService';
import { formatTimeAgo } from './PostCard';
import { Theme } from '../../config/theme';

interface CommentsModalProps {
  visible: boolean;
  post: CommunityPost | null;
  currentUser: User | null;
  onClose: () => void;
  onCommentsCountUpdated?: (postId: string, newCount: number) => void;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({
  visible,
  post,
  currentUser,
  onClose,
  onCommentsCountUpdated,
}) => {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentText, setCommentText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (visible && post) {
      loadComments(post.id);

      // Subscribe to live comments for this post
      const unsubCommentCreated = CommunitySocketService.onCommentCreated((payload) => {
        if (payload.postId === post.id) {
          setComments((prev) => {
            if (prev.some((c) => c.id === payload.comment.id)) return prev;
            const updated = [...prev, payload.comment];
            if (onCommentsCountUpdated) {
              onCommentsCountUpdated(post.id, updated.length);
            }
            return updated;
          });
        }
      });

      const unsubCommentDeleted = CommunitySocketService.onCommentDeleted((payload) => {
        if (payload.postId === post.id) {
          setComments((prev) => {
            const updated = prev.filter((c) => c.id !== payload.commentId);
            if (onCommentsCountUpdated) {
              onCommentsCountUpdated(post.id, updated.length);
            }
            return updated;
          });
        }
      });

      return () => {
        unsubCommentCreated();
        unsubCommentDeleted();
      };
    } else {
      setComments([]);
      setCommentText('');
    }
  }, [visible, post]);

  const loadComments = async (postId: string) => {
    setIsLoading(true);
    try {
      const res = await CommunityService.getComments(postId);
      if (res.success && Array.isArray(res.comments)) {
        setComments(res.comments);
      }
    } catch (e) {
      console.warn('[CommentsModal] Error loading comments:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!post || !commentText.trim() || isSubmitting) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const textToSend = commentText.trim();
    setCommentText('');
    setIsSubmitting(true);

    try {
      const res = await CommunityService.addComment(post.id, { text: textToSend });
      if (res.success && res.comment) {
        const updated = [...comments, res.comment];
        setComments(updated);

        if (onCommentsCountUpdated) {
          onCommentsCountUpdated(post.id, updated.length);
        }

        // Scroll to end
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('Error', res.error || 'Failed to post comment');
        setCommentText(textToSend); // Restore text on failure
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error posting comment');
      setCommentText(textToSend);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!post || deletingId) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Are you sure you want to delete this comment?');
      if (confirmDelete) {
        executeDeleteComment(commentId);
      }
    } else {
      Alert.alert(
        'Delete Comment',
        'Are you sure you want to delete this comment?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => executeDeleteComment(commentId),
          },
        ]
      );
    }
  };

  const executeDeleteComment = async (commentId: string) => {
    if (!post || deletingId) return;
    setDeletingId(commentId);
    try {
      const res = await CommunityService.deleteComment(commentId);
      if (res.success) {
        const updated = comments.filter((c) => c.id !== commentId);
        setComments(updated);

        if (onCommentsCountUpdated) {
          onCommentsCountUpdated(post.id, updated.length);
        }
      } else {
        Alert.alert('Error', res.error || 'Unable to delete comment');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error deleting comment');
    } finally {
      setDeletingId(null);
    }
  };

  const renderCommentItem = ({ item }: { item: CommunityComment }) => {
    const isCommentOwner =
      currentUser && (currentUser.id === item.userId || currentUser.email === item.userId);
    const initial = (item.userName || 'A').charAt(0).toUpperCase();

    return (
      <View style={styles.commentItem}>
        {item.userAvatar ? (
          <Image source={{ uri: item.userAvatar }} style={styles.commentAvatar} />
        ) : (
          <View style={styles.commentAvatarPlaceholder}>
            <Text style={styles.commentAvatarText}>{initial}</Text>
          </View>
        )}

        <View style={styles.commentContent}>
          <View style={styles.commentHeaderRow}>
            <Text style={styles.commentAuthor}>{item.userName || 'FitPilot Athlete'}</Text>
            <Text style={styles.commentTime}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.commentText}>{item.text}</Text>
        </View>

        {isCommentOwner && (
          <TouchableOpacity
            style={styles.deleteCommentBtn}
            onPress={() => handleDeleteComment(item.id)}
            disabled={deletingId === item.id}
          >
            {deletingId === item.id ? (
              <ActivityIndicator size="small" color={Theme.colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={15} color={Theme.colors.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Modal Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments ({comments.length})</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Comments List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primaryGreen} />
            <Text style={styles.loadingText}>Loading comments...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderCommentItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={48} color={Theme.colors.textMuted} />
                <Text style={styles.emptyTitle}>No comments yet</Text>
                <Text style={styles.emptySubtitle}>Be the first to say something encouraging!</Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Add an encouraging comment..."
            placeholderTextColor={Theme.colors.textMuted}
            value={commentText}
            onChangeText={setCommentText}
            maxLength={1000}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!commentText.trim() || isSubmitting) && styles.sendBtnDisabled,
            ]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
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
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Theme.colors.textMuted,
  },
  listContent: {
    padding: Theme.spacing.base,
    paddingBottom: 24,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    textAlign: 'center',
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
    gap: 12,
  },
  commentAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Theme.colors.surfaceSecondary,
  },
  commentAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.primaryGreen,
  },
  commentContent: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  commentTime: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  commentText: {
    fontSize: 14,
    color: Theme.colors.textPrimary,
    lineHeight: 19,
  },
  deleteCommentBtn: {
    padding: 6,
    alignSelf: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderSubtle,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceSecondary,
    borderRadius: Theme.borderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: Theme.colors.textPrimary,
    maxHeight: 90,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Theme.colors.borderSubtle,
  },
});
