export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  imageUrl: string;
  caption: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  likesCount: number;
  commentsCount: number;
  isLikedByMe?: boolean;
}

export interface CommunityLike {
  id: string;
  postId: string;
  userId: string;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityReport {
  id: string;
  userId: string;
  postId: string | null;
  commentId: string | null;
  reason: string;
  createdAt: string;
}

export interface PaginatedPostsResponse {
  success: boolean;
  posts: CommunityPost[];
  page: number;
  limit: number;
  totalPosts: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginatedCommentsResponse {
  success: boolean;
  comments: CommunityComment[];
  page: number;
  limit: number;
  totalComments: number;
  hasMore: boolean;
}

export interface CreatePostPayload {
  caption: string;
  imageUrl?: string;
  imageBase64?: string;
}

export interface AddCommentPayload {
  text: string;
}

export interface CreateReportPayload {
  postId?: string;
  commentId?: string;
  reason: string;
}

export interface UploadImageResponse {
  success: boolean;
  imageUrl?: string;
  filename?: string;
  sizeBytes?: number;
  error?: string;
}
