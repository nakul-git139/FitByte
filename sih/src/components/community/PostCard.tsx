import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CommunityPost } from '../../types/community';
import { User } from '../../types/auth';
import { CommunityService } from '../../services/communityService';
import { getBackendBaseUrl } from '../../config/apiConfig';
import { Theme } from '../../config/theme';

interface PostCardProps {
  post: CommunityPost;
  currentUser: User | null;
  onPostDeleted?: (postId: string) => void;
  onOpenComments?: (post: CommunityPost) => void;
  onOpenReport?: (post: CommunityPost) => void;
  onPostUpdated?: (updatedPost: CommunityPost) => void;
}

export function formatTimeAgo(isoDate: string): string {
  try {
    const now = Date.now();
    const date = new Date(isoDate).getTime();
    const diffSeconds = Math.max(0, Math.floor((now - date) / 1000));

    if (diffSeconds < 60) return 'Just now';
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  currentUser,
  onPostDeleted,
  onOpenComments,
  onOpenReport,
  onPostUpdated,
}) => {
  const [isLiked, setIsLiked] = useState<boolean>(!!post.isLikedByMe);
  const [likesCount, setLikesCount] = useState<number>(post.likesCount || 0);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);

  const isOwner = currentUser && (currentUser.id === post.userId || currentUser.email === post.userId);

  // Compute absolute image URL if relative upload path
  const getFullImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
      return url;
    }
    const baseUrl = getBackendBaseUrl();
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleToggleLike = async () => {
    if (isLiking) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic UI update
    const newLiked = !previousLiked;
    const newCount = newLiked ? previousCount + 1 : Math.max(0, previousCount - 1);

    setIsLiked(newLiked);
    setLikesCount(newCount);
    setIsLiking(true);

    try {
      if (newLiked) {
        const res = await CommunityService.likePost(post.id);
        if (!res.success) {
          // Revert
          setIsLiked(previousLiked);
          setLikesCount(previousCount);
        } else if (typeof res.likesCount === 'number') {
          setLikesCount(res.likesCount);
          if (onPostUpdated) {
            onPostUpdated({ ...post, isLikedByMe: true, likesCount: res.likesCount });
          }
        }
      } else {
        const res = await CommunityService.unlikePost(post.id);
        if (!res.success) {
          // Revert
          setIsLiked(previousLiked);
          setLikesCount(previousCount);
        } else if (typeof res.likesCount === 'number') {
          setLikesCount(res.likesCount);
          if (onPostUpdated) {
            onPostUpdated({ ...post, isLikedByMe: false, likesCount: res.likesCount });
          }
        }
      }
    } catch (e) {
      // Revert
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDeletePress = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {}

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('Are you sure you want to delete this post? This action cannot be undone.');
      if (confirmDelete) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Post',
        'Are you sure you want to delete this workout post? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: executeDelete,
          },
        ]
      );
    }
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await CommunityService.deletePost(post.id);
      if (res.success) {
        if (onPostDeleted) {
          onPostDeleted(post.id);
        }
      } else {
        Alert.alert('Delete Failed', res.error || 'Unable to delete post. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error deleting post');
    } finally {
      setIsDeleting(false);
    }
  };

  const userInitial = (post.userName || 'A').charAt(0).toUpperCase();
  const fullImageUrl = getFullImageUrl(post.imageUrl);

  return (
    <View style={styles.card}>
      {/* 1. Header: User Avatar, Name, Relative Time, Actions */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {post.userAvatar ? (
            <Image source={{ uri: post.userAvatar }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{userInitial}</Text>
            </View>
          )}

          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {post.userName || 'FitPilot Athlete'}
              </Text>
              {isOwner && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>YOU</Text>
                </View>
              )}
            </View>
            <Text style={styles.timeAgo}>{formatTimeAgo(post.createdAt)}</Text>
          </View>
        </View>

        {/* Action Menu: Delete (owner) or Report (other) */}
        {isOwner ? (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleDeletePress}
            disabled={isDeleting}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={Theme.colors.error} />
            ) : (
              <Ionicons name="trash-outline" size={18} color={Theme.colors.error} />
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => onOpenReport && onOpenReport(post)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={Theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 2. Post Image */}
      {fullImageUrl ? (
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: fullImageUrl }}
            style={styles.postImage}
            resizeMode="cover"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageLoading(false);
              setImageError(true);
            }}
          />

          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="small" color={Theme.colors.primaryGreen} />
            </View>
          )}

          {imageError && (
            <View style={styles.imageFallbackOverlay}>
              <Ionicons name="image-outline" size={32} color={Theme.colors.textMuted} />
              <Text style={styles.imageFallbackText}>Image unavailable</Text>
            </View>
          )}
        </View>
      ) : null}

      {/* 3. Caption Text */}
      {post.caption ? (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>{post.caption}</Text>
        </View>
      ) : null}

      {/* 4. Action Bar (Likes & Comments) */}
      <View style={styles.actionBar}>
        {/* Like Button */}
        <TouchableOpacity
          style={[styles.actionBtn, isLiked && styles.actionBtnLiked]}
          onPress={handleToggleLike}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? '#E11D48' : Theme.colors.textSecondary}
          />
          <Text style={[styles.actionCount, isLiked && styles.actionCountLiked]}>
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </Text>
        </TouchableOpacity>

        {/* Comments Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onOpenComments && onOpenComments(post)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={18} color={Theme.colors.textSecondary} />
          <Text style={styles.actionCount}>
            {post.commentsCount || 0} {post.commentsCount === 1 ? 'comment' : 'comments'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
    ...Theme.shadows.soft,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.base,
    paddingTop: Theme.spacing.base,
    paddingBottom: Theme.spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: Theme.colors.primaryGreen,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: Theme.spacing.md,
    backgroundColor: Theme.colors.surfaceSecondary,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.primaryGreen,
  },
  nameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  youBadge: {
    backgroundColor: Theme.colors.lightGreen,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Theme.borderRadius.xs,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Theme.colors.primaryGreen,
  },
  timeAgo: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 1,
  },
  menuButton: {
    padding: 6,
    borderRadius: Theme.borderRadius.sm,
  },
  imageWrapper: {
    width: '100%',
    height: 320,
    backgroundColor: '#0F172A',
    position: 'relative',
    marginTop: Theme.spacing.xs,
  },
  postImage: {
    width: '100%',
    height: '100%',
  },
  imageLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(247, 246, 242, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageFallbackOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  imageFallbackText: {
    fontSize: 12,
    color: Theme.colors.textMuted,
  },
  captionContainer: {
    paddingHorizontal: Theme.spacing.base,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xs,
  },
  captionText: {
    fontSize: 14,
    color: Theme.colors.textPrimary,
    lineHeight: 20,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.base,
    paddingVertical: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.borderLight,
    marginTop: Theme.spacing.xs,
    gap: Theme.spacing.lg,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Theme.borderRadius.sm,
  },
  actionBtnLiked: {
    backgroundColor: 'rgba(225, 29, 72, 0.08)',
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.textSecondary,
  },
  actionCountLiked: {
    color: '#E11D48',
    fontWeight: '600',
  },
});
