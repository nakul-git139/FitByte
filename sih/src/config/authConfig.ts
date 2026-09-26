import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';

/**
 * Google OAuth Configuration
 *
 * To obtain client IDs:
 * 1. Open Google Cloud Console: https://console.cloud.google.com/
 * 2. Create or select your project.
 * 3. Go to "APIs & Services" > "Credentials".
 * 4. Create OAuth 2.0 Client IDs:
 *    - Web Client ID: For Expo Go, Web & Server verification.
 *    - Android Client ID: Package name: host.exp.exponent (Expo Go) or your app package, SHA-1 fingerprint
 *    - iOS Client ID: Bundle ID: host.exp.exponent (Expo Go) or your iOS bundle ID
 * 5. Add them to your .env file:
 *    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
 *    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
 *    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
 */

const DEFAULT_WEB_CLIENT_ID = '358798607485-it10raq39i3btmo3a1j2hj2a31edf4q7.apps.googleusercontent.com';

export const GOOGLE_AUTH_CONFIG = {
  // Scopes requested from Google
  scopes: ['openid', 'profile', 'email'],

  // OAuth Client IDs from environment
  webClientId:
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    DEFAULT_WEB_CLIENT_ID,
  androidClientId:
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ||
    '',
  iosClientId:
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
    '',

  // Scheme configured in app.json
  scheme: 'fitpilot',

  // Google OAuth Discovery Endpoints
  discovery: {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
  },
};

/**
 * Checks if at least one Google Client ID has been configured
 */
export function isGoogleAuthAvailable(): boolean {
  if (Platform.OS === 'android') {
    return Boolean(GOOGLE_AUTH_CONFIG.androidClientId || GOOGLE_AUTH_CONFIG.webClientId);
  }
  if (Platform.OS === 'ios') {
    return Boolean(GOOGLE_AUTH_CONFIG.iosClientId || GOOGLE_AUTH_CONFIG.webClientId);
  }
  return Boolean(GOOGLE_AUTH_CONFIG.webClientId);
}

/**
 * Returns redirect URI formatted for Expo AuthSession
 */
export function getGoogleRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: GOOGLE_AUTH_CONFIG.scheme,
    path: 'oauthredirect',
  });
}
