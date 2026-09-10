import { getBackendBaseUrl } from '../config/apiConfig';
import { StorageService } from './storageService';
import { User, AuthResponse, GoogleAuthPayload } from '../types/auth';

export class AuthService {
  /**
   * Register a new user with name, email, and password
   */
  public static async register(name: string, email: string, password: string): Promise<AuthResponse> {
    try {
      const baseUrl = getBackendBaseUrl();
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Registration failed (${response.status})`,
        };
      }

      // Persist auth session
      await StorageService.saveAuthSession(data.token, data.user);
      return {
        success: true,
        token: data.token,
        user: data.user,
      };
    } catch (err: any) {
      console.warn('[AuthService] register network error:', err.message);
      return {
        success: false,
        error: err.message || 'Unable to connect to authentication server',
      };
    }
  }

  /**
   * Sign in with email and password
   */
  public static async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const baseUrl = getBackendBaseUrl();
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Login failed (${response.status})`,
        };
      }

      // Persist auth session
      await StorageService.saveAuthSession(data.token, data.user);
      return {
        success: true,
        token: data.token,
        user: data.user,
      };
    } catch (err: any) {
      console.warn('[AuthService] login network error:', err.message);
      return {
        success: false,
        error: err.message || 'Unable to connect to authentication server',
      };
    }
  }

  /**
   * Direct login or signup using Google credentials
   */
  public static async loginWithGoogle(payload: GoogleAuthPayload): Promise<AuthResponse> {
    try {
      const baseUrl = getBackendBaseUrl();
      const response = await fetch(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Google authentication failed (${response.status})`,
        };
      }

      // Persist auth session
      await StorageService.saveAuthSession(data.token, data.user);
      return {
        success: true,
        token: data.token,
        user: data.user,
      };
    } catch (err: any) {
      console.warn('[AuthService] google auth network error:', err.message);
      return {
        success: false,
        error: err.message || 'Unable to connect to Google authentication service',
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

      // Try background verification
      const baseUrl = getBackendBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          await StorageService.saveAuthSession(session.token, data.user);
          return data.user;
        }
      }

      // Fallback to locally cached user if offline
      return session.user;
    } catch (err) {
      // Offline fallback
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
