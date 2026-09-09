/**
 * Dynamic API configuration that automatically resolves the backend URL:
 * 1. Checks poseConfig.json (Pinggy HTTPS tunnel when running server)
 * 2. Falls back to http://localhost:8999
 */
export function getBackendBaseUrl(): string {
  try {
    const poseConfig = require('./poseConfig.json');
    if (poseConfig && poseConfig.url && typeof poseConfig.url === 'string' && poseConfig.url.startsWith('http')) {
      return poseConfig.url.replace(/\/+$/, '');
    }
  } catch (e) {
    // poseConfig.json not found or parse error
  }

  return 'http://localhost:8999';
}
