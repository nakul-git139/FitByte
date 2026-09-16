import { getBackendBaseUrl } from '../config/apiConfig';
import { StorageService } from './storageService';
import { User, AuthResponse, GoogleAuthPayload } from '../types/auth';

/**
 * Helper to execute fetch with a 12s timeout to accommodate mobile tunnels
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 12000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {
      'Bypass-Tunnel-Reminder': 'true',
      ...(options.headers as Record<string, string>),
    };
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export class AuthService {
  /**
   * Register a new user with name, email, and password
   * Tries backend first; falls back seamlessly to offline local registration if server is unreachable
   */
  public static async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      const baseUrl = getBackendBaseUrl();
      const response = await fetchWithTimeout(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
      }, 3500);

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Registration failed (${response.status})`,
        };
      }

      // Persist auth session & local account
      await StorageService.saveLocalAccount(data.user, password);
      await StorageService.saveAuthSession(data.token, data.user);
      return {
        success: true,
        token: data.token,
        user: data.user,
      };
    } catch (err: any) {
      console.warn('[AuthService] register network error, falling back to local storage:', err.message);
      
      // Resilient local offline registration
      const localUser: User = {
        id: `user_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: cleanEmail,
        name: cleanName,
        authProvider: 'local',
        createdAt: new Date().toISOString(),
      };
      const localToken = `local_token_${Date.now()}`;

      await StorageService.saveLocalAccount(localUser, password);
      await StorageService.saveAuthSession(localToken, localUser);

      return {
        success: true,
        token: localToken,
        user: localUser,
      };
    }
  }

  /**
   * Sign in with email and password
   * Tries backend first; falls back seamlessly to offline local credentials if server is unreachable
   */
  public static async login(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const baseUrl = getBackendBaseUrl();
      const response = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      }, 3500);

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Login failed (${response.status})`,
        };
      }

      // Persist auth session & local cache
      await StorageService.saveLocalAccount(data.user, password);
      await StorageService.saveAuthSession(data.token, data.user);
      return {
        success: true,
        token: data.token,
        user: data.user,
      };
    } catch (err: any) {
      console.warn('[AuthService] login network error, checking local storage:', err.message);

      // Resilient local offline login
      const localAccount = await StorageService.findLocalUserByEmail(cleanEmail);
      if (localAccount) {
        if (localAccount.password && localAccount.password !== password) {
          return {
            success: false,
            error: 'Incorrect password. Please verify and try again.',
          };
        }
        const localToken = `local_token_${Date.now()}`;
        await StorageService.saveAuthSession(localToken, localAccount.user);
        return {
          success: true,
          token: localToken,
          user: localAccount.user,
        };
      }

      // If user hasn't registered locally yet on this device, create local profile directly
      const localUser: User = {
        id: `user_local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0],
        authProvider: 'local',
        createdAt: new Date().toISOString(),
      };
      const localToken = `local_token_${Date.now()}`;

      await StorageService.saveLocalAccount(localUser, password);
      await StorageService.saveAuthSession(localToken, localUser);

      return {
        success: true,
        token: localToken,
        user: localUser,
      };
    }
  }

  /**
   * Direct login or signup using Google credentials
   * Seamlessly logs in with Google online or offline with full profile hydration
   */
  public static async loginWithGoogle(payload: GoogleAuthPayload): Promise<AuthResponse> {
    const cleanEmail = (payload.userInfo?.email || 'google.athlete@gmail.com').trim().toLowerCase();
    const cleanName = payload.userInfo?.name || cleanEmail.split('@')[0] || 'Google Athlete';
    const cleanAvatar = payload.userInfo?.picture || 'https://lh3.googleusercontent.com/a/default-user';
    const googleId = payload.userInfo?.id || `google_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    try {
      const baseUrl = getBackendBaseUrl();
      const response = await fetchWithTimeout(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, 3500);

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Google authentication failed (${response.status})`,
        };
      }

      // Persist auth session & local account
      await StorageService.saveLocalAccount(data.user);
      await StorageService.saveAuthSession(data.token, data.user);
      return {
        success: true,
        token: data.token,
        user: data.user,
      };
    } catch (err: any) {
      console.warn('[AuthService] google auth network error, authenticating locally:', err.message);

      // Resilient local Google authentication
      const googleUser: User = {
        id: googleId,
        email: cleanEmail,
        name: cleanName,
        avatarUrl: cleanAvatar,
        authProvider: 'google',
        createdAt: new Date().toISOString(),
      };
      const localToken = `local_google_token_${Date.now()}`;

      await StorageService.saveLocalAccount(googleUser);
      await StorageService.saveAuthSession(localToken, googleUser);

      return {
        success: true,
        token: localToken,
        user: googleUser,
      };
    }
  }

  /**
   * Get current stored user session, validating against /api/auth/me if online
   */
  public static async getCurrentUser(): Promise<User | null> {
    try {
      const session = await StorageService.getAuthSession();
      if (!session || !session.token) {
        return null;
      }

      // Try background verification with timeout
      try {
        const baseUrl = getBackendBaseUrl();
        const res = await fetchWithTimeout(`${baseUrl}/api/auth/me`, {
          headers: { Authorization: `Bearer ${session.token}` },
        }, 2000);

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            await StorageService.saveAuthSession(session.token, data.user);
            return data.user;
          }
        }
      } catch {
        // Ignore network timeout during background verification
      }

      // Fallback to locally cached user
      return session.user;
    } catch (err) {
      const session = await StorageService.getAuthSession();
      return session ? session.user : null;
    }
  }

  /**
   * Retrieve active JWT token for authorized API requests
   */
  public static async getToken(): Promise<string | null> {
    const session = await StorageService.getAuthSession();
    return session ? session.token : null;
  }

  /**
   * Logout user and clear all auth storage
   */
  public static async logout(): Promise<void> {
    await StorageService.clearAuthSession();
  }
}
