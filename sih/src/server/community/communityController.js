const fs = require('fs');
const path = require('path');
const communityStore = require('./communityStore');
const UploadService = require('./uploadService');
const { verifyToken } = require('../authService');
const userStore = require('../userStore');
const communityWs = require('./communityWs');

/**
 * Send standard JSON HTTP response
 */
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

/**
 * Extract authenticated user from Authorization header
 */
function getAuthenticatedUser(req, required = true) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    if (required) {
      const err = new Error('Authorization Bearer token is required');
      err.statusCode = 401;
      throw err;
    }
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyToken(token);
    let user = userStore.findById(decoded.userId);
    if (!user && decoded.email) {
      user = userStore.findByEmail(decoded.email);
    }
    if (!user) {
      try {
        user = userStore.createUser({
          name: decoded.name || 'FitPilot Athlete',
          email: decoded.email || `athlete_${Date.now()}@fitpilot.app`,
          authProvider: decoded.authProvider || 'local',
        });
      } catch {
        user = {
          id: decoded.userId || 'usr_athlete',
          name: decoded.name || 'FitPilot Athlete',
          email: decoded.email || 'athlete@fitpilot.app',
          authProvider: decoded.authProvider || 'local',
        };
      }
    }
    return user;
  } catch (err) {
    if (required) {
      const authErr = new Error(`Unauthorized: ${err.message}`);
      authErr.statusCode = 401;
      throw authErr;
    }
    return null;
  }
}

/**
 * Sanitize text input: strips HTML tags, control characters, and leading/trailing spaces
 */
function sanitizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Strip control chars
    .trim();
}

// In-memory sliding window rate limiter: Map<key, number[]>
const rateLimitMap = new Map();

/**
 * Check if a user exceeded action rate limits
 */
function checkRateLimit(userId, action, maxAllowed, windowMs = 60000) {
  const now = Date.now();
  const key = `${userId}:${action}`;
  const timestamps = rateLimitMap.get(key) || [];

  // Filter out timestamps outside window
  const activeTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (activeTimestamps.length >= maxAllowed) {
    const err = new Error(`Rate limit exceeded for ${action}. Please wait before trying again.`);
    err.statusCode = 429;
    throw err;
  }

  activeTimestamps.push(now);
  rateLimitMap.set(key, activeTimestamps);
}

class CommunityController {
  // ==========================================
  // POSTS
  // ==========================================

  /**
   * POST /api/community/posts
   */
  static async createPost(req, res, body) {
    try {
      const user = getAuthenticatedUser(req, true);
      checkRateLimit(user.id, 'create_post', 10, 60000);

      const { caption, imageUrl, imageBase64 } = body;

      let finalImageUrl = imageUrl || '';

      // Direct base64 upload within post creation
      if (!finalImageUrl && imageBase64) {
        try {
          const uploadResult = await UploadService.saveImage({ imageBase64 });
          finalImageUrl = uploadResult.imageUrl;
        } catch (uploadErr) {
          console.warn('[CommunityController] Upload error during post creation:', uploadErr.message);
          // If upload fails, fall back to empty or direct payload rather than failing
        }
      }

      const cleanCaption = sanitizeText(caption);
      if (!cleanCaption) {
        return sendJson(res, 400, { error: 'Caption or text is required for your post' });
      }

      if (cleanCaption.length > 2000) {
        return sendJson(res, 400, { error: 'Caption cannot exceed 2,000 characters' });
      }

      const post = communityStore.createPost({
        userId: user.id,
        userName: user.name || 'FitPilot Athlete',
        userAvatar: user.avatarUrl || null,
        imageUrl: typeof finalImageUrl === 'string' ? finalImageUrl.trim() : '',
        caption: cleanCaption,
      });

      // Broadcast WebSocket event to all connected athletes
      try {
        communityWs.broadcastPostCreated(post);
      } catch (wsErr) {
        console.warn('[CommunityController] WS broadcast error:', wsErr.message);
      }

      return sendJson(res, 201, {
        success: true,
        post,
      });
    } catch (err) {
      console.error('[CommunityController] createPost error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  /**
   * GET /api/community/posts?page=1&limit=20
   */
  static async getPosts(req, res, queryParams) {
    try {
      const user = getAuthenticatedUser(req, false);
      const page = parseInt(queryParams.get('page') || '1', 10);
      const limit = parseInt(queryParams.get('limit') || '20', 10);

      const result = communityStore.getPosts({
        page,
        limit,
        currentUserId: user ? user.id : null,
      });

      return sendJson(res, 200, {
        success: true,
        ...result,
      });
    } catch (err) {
      console.error('[CommunityController] getPosts error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  /**
   * GET /api/community/posts/:id
   */
  static async getPostById(req, res, postId) {
    try {
      const user = getAuthenticatedUser(req, false);
      const post = communityStore.getPostById(postId, user ? user.id : null);

      if (!post) {
        return sendJson(res, 404, { error: 'Post not found' });
      }

      return sendJson(res, 200, {
        success: true,
        post,
      });
    } catch (err) {
      console.error('[CommunityController] getPostById error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  /**
   * DELETE /api/community/posts/:id
   */
  static async deletePost(req, res, postId) {
    try {
      const user = getAuthenticatedUser(req, true);
      const post = communityStore.getPostById(postId);

      if (!post) {
        return sendJson(res, 404, { error: 'Post not found' });
      }

      // Check ownership
      if (post.userId !== user.id) {
        return sendJson(res, 403, { error: 'Forbidden: You can only delete your own posts' });
      }

      // Clean up uploaded image if locally stored
      if (post.imageUrl && post.imageUrl.startsWith('/api/community/uploads/')) {
        UploadService.deleteImage(post.imageUrl);
      }

      const result = communityStore.deletePost(postId, user.id);

      // Broadcast post deletion
      try {
        communityWs.broadcastPostDeleted(postId);
      } catch (wsErr) {
        console.warn('[CommunityController] WS broadcast error:', wsErr.message);
      }

      return sendJson(res, 200, result);
    } catch (err) {
      console.error('[CommunityController] deletePost error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  // ==========================================
  // LIKES
  // ==========================================

  /**
   * POST /api/community/posts/:id/like
   */
  static async likePost(req, res, postId) {
    try {
      const user = getAuthenticatedUser(req, true);
      const result = communityStore.likePost(postId, user.id);

      // Broadcast post liked if like state changed
      if (result.success && !result.message) {
        try {
          communityWs.broadcastPostLiked(postId, result.likesCount, user.id);
        } catch (wsErr) {
          console.warn('[CommunityController] WS broadcast error:', wsErr.message);
        }
      }

      return sendJson(res, 200, result);
    } catch (err) {
      console.error('[CommunityController] likePost error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  /**
   * POST /api/community/posts/:id/unlike or DELETE /api/community/posts/:id/like
   */
  static async unlikePost(req, res, postId) {
    try {
      const user = getAuthenticatedUser(req, true);
      const result = communityStore.unlikePost(postId, user.id);

      // Broadcast post unliked if like state changed
      if (result.success && !result.message) {
        try {
          communityWs.broadcastPostUnliked(postId, result.likesCount, user.id);
        } catch (wsErr) {
          console.warn('[CommunityController] WS broadcast error:', wsErr.message);
        }
      }

      return sendJson(res, 200, result);
    } catch (err) {
      console.error('[CommunityController] unlikePost error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  // ==========================================
  // COMMENTS
  // ==========================================

  /**
   * GET /api/community/posts/:id/comments?page=1&limit=50
   */
  static async getComments(req, res, postId, queryParams) {
    try {
      const page = parseInt(queryParams.get('page') || '1', 10);
      const limit = parseInt(queryParams.get('limit') || '50', 10);

      const result = communityStore.getComments(postId, { page, limit });
      return sendJson(res, 200, {
        success: true,
        ...result,
      });
    } catch (err) {
      console.error('[CommunityController] getComments error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  /**
   * POST /api/community/posts/:id/comments
   */
  static async addComment(req, res, postId, body) {
    try {
      const user = getAuthenticatedUser(req, true);
      checkRateLimit(user.id, 'add_comment', 30, 60000);

      const { text } = body;

      const cleanText = sanitizeText(text);
      if (!cleanText) {
        return sendJson(res, 400, { error: 'Comment text is required and cannot be empty' });
      }

      if (cleanText.length > 1000) {
        return sendJson(res, 400, { error: 'Comment cannot exceed 1,000 characters' });
      }

      const comment = communityStore.addComment({
        postId,
        userId: user.id,
        userName: user.name || 'FitPilot Athlete',
        userAvatar: user.avatarUrl || null,
        text: cleanText,
      });

      // Broadcast comment created
      try {
        communityWs.broadcastCommentCreated(postId, comment);
      } catch (wsErr) {
        console.warn('[CommunityController] WS broadcast error:', wsErr.message);
      }

      return sendJson(res, 201, {
        success: true,
        comment,
      });
    } catch (err) {
      console.error('[CommunityController] addComment error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  /**
   * DELETE /api/community/comments/:id
   */
  static async deleteComment(req, res, commentId) {
    try {
      const user = getAuthenticatedUser(req, true);
      const result = communityStore.deleteComment(commentId, user.id);

      // Broadcast comment deleted
      if (result.success && result.postId) {
        try {
          communityWs.broadcastCommentDeleted(result.postId, commentId);
        } catch (wsErr) {
          console.warn('[CommunityController] WS broadcast error:', wsErr.message);
        }
      }

      return sendJson(res, 200, result);
    } catch (err) {
      console.error('[CommunityController] deleteComment error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  // ==========================================
  // REPORTS
  // ==========================================

  /**
   * POST /api/community/reports
   */
  static async createReport(req, res, body) {
    try {
      const user = getAuthenticatedUser(req, true);
      checkRateLimit(user.id, 'create_report', 10, 60000);

      const { postId, commentId, reason } = body;

      const cleanReason = sanitizeText(reason);
      if (!cleanReason || cleanReason.length < 3) {
        return sendJson(res, 400, { error: 'Report reason must be at least 3 characters long' });
      }

      if (cleanReason.length > 500) {
        return sendJson(res, 400, { error: 'Report reason cannot exceed 500 characters' });
      }

      const result = communityStore.createReport({
        userId: user.id,
        postId: postId || null,
        commentId: commentId || null,
        reason: cleanReason,
      });

      return sendJson(res, 201, result);
    } catch (err) {
      console.error('[CommunityController] createReport error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  // ==========================================
  // IMAGE UPLOADS & STATIC SERVING
  // ==========================================

  /**
   * POST /api/community/upload
   */
  static async uploadImage(req, res, body) {
    try {
      getAuthenticatedUser(req, true);
      const { imageBase64, mimeType } = body;

      const result = await UploadService.saveImage({ imageBase64, mimeType });
      return sendJson(res, 201, result);
    } catch (err) {
      console.error('[CommunityController] uploadImage error:', err.message);
      return sendJson(res, err.statusCode || 500, { error: err.message });
    }
  }

  /**
   * GET /api/community/uploads/:filename
   */
  static serveUpload(req, res, filename) {
    const filePath = UploadService.getFilePath(filename);
    if (!filePath) {
      return sendJson(res, 404, { error: 'Image not found' });
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    });

    const stream = fs.createReadStream(filePath);
    stream.on('error', (err) => {
      console.error('[CommunityController] File stream error:', err.message);
      if (!res.headersSent) {
        sendJson(res, 500, { error: 'Error streaming file' });
      }
    });
    stream.pipe(res);
  }
}

module.exports = CommunityController;
