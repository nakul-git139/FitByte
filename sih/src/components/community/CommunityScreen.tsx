import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CommunityPost } from '../../types/community';
import { User } from '../../types/auth';
import { CommunityService } from '../../services/communityService';
import { CommunitySocketService } from '../../services/communitySocketService';
import { PostCard } from './PostCard';
import { CreatePostModal } from './CreatePostModal';
import { CommentsModal } from './CommentsModal';
import { ReportModal } from './ReportModal';
import { Theme } from '../../config/theme';

interface CommunityScreenProps {
  currentUser: User | null;
  onOpenAuth?: () => void;
}

export const CommunityScreen: React.FC<CommunityScreenProps> = ({
  currentUser,
  onOpenAuth,
}) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [activeCommentsPost, setActiveCommentsPost] = useState<CommunityPost | null>(null);
  const [activeReportPost, setActiveReportPost] = useState<CommunityPost | null>(null);

  // Fetch initial posts on mount & establish WebSocket connection
  useEffect(() => {
    fetchFeed(1, true);

    // 1. Connect WebSocket
    CommunitySocketService.connect();

    // 2. Register real-time sync listeners
    const unsubPostCreated = CommunitySocketService.onPostCreated(({ post }) => {
      setPosts((prev) => {
        // Prevent duplicate if client already has this post (e.g. from local REST response)
        if (prev.some((p) => p.id === post.id)) return prev;
        return [post, ...prev];
      });
    });

    const unsubPostDeleted = CommunitySocketService.onPostDeleted(({ postId }) => {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    });

    const unsubPostLiked = CommunitySocketService.onPostLiked(({ postId, likesCount }) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likesCount } : p))
      );
    });

    const unsubPostUnliked = CommunitySocketService.onPostUnliked(({ postId, likesCount }) => {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likesCount } : p))
      );
    });

    const unsubCommentCreated = CommunitySocketService.onCommentCreated(({ postId }) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p
        )
      );
    });

    const unsubCommentDeleted = CommunitySocketService.onCommentDeleted(({ postId }) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 0) - 1) } : p
        )
      );
    });

    // Cleanup on unmount
    return () => {
      unsubPostCreated();
      unsubPostDeleted();
      unsubPostLiked();
      unsubPostUnliked();
      unsubCommentCreated();
      unsubCommentDeleted();
      CommunitySocketService.disconnect();
    };
  }, []);

  const fetchFeed = async (pageToFetch: number, isInitial = false) => {
    if (isInitial) {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const res = await CommunityService.getFeedPosts(pageToFetch, 20);
      if (res.success && Array.isArray(res.posts) && res.posts.length > 0) {
        if (pageToFetch === 1) {
          setPosts(res.posts);
        } else {
          // Append and deduplicate
          setPosts((prev) => {
            const existingIds = new Set(prev.map((p) => p.id));
            const newPosts = res.posts.filter((p) => !existingIds.has(p.id));
            return [...prev, ...newPosts];
          });
        }
        setPage(res.page);
        setHasMore(res.hasMore);
        setErrorMessage(null);
      } else if (pageToFetch === 1 && posts.length === 0) {
        setPosts(res.posts || []);
      }
    } catch {
      // Background catch - graceful local fallback handled in CommunityService
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsLoadingMore(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    setPage(1);
    fetchFeed(1, false);
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !isLoading && !isRefreshing) {
      setIsLoadingMore(true);
      fetchFeed(page + 1, false);
    }
  };

  const handleOpenCreateModal = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    if (!currentUser && onOpenAuth) {
      onOpenAuth();
      return;
    }
    setIsCreateModalOpen(true);
  };

  const handlePostCreated = (newPost: CommunityPost) => {
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== deletedPostId));
  };

  const handlePostUpdated = (updatedPost: CommunityPost) => {
    setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
  };

  const handleCommentsCountUpdated = (postId: string, newCount: number) => {
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, commentsCount: newCount } : p))
    );
  };

  const renderHeader = () => (
    <View style={styles.bannerContainer}>
      <View style={styles.bannerHeaderRow}>
        <View style={styles.bannerTextCol}>
          <Text style={styles.screenTitle}>FitPilot Community</Text>
          <Text style={styles.screenSubtitle}>
            Connect, share & celebrate workout milestones 🔥
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createPostBtn}
          onPress={handleOpenCreateModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color="#FFFFFF" />
          <Text style={styles.createPostBtnText}>Create Post</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFooter = () => {
    if (!hasMore && posts.length > 0) {
      return (
        <View style={styles.feedEndContainer}>
          <Text style={styles.feedEndText}>You're all caught up! 🎉</Text>
        </View>
      );
    }
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Theme.colors.primaryGreen} />
        </View>
      );
    }
    return null;
  };

  const renderEmptyState = () => {
    if (isLoading) return null;

    if (errorMessage) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="cloud-offline-outline" size={54} color={Theme.colors.error} />
          <Text style={styles.emptyTitle}>Unable to Load Feed</Text>
          <Text style={styles.emptySubtitle}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchFeed(1, true)}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="people" size={44} color={Theme.colors.primaryGreen} />
        </View>
        <Text style={styles.emptyTitle}>Welcome to Community!</Text>
        <Text style={styles.emptySubtitle}>
          No workout posts yet. Be the first athlete to share your progress or daily personal record!
        </Text>
        <TouchableOpacity style={styles.emptyActionBtn} onPress={handleOpenCreateModal}>
          <Ionicons name="camera-outline" size={18} color="#FFFFFF" />
          <Text style={styles.emptyActionBtnText}>Share Your First Post</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.centeredWrapper}>
        {isLoading && !isRefreshing ? (
          <View style={styles.initialLoadingContainer}>
            <ActivityIndicator size="large" color={Theme.colors.primaryGreen} />
            <Text style={styles.loadingText}>Loading Community Feed...</Text>
          </View>
        ) : (
          <FlatList
            data={posts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PostCard
                post={item}
                currentUser={currentUser}
                onPostDeleted={handlePostDeleted}
                onOpenComments={(post) => setActiveCommentsPost(post)}
                onOpenReport={(post) => setActiveReportPost(post)}
                onPostUpdated={handlePostUpdated}
              />
            )}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[Theme.colors.primaryGreen]}
                tintColor={Theme.colors.primaryGreen}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.4}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* 1. Create Post Modal */}
      <CreatePostModal
        visible={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onPostCreated={handlePostCreated}
      />

      {/* 2. Comments Modal */}
      <CommentsModal
        visible={!!activeCommentsPost}
        post={activeCommentsPost}
        currentUser={currentUser}
        onClose={() => setActiveCommentsPost(null)}
        onCommentsCountUpdated={handleCommentsCountUpdated}
      />

      {/* 3. Report Modal */}
      <ReportModal
        visible={!!activeReportPost}
        post={activeReportPost}
        onClose={() => setActiveReportPost(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  centeredWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    paddingBottom: 24,
    flexGrow: 1,
  },
  bannerContainer: {
    paddingVertical: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bannerTextCol: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.textPrimary,
  },
  screenSubtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  createPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primaryGreen,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Theme.borderRadius.full,
    gap: 6,
    ...Theme.shadows.soft,
  },
  createPostBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  initialLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Theme.colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: Theme.spacing.xl,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderSubtle,
    marginTop: Theme.spacing.md,
    gap: 8,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.primaryGreen,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Theme.borderRadius.full,
    marginTop: Theme.spacing.md,
    gap: 6,
  },
  emptyActionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  retryBtn: {
    backgroundColor: Theme.colors.surfaceSecondary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: Theme.borderRadius.md,
    marginTop: Theme.spacing.md,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  feedEndContainer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  feedEndText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
});
