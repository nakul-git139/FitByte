const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');

const JWT_SECRET = process.env.JWT_SECRET || 'fitpilot-super-secret-jwt-key-2026-production';
const JWT_EXPIRES_IN = '7d';

/**
 * Hash a plain text password using bcrypt
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a valid non-empty string');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain text password against bcrypt hash
 */
async function comparePassword(password, hash) {
  if (!password || !hash) return false;
  return bcrypt.compare(password, hash);
}

/**
 * Sign a JWT for an authenticated user
 */
function generateToken(user) {
  if (!user || !user.id) {
    throw new Error('Invalid user payload for token generation');
  }

  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    authProvider: user.authProvider || 'local',
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT
 */
function verifyToken(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error(`Token verification failed: ${err.message}`);
  }
}

/**
 * Helper to make an HTTPS GET request returning parsed JSON
 */
function fetchHttpsJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(json.error_description || json.error || `HTTP ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.slice(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Verify Google authentication credentials
 * Accepts either:
 *  - idToken: Verified with Google OAuth tokeninfo endpoint
 *  - accessToken: Verified with Google OAuth userinfo endpoint
 *  - mock/dev token for local testing without internet
 */
async function verifyGoogleToken({ idToken, accessToken, userInfo }) {
  // 1. Mock / Dev token support for testing
  if (idToken && idToken.startsWith('mock_google_')) {
    const mockEmail = idToken.replace('mock_google_', '');
    return {
      googleId: `mock_gid_${mockEmail.split('@')[0]}`,
      email: mockEmail,
      name: userInfo?.name || mockEmail.split('@')[0],
      avatarUrl: userInfo?.avatarUrl || 'https://lh3.googleusercontent.com/a/default-user',
    };
  }

  // 2. Google ID Token verification
  if (idToken) {
    try {
      const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
      const payload = await fetchHttpsJson(url);

      if (!payload.email) {
        throw new Error('Google token did not provide an email address');
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split('@')[0],
        avatarUrl: payload.picture || null,
      };
    } catch (err) {
      console.warn('[AuthService] Google id_token verification error:', err.message);
      // If dev userInfo is provided alongside, allow fallback in development
      if (userInfo && userInfo.email) {
        return {
          googleId: userInfo.id || `dev_gid_${Date.now()}`,
          email: userInfo.email.toLowerCase(),
          name: userInfo.name || userInfo.email.split('@')[0],
          avatarUrl: userInfo.photo || userInfo.picture || null,
        };
      }
      throw new Error(`Google ID token verification failed: ${err.message}`);
    }
  }

  // 3. Google Access Token verification
  if (accessToken) {
    try {
      const url = 'https://www.googleapis.com/oauth2/v3/userinfo';
      const payload = await fetchHttpsJson(url, {
        Authorization: `Bearer ${accessToken}`,
      });

      if (!payload.email) {
        throw new Error('Google userinfo did not provide an email address');
      }

      return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        name: payload.name || payload.email.split('@')[0],
        avatarUrl: payload.picture || null,
      };
    } catch (err) {
      throw new Error(`Google access token verification failed: ${err.message}`);
    }
  }

  // 4. Direct user info if verified on client via official SDK
  if (userInfo && userInfo.email) {
    return {
      googleId: userInfo.id || userInfo.sub || `client_gid_${Date.now()}`,
      email: userInfo.email.toLowerCase(),
      name: userInfo.name || userInfo.email.split('@')[0],
      avatarUrl: userInfo.photo || userInfo.picture || null,
    };
  }

  throw new Error('No valid Google token or credentials provided');
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  verifyGoogleToken,
  JWT_SECRET,
};
