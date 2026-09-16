const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { generateWorkout, analyzeExerciseFrame, analyzeWorkoutSummary, analyzeFoodNutrition } = require('./geminiService');
const userStore = require('./userStore');
const {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  verifyGoogleToken,
} = require('./authService');
const CommunityController = require('./community/communityController');
const communityWs = require('./community/communityWs');

const PORT = 8999;
const HTML_PATH = path.join(__dirname, 'pose_detector.html');
const CONFIG_DIR = path.join(__dirname, '../config');
const CONFIG_PATH = path.join(CONFIG_DIR, 'poseConfig.json');

if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

/**
 * Helper to parse incoming JSON request body
 */
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      // Guard: 15MB limit for image payloads
      if (body.length > 15 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Payload Too Large'));
      }
    });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        resolve(json);
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// 1. Create HTTP Server
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url.split('?')[0];

  // Static Pose Detector HTML
  if (url === '/' || url === '/index.html') {
    fs.readFile(HTML_PATH, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading pose detector');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
    return;
  }

  // Health Check
  if (url === '/api/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // API 1: Daily Workout Generation
  if (url === '/api/workout/generate' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const workoutPlan = await generateWorkout(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(workoutPlan));
    } catch (err) {
      console.error('[Server] /api/workout/generate error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 2: Gemini Vision Keyframe Coaching Analysis
  if (url === '/api/vision/analyze-frame' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const analysis = await analyzeExerciseFrame(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(analysis));
    } catch (err) {
      console.error('[Server] /api/vision/analyze-frame error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 3: Post-Workout Gemini AI Analysis & Summary
  if (url === '/api/workout/analyze-summary' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const summaryAnalysis = await analyzeWorkoutSummary(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(summaryAnalysis));
    } catch (err) {
      console.error('[Server] /api/workout/analyze-summary error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 4: Gemini AI Food & Calorie Intake Scanner
  if (url === '/api/nutrition/analyze-food' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const foodAnalysis = await analyzeFoodNutrition(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(foodAnalysis));
    } catch (err) {
      console.error('[Server] /api/nutrition/analyze-food error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // ==========================================
  // AUTHENTICATION & AUTHORIZATION ENDPOINTS
  // ==========================================

  // Auth 1: Register with Email & Password
  if (url === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { name, email, password } = body;

      if (!name || !name.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Name is required' }));
        return;
      }
      if (!email || !email.trim()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Valid email address is required' }));
        return;
      }
      if (!password || password.length < 6) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Password must be at least 6 characters long' }));
        return;
      }

      const existingUser = userStore.findByEmail(email);
      if (existingUser) {
        res.writeHead(409, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'An account with this email address already exists' }));
        return;
      }

      const passwordHash = await hashPassword(password);
      const newUser = userStore.createUser({
        name: name.trim(),
        email: email.trim(),
        passwordHash,
        authProvider: 'local',
      });

      const token = generateToken(newUser);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token,
        user: userStore.toSafeUser(newUser),
      }));
    } catch (err) {
      console.error('[Server] /api/auth/register error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Auth 2: Login with Email & Password
  if (url === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const { email, password } = body;

      if (!email || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Email and password are required' }));
        return;
      }

      const user = userStore.findByEmail(email);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password' }));
        return;
      }

      if (!user.passwordHash && user.authProvider === 'google') {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'This account was created with Google Sign In. Please use "Continue with Google".',
        }));
        return;
      }

      const isMatch = await comparePassword(password, user.passwordHash);
      if (!isMatch) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid email or password' }));
        return;
      }

      const token = generateToken(user);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token,
        user: userStore.toSafeUser(user),
      }));
    } catch (err) {
      console.error('[Server] /api/auth/login error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Auth 3: Direct Login / Signup via Google Account
  if (url === '/api/auth/google' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const googleProfile = await verifyGoogleToken(body);

      // Check if user exists by googleId or email
      let user = userStore.findByGoogleId(googleProfile.googleId);
      if (!user) {
        user = userStore.findByEmail(googleProfile.email);
      }

      if (user) {
        // Link Google ID or update avatar if needed
        const updates = {};
        if (!user.googleId) updates.googleId = googleProfile.googleId;
        if (!user.avatarUrl && googleProfile.avatarUrl) updates.avatarUrl = googleProfile.avatarUrl;
        if (Object.keys(updates).length > 0) {
          user = userStore.updateUser(user.id, updates);
        }
      } else {
        // Create new Google-authenticated user
        user = userStore.createUser({
          name: googleProfile.name || 'FitPilot Athlete',
          email: googleProfile.email,
          googleId: googleProfile.googleId,
          avatarUrl: googleProfile.avatarUrl,
          authProvider: 'google',
        });
      }

      const token = generateToken(user);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        token,
        user: userStore.toSafeUser(user),
      }));
    } catch (err) {
      console.error('[Server] /api/auth/google error:', err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Auth 4: Verify current session and retrieve User Profile
  if (url === '/api/auth/me' && req.method === 'GET') {
    try {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Authorization token required' }));
        return;
      }

      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const user = userStore.findById(decoded.userId);

      if (!user) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'User account not found' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        user: userStore.toSafeUser(user),
      }));
    } catch (err) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Unauthorized: ${err.message}` }));
    }
    return;
  }

  // ==========================================
  // COMMUNITY ENDPOINTS
  // ==========================================

  // Community Static Uploads: GET /api/community/uploads/:filename
  if (url.startsWith('/api/community/uploads/') && req.method === 'GET') {
    const filename = url.replace('/api/community/uploads/', '');
    CommunityController.serveUpload(req, res, filename);
    return;
  }

  // Community Image Upload: POST /api/community/upload
  if (url === '/api/community/upload' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      await CommunityController.uploadImage(req, res, body);
    } catch (err) {
      res.writeHead(err.statusCode || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Community Posts Collection: GET (Paginated feed), POST (Create post)
  if (url === '/api/community/posts') {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    if (req.method === 'GET') {
      await CommunityController.getPosts(req, res, parsedUrl.searchParams);
      return;
    }
    if (req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        await CommunityController.createPost(req, res, body);
      } catch (err) {
        res.writeHead(err.statusCode || 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
  }

  // Community Reports: POST /api/community/reports
  if (url === '/api/community/reports' && req.method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      await CommunityController.createReport(req, res, body);
    } catch (err) {
      res.writeHead(err.statusCode || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Single Post Comments: GET /api/community/posts/:id/comments, POST /api/community/posts/:id/comments
  const postCommentsMatch = url.match(/^\/api\/community\/posts\/([a-zA-Z0-9_-]+)\/comments$/);
  if (postCommentsMatch) {
    const postId = postCommentsMatch[1];
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    if (req.method === 'GET') {
      await CommunityController.getComments(req, res, postId, parsedUrl.searchParams);
      return;
    }
    if (req.method === 'POST') {
      try {
        const body = await parseRequestBody(req);
        await CommunityController.addComment(req, res, postId, body);
      } catch (err) {
        res.writeHead(err.statusCode || 500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }
  }

  // Single Post Likes: POST /api/community/posts/:id/like, DELETE /api/community/posts/:id/like, POST /api/community/posts/:id/unlike
  const postLikeMatch = url.match(/^\/api\/community\/posts\/([a-zA-Z0-9_-]+)\/like$/);
  if (postLikeMatch) {
    const postId = postLikeMatch[1];
    if (req.method === 'POST') {
      await CommunityController.likePost(req, res, postId);
      return;
    }
    if (req.method === 'DELETE') {
      await CommunityController.unlikePost(req, res, postId);
      return;
    }
  }

  const postUnlikeMatch = url.match(/^\/api\/community\/posts\/([a-zA-Z0-9_-]+)\/unlike$/);
  if (postUnlikeMatch && req.method === 'POST') {
    const postId = postUnlikeMatch[1];
    await CommunityController.unlikePost(req, res, postId);
    return;
  }

  // Single Post: GET /api/community/posts/:id, DELETE /api/community/posts/:id
  const singlePostMatch = url.match(/^\/api\/community\/posts\/([a-zA-Z0-9_-]+)$/);
  if (singlePostMatch) {
    const postId = singlePostMatch[1];
    if (req.method === 'GET') {
      await CommunityController.getPostById(req, res, postId);
      return;
    }
    if (req.method === 'DELETE') {
      await CommunityController.deletePost(req, res, postId);
      return;
    }
  }

  // Single Comment Deletion: DELETE /api/community/comments/:id
  const singleCommentMatch = url.match(/^\/api\/community\/comments\/([a-zA-Z0-9_-]+)$/);
  if (singleCommentMatch && req.method === 'DELETE') {
    const commentId = singleCommentMatch[1];
    await CommunityController.deleteComment(req, res, commentId);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
});

const os = require('os');

function getLocalIp() {
  try {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  } catch (e) {}
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIp();
  console.log(`[Pose & Gemini Server] Local server running on http://localhost:${PORT} and http://${localIp}:${PORT}`);

  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({
      url: `http://${localIp}:${PORT}`,
      updatedAt: new Date().toISOString()
    }, null, 2));
    console.log(`[Pose Server] LAN IP Config saved to ${CONFIG_PATH}`);
  } catch (e) {}

  communityWs.init(server);
  startTunnel();
});

// 2. Start Secure HTTPS Tunnel via localhost.run
function startTunnel() {
  console.log('[Pose Server] Establishing HTTPS Tunnel...');

  try {
    const tunnel = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-R', `80:localhost:${PORT}`,
      'nokey@localhost.run'
    ]);

    let foundUrl = false;

    tunnel.stdout.on('data', (data) => {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.(?:lhr\.life|lhrtunnel\.link)/) ||
                    text.match(/https:\/\/[a-zA-Z0-9-]+\.loca\.lt/);

      if (match && !foundUrl) {
        foundUrl = true;
        const httpsUrl = match[0];
        console.log(`\n==============================================`);
        console.log(`🚀 Public HTTPS Tunnel Ready for All Devices:`);
        console.log(`🔗 ${httpsUrl}`);
        console.log(`==============================================\n`);

        const configData = {
          url: httpsUrl,
          updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));
        console.log(`[Pose Server] Tunnel Config saved to ${CONFIG_PATH}`);
      }
    });

    tunnel.stderr.on('data', (data) => {});

    tunnel.on('close', (code) => {
      console.log(`[Pose Server] Tunnel closed (code ${code}), restarting in 5s...`);
      setTimeout(startTunnel, 5000);
    });
  } catch (e) {
    console.warn('[Pose Server] Tunnel spawn error:', e.message);
  }
}
