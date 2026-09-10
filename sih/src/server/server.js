const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { generateWorkout, analyzeExerciseFrame, analyzeWorkoutSummary } = require('./geminiService');
const userStore = require('./userStore');
const {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  verifyGoogleToken,
} = require('./authService');

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
          name: googleProfile.name || 'FitByte Athlete',
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

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint Not Found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Pose & Gemini Server] Local server running on http://localhost:${PORT}`);
  startTunnel();
});

// 2. Start Secure HTTPS Tunnel via Pinggy
function startTunnel() {
  console.log('[Pose Server] Establishing HTTPS Tunnel...');

  const tunnel = spawn('ssh', [
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'ServerAliveInterval=30',
    '-p', '443',
    '-R0:localhost:' + PORT,
    'a.pinggy.io'
  ]);

  let foundUrl = false;

  tunnel.stdout.on('data', (data) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.free\.pinggy\.net/) ||
                  text.match(/https:\/\/[a-zA-Z0-9-]+\.run\.pinggy-free\.link/);

    if (match && !foundUrl) {
      foundUrl = true;
      const httpsUrl = match[0];
      console.log(`\n==============================================`);
      console.log(`🚀 Real-Time MediaPipe & Gemini HTTPS Tunnel Ready:`);
      console.log(`🔗 ${httpsUrl}`);
      console.log(`==============================================\n`);

      const configData = {
        url: httpsUrl,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2));
      console.log(`[Pose Server] Config saved to ${CONFIG_PATH}`);
    }
  });

  tunnel.stderr.on('data', (data) => {
    // Pinggy banner info
  });

  tunnel.on('close', (code) => {
    console.log(`[Pose Server] Tunnel closed (code ${code}), restarting in 5s...`);
    setTimeout(startTunnel, 5000);
  });
}
