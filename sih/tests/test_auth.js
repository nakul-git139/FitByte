const assert = require('assert');
const http = require('http');
const userStore = require('../src/server/userStore');
const {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  verifyGoogleToken,
} = require('../src/server/authService');

const BASE_URL = 'http://localhost:8999';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const req = http.request(url, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = data ? JSON.parse(data) : {};
        } catch (e) {
          json = { raw: data };
        }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runAuthTests() {
  console.log('\n======================================================');
  console.log('🧪 TESTING AUTH & AUTHORIZATION SUITE (BCRYPT, JWT, GOOGLE)');
  console.log('======================================================\n');

  // --- UNIT TESTS ---
  console.log('--- TEST 1: Password Hashing with Bcrypt ---');
  const rawPassword = 'SuperSecret123!';
  const hash = await hashPassword(rawPassword);
  assert(hash.startsWith('$2'), 'Hash must be a valid bcrypt hash');
  assert(hash !== rawPassword, 'Hash must not equal raw password');
  console.log('✅ Passed: Password hashed successfully with salt rounds');

  console.log('\n--- TEST 2: Password Comparison with Bcrypt ---');
  const isMatch = await comparePassword(rawPassword, hash);
  const isMismatch = await comparePassword('WrongPassword', hash);
  assert.strictEqual(isMatch, true, 'Valid password must match');
  assert.strictEqual(isMismatch, false, 'Invalid password must not match');
  console.log('✅ Passed: Password comparison correctly verifies valid and rejects invalid passwords');

  console.log('\n--- TEST 3: JWT Token Generation & Verification ---');
  const dummyUser = { id: 'usr_test_123', email: 'athlete@fitpilot.test', name: 'Test Athlete', authProvider: 'local' };
  const token = generateToken(dummyUser);
  assert.ok(token, 'Token must be generated');
  const decoded = verifyToken(token);
  assert.strictEqual(decoded.userId, 'usr_test_123');
  assert.strictEqual(decoded.email, 'athlete@fitpilot.test');
  console.log('✅ Passed: JWT generation and verification intact');

  let invalidTokenCaught = false;
  try {
    verifyToken('invalid.token.here');
  } catch (err) {
    invalidTokenCaught = true;
  }
  assert.strictEqual(invalidTokenCaught, true, 'Invalid token must throw verification error');
  console.log('✅ Passed: Corrupt or forged JWT rejected');

  // --- INTEGRATION TESTS VIA API ---
  const testEmail = `test_${Date.now()}@fitpilot.io`;
  const testPassword = 'Password@123';
  let authToken = '';

  console.log('\n--- TEST 4: API Registration Flow (POST /api/auth/register) ---');
  const regRes = await makeRequest('POST', '/api/auth/register', {
    name: 'Champion Athlete',
    email: testEmail,
    password: testPassword,
  });

  assert.strictEqual(regRes.status, 201, `Registration should return 201, got ${regRes.status}`);
  assert.strictEqual(regRes.data.success, true);
  assert(regRes.data.token, 'Registration must return JWT token');
  assert.strictEqual(regRes.data.user.email, testEmail);
  assert.strictEqual(regRes.data.user.passwordHash, undefined, 'passwordHash must never be exposed');
  authToken = regRes.data.token;
  console.log('✅ Passed: User registered, password hashed, safe user and JWT returned');

  console.log('\n--- TEST 5: Duplicate Registration Rejection ---');
  const dupRes = await makeRequest('POST', '/api/auth/register', {
    name: 'Duplicate User',
    email: testEmail,
    password: testPassword,
  });
  assert.strictEqual(dupRes.status, 409, 'Duplicate email should return 409 Conflict');
  console.log('✅ Passed: Duplicate registration correctly prevented');

  console.log('\n--- TEST 6: API Login Flow (POST /api/auth/login) ---');
  const loginRes = await makeRequest('POST', '/api/auth/login', {
    email: testEmail,
    password: testPassword,
  });
  assert.strictEqual(loginRes.status, 200, `Login should return 200, got ${loginRes.status}`);
  assert.strictEqual(loginRes.data.success, true);
  assert(loginRes.data.token, 'Login must return JWT token');
  console.log('✅ Passed: User authenticated with bcrypt and received JWT');

  console.log('\n--- TEST 7: Invalid Login Rejection ---');
  const wrongLoginRes = await makeRequest('POST', '/api/auth/login', {
    email: testEmail,
    password: 'WrongPassword!',
  });
  assert.strictEqual(wrongLoginRes.status, 401, 'Wrong password must return 401');
  console.log('✅ Passed: Invalid credentials rejected');

  console.log('\n--- TEST 8: Protected Route Authorization (GET /api/auth/me) ---');
  const meRes = await makeRequest('GET', '/api/auth/me', null, {
    Authorization: `Bearer ${authToken}`,
  });
  assert.strictEqual(meRes.status, 200, 'Authorized request should return 200');
  assert.strictEqual(meRes.data.user.email, testEmail);
  console.log('✅ Passed: Protected route accessed with Bearer JWT');

  const unauthRes = await makeRequest('GET', '/api/auth/me');
  assert.strictEqual(unauthRes.status, 401, 'Request without token must return 401');
  console.log('✅ Passed: Protected route rejects missing token');

  console.log('\n--- TEST 9: Direct Google Login Flow (POST /api/auth/google) ---');
  const googleEmail = `google_user_${Date.now()}@gmail.com`;
  const googleRes = await makeRequest('POST', '/api/auth/google', {
    idToken: `mock_google_${googleEmail}`,
    userInfo: {
      name: 'Google Power User',
      email: googleEmail,
      picture: 'https://lh3.googleusercontent.com/a/google-avatar-test',
    },
  });

  assert.strictEqual(googleRes.status, 200, `Google login should return 200, got ${googleRes.status}`);
  assert.strictEqual(googleRes.data.success, true);
  assert(googleRes.data.token, 'Google login must return JWT token');
  assert.strictEqual(googleRes.data.user.authProvider, 'google');
  assert.strictEqual(googleRes.data.user.email, googleEmail);
  console.log('✅ Passed: Google account verified, user auto-created, and JWT issued');

  console.log('\n======================================================');
  console.log('🎉 ALL AUTH & AUTHORIZATION TESTS PASSED (9/9)!');
  console.log('======================================================\n');
}

runAuthTests().catch((err) => {
  console.error('❌ Auth test failure:', err);
  process.exit(1);
});
