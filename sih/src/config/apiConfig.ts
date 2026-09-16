import { NativeModules, Platform } from 'react-native';

const HARDCODED_LAN_IP = '192.168.13.191';
const HARDCODED_TUNNEL_URL = 'https://6e9abe196d161d.lhr.life';

let cachedActiveUrl: string | null = null;
let isResolving = false;

/**
 * Returns all potential backend URLs to test
 */
export function getCandidateBackendUrls(): string[] {
  const candidates: string[] = [];

  // 1. Hardcoded live public HTTPS tunnel
  if (HARDCODED_TUNNEL_URL) {
    candidates.push(HARDCODED_TUNNEL_URL.replace(/\/+$/, ''));
  }

  // 2. poseConfig.json if present
  try {
    const poseConfig = require('./poseConfig.json');
    if (poseConfig && poseConfig.url && typeof poseConfig.url === 'string' && poseConfig.url.startsWith('http')) {
      const url = poseConfig.url.replace(/\/+$/, '');
      if (!url.includes('xmiqg-14-96-175-242') && !candidates.includes(url)) {
        candidates.push(url);
      }
    }
  } catch (e) {}

  // 3. Bundler host LAN IP from React Native SourceCode
  try {
    const scriptUrl = NativeModules.SourceCode?.scriptURL;
    if (scriptUrl && typeof scriptUrl === 'string') {
      const match = scriptUrl.match(/^https?:\/\/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (match && match[1] && match[1] !== '127.0.0.1') {
        const lanUrl = `http://${match[1]}:8999`;
        if (!candidates.includes(lanUrl)) {
          candidates.push(lanUrl);
        }
      }
    }
  } catch (e) {}

  // 4. Known LAN IP
  const defaultLanUrl = `http://${HARDCODED_LAN_IP}:8999`;
  if (!candidates.includes(defaultLanUrl)) {
    candidates.push(defaultLanUrl);
  }

  // 5. Localhost
  if (!candidates.includes('http://localhost:8999')) {
    candidates.push('http://localhost:8999');
  }

  return candidates;
}

/**
 * Fast asynchronous resolver that pings candidates in parallel and caches the first working URL
 */
export async function resolveActiveBackendUrl(): Promise<string> {
  if (cachedActiveUrl) return cachedActiveUrl;
  if (isResolving) return getBackendBaseUrl();

  isResolving = true;
  const candidates = getCandidateBackendUrls();

  try {
    const checkUrl = async (url: string): Promise<string> => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch(`${url}/api/health`, {
          signal: controller.signal,
          headers: { 'Bypass-Tunnel-Reminder': 'true' },
        });
        clearTimeout(id);
        if (res.ok) {
          return url;
        }
        throw new Error('Not ok');
      } catch (err) {
        clearTimeout(id);
        throw err;
      }
    };

    // Race working candidates
    const winningUrl = await Promise.any(candidates.map((u) => checkUrl(u)));
    if (winningUrl) {
      cachedActiveUrl = winningUrl;
      isResolving = false;
      return winningUrl;
    }
  } catch {
    // If all fail, fallback
  }

  isResolving = false;
  return getBackendBaseUrl();
}

/**
 * Synchronous dynamic API configuration
 */
export function getBackendBaseUrl(): string {
  if (cachedActiveUrl) {
    return cachedActiveUrl;
  }

  // Trigger background discovery
  if (!isResolving) {
    resolveActiveBackendUrl().catch(() => {});
  }

  // Default priority fallback
  return HARDCODED_TUNNEL_URL || `http://${HARDCODED_LAN_IP}:8999`;
}

/**
 * Resolves the WebSocket URL based on backend base URL (ws:// or wss://)
 */
export function getBackendWsUrl(): string {
  const httpUrl = getBackendBaseUrl();
  if (httpUrl.startsWith('https://')) {
    return httpUrl.replace('https://', 'wss://');
  }
  return httpUrl.replace('http://', 'ws://');
}
