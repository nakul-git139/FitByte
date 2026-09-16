const WebSocket = require('ws');
const WebSocketServer = WebSocket.Server;
const { verifyToken } = require('../authService');
const userStore = require('../userStore');

class CommunityWsManager {
  constructor() {
    this.wss = null;
    this.clients = new Set(); // Set of active authenticated WebSocket connections
    this.heartbeatInterval = null;
  }

  /**
   * Initialize WebSocket server attached to existing HTTP server
   * @param {import('http').Server} httpServer
   */
  init(httpServer) {
    if (this.wss) return;

    this.wss = new WebSocketServer({ noServer: true });

    httpServer.on('upgrade', (request, socket, head) => {
      try {
        const url = new URL(request.url, 'http://localhost');
        if (url.pathname === '/ws/community' || url.pathname === '/ws/community/') {
          // Extract token from query params or Authorization header
          const token =
            url.searchParams.get('token') ||
            (request.headers['sec-websocket-protocol'] || '').split(',')[0].trim() ||
            (request.headers['authorization'] || '').replace('Bearer ', '').trim();

          let authenticatedUser = null;
          if (token) {
            try {
              const decoded = verifyToken(token);
              authenticatedUser = userStore.findById(decoded.userId);
            } catch (err) {
              console.warn('[CommunityWS] Auth token verification failed:', err.message);
            }
          }

          this.wss.handleUpgrade(request, socket, head, (ws) => {
            ws.user = authenticatedUser;
            ws.isAlive = true;
            this.wss.emit('connection', ws, request);
          });
        }
      } catch (err) {
        console.error('[CommunityWS] Upgrade handling error:', err.message);
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          // Handle client ping
          if (parsed.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          }
          // Handle dynamic authentication message if token wasn't in URL
          if (parsed.type === 'authenticate' && parsed.token) {
            try {
              const decoded = verifyToken(parsed.token);
              const user = userStore.findById(decoded.userId);
              if (user) {
                ws.user = user;
                ws.send(JSON.stringify({ type: 'authenticated', user: userStore.toSafeUser(user) }));
              }
            } catch (e) {
              ws.send(JSON.stringify({ type: 'auth_error', message: e.message }));
            }
          }
        } catch {}
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.warn('[CommunityWS] Socket error:', err.message);
        this.clients.delete(ws);
      });

      // Send initial welcome/connected ack
      ws.send(
        JSON.stringify({
          type: 'connected',
          message: 'Connected to FitPilot Community Live Channel',
          authenticated: !!ws.user,
          timestamp: new Date().toISOString(),
        })
      );
    });

    // Heartbeat to detect and clean up dead sockets every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;
      this.clients.forEach((ws) => {
        if (ws.isAlive === false) {
          this.clients.delete(ws);
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    console.log('[CommunityWS] WebSocket channel ready on /ws/community');
  }

  /**
   * Broadcast an event to all connected active clients
   * @param {string} event - Event name
   * @param {Object} payload - Event data payload
   */
  broadcast(event, payload) {
    if (!this.clients || this.clients.size === 0) return;

    const message = JSON.stringify({
      event,
      payload,
      timestamp: new Date().toISOString(),
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.warn('[CommunityWS] Error sending to client:', err.message);
        }
      }
    }
  }

  // ==========================================
  // EVENT SPECIFIC BROADCAST METHODS
  // ==========================================

  broadcastPostCreated(post) {
    this.broadcast('community:post_created', { post });
  }

  broadcastPostDeleted(postId) {
    this.broadcast('community:post_deleted', { postId });
  }

  broadcastPostLiked(postId, likesCount, userId) {
    this.broadcast('community:post_liked', { postId, likesCount, userId });
  }

  broadcastPostUnliked(postId, likesCount, userId) {
    this.broadcast('community:post_unliked', { postId, likesCount, userId });
  }

  broadcastCommentCreated(postId, comment) {
    this.broadcast('community:comment_created', { postId, comment });
  }

  broadcastCommentDeleted(postId, commentId) {
    this.broadcast('community:comment_deleted', { postId, commentId });
  }
}

const communityWs = new CommunityWsManager();
module.exports = communityWs;
