const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class UserStore {
  constructor() {
    this.users = [];
    this.loadUsers();
  }

  loadUsers() {
    try {
      if (fs.existsSync(USERS_FILE)) {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        this.users = JSON.parse(data || '[]');
      } else {
        this.users = [];
        this.saveUsers();
      }
    } catch (err) {
      console.warn('[UserStore] Error loading users.json, initializing empty:', err.message);
      this.users = [];
    }
  }

  saveUsers() {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(this.users, null, 2), 'utf8');
    } catch (err) {
      console.error('[UserStore] Error saving users.json:', err.message);
    }
  }

  /**
   * Strips sensitive data like passwordHash before sending to clients
   */
  toSafeUser(user) {
    if (!user) return null;
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  findByEmail(email) {
    if (!email) return null;
    const normalized = email.trim().toLowerCase();
    return this.users.find((u) => u.email.toLowerCase() === normalized) || null;
  }

  findById(id) {
    if (!id) return null;
    return this.users.find((u) => u.id === id) || null;
  }

  findByGoogleId(googleId) {
    if (!googleId) return null;
    return this.users.find((u) => u.googleId === googleId) || null;
  }

  createUser({ name, email, passwordHash, googleId = null, avatarUrl = null, authProvider = 'local' }) {
    const normalizedEmail = email.trim().toLowerCase();
    const existing = this.findByEmail(normalizedEmail);
    if (existing) {
      throw new Error('A user with this email address already exists');
    }

    const newUser = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: passwordHash || null,
      googleId: googleId || null,
      avatarUrl: avatarUrl || null,
      authProvider,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.users.push(newUser);
    this.saveUsers();
    return newUser;
  }

  updateUser(id, updates) {
    const userIndex = this.users.findIndex((u) => u.id === id);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const currentUser = this.users[userIndex];
    const updatedUser = {
      ...currentUser,
      ...updates,
      id: currentUser.id, // Immutable ID
      updatedAt: new Date().toISOString(),
    };

    this.users[userIndex] = updatedUser;
    this.saveUsers();
    return updatedUser;
  }

  getAllSafeUsers() {
    return this.users.map((u) => this.toSafeUser(u));
  }
}

const userStore = new UserStore();
module.exports = userStore;
