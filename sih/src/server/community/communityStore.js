const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');
const COMMUNITY_FILE = path.join(DATA_DIR, 'community.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class CommunityStore {
  constructor() {
    this.posts = [];
    this.likes = [];
    this.comments = [];
    this.reports = [];
    // Fast lookup set for composite unique likes: "postId:userId"
    this.likesIndex = new Set();
    this.loadData();
  }

  /**
   * Load stored community data from disk
   */
  loadData() {
    try {
      if (fs.existsSync(COMMUNITY_FILE)) {
        const raw = fs.readFileSync(COMMUNITY_FILE, 'utf8');
        const parsed = JSON.parse(raw || '{}');
        this.posts = Array.isArray(parsed.posts) ? parsed.posts : [];
        this.likes = Array.isArray(parsed.likes) ? parsed.likes : [];
        this.comments = Array.isArray(parsed.comments) ? parsed.comments : [];
        this.reports = Array.isArray(parsed.reports) ? parsed.reports : [];
      } else {
        this.posts = [];
        this.likes = [];
        this.comments = [];
        this.reports = [];
        this.saveData();
      }
    } catch (err) {
      console.warn('[CommunityStore] Error loading community.json, initializing empty:', err.message);
      this.posts = [];
      this.likes = [];
      this.comments = [];
      this.reports = [];
    }

    // Rebuild index
    this.rebuildIndexes();
  }

  /**
   * Rebuilds fast lookup indexes
   */
  rebuildIndexes() {
    this.likesIndex.clear();
    for (const like of this.likes) {
      this.likesIndex.add(`${like.postId}:${like.userId}`);
    }
  }

  /**
   * Persist in-memory state to disk
   */
  saveData() {
    try {
      const payload = {
        posts: this.posts,
        likes: this.likes,
        comments: this.comments,
        reports: this.reports,
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(COMMUNITY_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      console.error('[CommunityStore] Error saving community.json:', err.message);
    }
  }

  // ==========================================
  // POSTS
  // ==========================================

  /**
   * Get paginated feed of posts sorted newest first
   */
  getPosts({ page = 1, limit = 20, currentUserId = null }) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

    // Sort by createdAt descending
    const sorted = [...this.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalPosts = sorted.length;
    const totalPages = Math.ceil(totalPosts / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = sorted.slice(startIndex, startIndex + limitNum);

    const enriched = paginated.map((post) => ({
      ...post,
      isLikedByMe: currentUserId ? this.likesIndex.has(`${post.id}:${currentUserId}`) : false,
    }));

    return {
      posts: enriched,
      page: pageNum,
      limit: limitNum,
      totalPosts,
      totalPages,
      hasMore: pageNum < totalPages,
    };
  }

  /**
   * Get single post by ID
   */
  getPostById(postId, currentUserId = null) {
    if (!postId) return null;
    const post = this.posts.find((p) => p.id === postId);
    if (!post) return null;

    return {
      ...post,
      isLikedByMe: currentUserId ? this.likesIndex.has(`${post.id}:${currentUserId}`) : false,
    };
  }

  /**
   * Create a new post
   */
  createPost({ userId, userName, userAvatar = null, imageUrl = '', caption }) {
    if (!userId || !caption) {
      throw new Error('userId and caption are required');
    }

    const newPost = {
      id: `post_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId,
      userName: userName || 'FitPilot Athlete',
      userAvatar: userAvatar || null,
      imageUrl: (imageUrl || '').trim(),
      caption: caption.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
    };

    this.posts.unshift(newPost);
    this.saveData();
    return { ...newPost, isLikedByMe: false };
  }

  /**
   * Delete post and cascade delete associated likes and comments
   */
  deletePost(postId, userId) {
    const postIndex = this.posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }

    const post = this.posts[postIndex];
    if (post.userId !== userId) {
      const err = new Error('Forbidden: You can only delete your own posts');
      err.statusCode = 403;
      throw err;
    }

    // Remove post
    this.posts.splice(postIndex, 1);

    // Cascade delete likes
    this.likes = this.likes.filter((l) => l.postId !== postId);
    // Cascade delete comments
    this.comments = this.comments.filter((c) => c.postId !== postId);

    // Rebuild index and save
    this.rebuildIndexes();
    this.saveData();

    return { success: true, deletedPostId: postId };
  }

  // ==========================================
  // LIKES
  // ==========================================

  /**
   * Like a post (Prevents duplicate likes)
   */
  likePost(postId, userId) {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }

    const key = `${postId}:${userId}`;
    if (this.likesIndex.has(key)) {
      // Already liked - idempotent return
      return {
        success: true,
        isLiked: true,
        likesCount: post.likesCount,
        message: 'Post already liked',
      };
    }

    const newLike = {
      id: `like_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      postId,
      userId,
      createdAt: new Date().toISOString(),
    };

    this.likes.push(newLike);
    this.likesIndex.add(key);
    post.likesCount = (post.likesCount || 0) + 1;
    post.updatedAt = new Date().toISOString();

    this.saveData();

    return {
      success: true,
      isLiked: true,
      likesCount: post.likesCount,
    };
  }

  /**
   * Unlike a post
   */
  unlikePost(postId, userId) {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }

    const key = `${postId}:${userId}`;
    if (!this.likesIndex.has(key)) {
      // Not liked - idempotent return
      return {
        success: true,
        isLiked: false,
        likesCount: post.likesCount,
        message: 'Post was not liked',
      };
    }

    this.likes = this.likes.filter((l) => !(l.postId === postId && l.userId === userId));
    this.likesIndex.delete(key);
    post.likesCount = Math.max(0, (post.likesCount || 0) - 1);
    post.updatedAt = new Date().toISOString();

    this.saveData();

    return {
      success: true,
      isLiked: false,
      likesCount: post.likesCount,
    };
  }

  // ==========================================
  // COMMENTS
  // ==========================================

  /**
   * Get paginated comments for a post
   */
  getComments(postId, { page = 1, limit = 50 } = {}) {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }

    const postComments = this.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const totalComments = postComments.length;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = postComments.slice(startIndex, startIndex + limitNum);

    return {
      comments: paginated,
      page: pageNum,
      limit: limitNum,
      totalComments,
      hasMore: startIndex + limitNum < totalComments,
    };
  }

  /**
   * Add a comment to a post
   */
  addComment({ postId, userId, userName, userAvatar = null, text }) {
    const post = this.posts.find((p) => p.id === postId);
    if (!post) {
      const err = new Error('Post not found');
      err.statusCode = 404;
      throw err;
    }

    if (!text || !text.trim()) {
      const err = new Error('Comment text cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    const newComment = {
      id: `cmt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      postId,
      userId,
      userName: userName || 'FitPilot Athlete',
      userAvatar: userAvatar || null,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.comments.push(newComment);
    post.commentsCount = (post.commentsCount || 0) + 1;
    post.updatedAt = new Date().toISOString();

    this.saveData();
    return newComment;
  }

  /**
   * Delete own comment
   */
  deleteComment(commentId, userId) {
    const commentIndex = this.comments.findIndex((c) => c.id === commentId);
    if (commentIndex === -1) {
      const err = new Error('Comment not found');
      err.statusCode = 404;
      throw err;
    }

    const comment = this.comments[commentIndex];
    if (comment.userId !== userId) {
      const err = new Error('Forbidden: You can only delete your own comments');
      err.statusCode = 403;
      throw err;
    }

    const post = this.posts.find((p) => p.id === comment.postId);
    if (post) {
      post.commentsCount = Math.max(0, (post.commentsCount || 0) - 1);
      post.updatedAt = new Date().toISOString();
    }

    this.comments.splice(commentIndex, 1);
    this.saveData();

    return { success: true, deletedCommentId: commentId, postId: comment.postId };
  }

  // ==========================================
  // REPORTS
  // ==========================================

  /**
   * Report a post or comment
   */
  createReport({ userId, postId = null, commentId = null, reason }) {
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!postId && !commentId) {
      const err = new Error('Either postId or commentId must be provided for report');
      err.statusCode = 400;
      throw err;
    }
    if (!reason || reason.trim().length < 3) {
      const err = new Error('Report reason must be at least 3 characters long');
      err.statusCode = 400;
      throw err;
    }

    // Verify target exists
    if (postId && !this.posts.some((p) => p.id === postId)) {
      const err = new Error('Target post does not exist');
      err.statusCode = 404;
      throw err;
    }
    if (commentId && !this.comments.some((c) => c.id === commentId)) {
      const err = new Error('Target comment does not exist');
      err.statusCode = 404;
      throw err;
    }

    const newReport = {
      id: `rep_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      userId,
      postId: postId || null,
      commentId: commentId || null,
      reason: reason.trim(),
      createdAt: new Date().toISOString(),
    };

    this.reports.push(newReport);
    this.saveData();

    return {
      success: true,
      report: newReport,
      message: 'Thank you for reporting. Our moderation team will review this content.',
    };
  }
}

const communityStore = new CommunityStore();
module.exports = communityStore;
