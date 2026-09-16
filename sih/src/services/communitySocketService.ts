import { getBackendWsUrl } from '../config/apiConfig';
import { AuthService } from './authService';
import { CommunityPost, CommunityComment } from '../types/community';

export type CommunityEventType =
  | 'community:post_created'
  | 'community:post_deleted'
  | 'community:post_liked'
  | 'community:post_unliked'
  | 'community:comment_created'
  | 'community:comment_deleted';

export interface PostCreatedEventPayload {
  post: CommunityPost;
}

export interface PostDeletedEventPayload {
  postId: string;
}

export interface PostLikedEventPayload {
  postId: string;
  likesCount: number;
  userId: string;
}

export interface PostUnlikedEventPayload {
  postId: string;
  likesCount: number;
  userId: string;
}

export interface CommentCreatedEventPayload {
  postId: string;
  comment: CommunityComment;
}

export interface CommentDeletedEventPayload {
  postId: string;
  commentId: string;
}

type EventCallback<T = any> = (payload: T) => void;

export class CommunitySocketService {
  private static socket: WebSocket | null = null;
  private static listeners: Map<string, Set<EventCallback>> = new Map();
  private static isConnecting = false;
  private static reconnectTimeout: any = null;
  private static reconnectAttempts = 0;
  private static pingInterval: any = null;
  private static shouldReconnect = false;

  /**
   * Connect to the Community WebSocket channel
   */
  public static async connect(): Promise<void> {
    this.shouldReconnect = true;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      const wsBaseUrl = getBackendWsUrl();
      const token = await AuthService.getToken();

      const url = `${wsBaseUrl}/ws/community${token ? `?token=${encodeURIComponent(token)}` : ''}`;

      const ws = new WebSocket(url);

      ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.socket = ws;

        // Start heartbeat ping every 25 seconds
        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            try {
              this.socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            } catch {}
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.event && data.payload) {
            this.dispatchEvent(data.event, data.payload);
          }
        } catch {}
      };

      ws.onclose = () => {
        this.isConnecting = false;
        this.socket = null;
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      ws.onerror = () => {
        this.isConnecting = false;
        try {
          ws.close();
        } catch {}
      };
    } catch (err: any) {
      this.isConnecting = false;
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Schedules reconnection with exponential backoff
   */
  private static scheduleReconnect(): void {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);

    this.reconnectTimeout = setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Disconnect and clean up
   */
  public static disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
    this.isConnecting = false;
  }

  /**
   * Subscribe to a community WebSocket event
   * @returns Unsubscribe function
   */
  public static on<T = any>(event: CommunityEventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Dispatch incoming event to registered callbacks
   */
  private static dispatchEvent(event: string, payload: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks && callbacks.size > 0) {
      callbacks.forEach((cb) => {
        try {
          cb(payload);
        } catch (e) {
          console.warn(`[CommunitySocketService] Error in listener for ${event}:`, e);
        }
      });
    }
  }

  /**
   * Helper subscription methods
   */
  public static onPostCreated(cb: (payload: PostCreatedEventPayload) => void) {
    return this.on<PostCreatedEventPayload>('community:post_created', cb);
  }

  public static onPostDeleted(cb: (payload: PostDeletedEventPayload) => void) {
    return this.on<PostDeletedEventPayload>('community:post_deleted', cb);
  }

  public static onPostLiked(cb: (payload: PostLikedEventPayload) => void) {
    return this.on<PostLikedEventPayload>('community:post_liked', cb);
  }

  public static onPostUnliked(cb: (payload: PostUnlikedEventPayload) => void) {
    return this.on<PostUnlikedEventPayload>('community:post_unliked', cb);
  }

  public static onCommentCreated(cb: (payload: CommentCreatedEventPayload) => void) {
    return this.on<CommentCreatedEventPayload>('community:comment_created', cb);
  }

  public static onCommentDeleted(cb: (payload: CommentDeletedEventPayload) => void) {
    return this.on<CommentDeletedEventPayload>('community:comment_deleted', cb);
  }
}
