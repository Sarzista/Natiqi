import { Platform } from 'react-native';

const DEV_PORT = 5000;

/**
 * Flask API origin (call at request time on web).
 *
 * - **Web (loopback):** use `127.0.0.1` for the API even when the page is `localhost`.
 *   Browsers often resolve `localhost` → IPv6 `::1` first; Flask/Werkzeug is usually IPv4-only,
 *   which yields `net::ERR_FAILED` and Chrome misreports it as a CORS failure.
 * - **Web (LAN):** use the same hostname as the page (e.g. `192.168.x.x`) so another device
 *   on the network talks to your PC’s Flask, not that device’s own loopback.
 * - **Android emulator:** `10.0.2.2` reaches the host.
 * - **iOS / other:** `localhost`.
 *
 * Dev API is always **http** on `DEV_PORT` (Flask default).
 */
export function getApiBase(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location?.hostname) {
      const { hostname } = window.location;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `http://127.0.0.1:${DEV_PORT}`;
      }
      if (hostname) {
        return `http://${hostname}:${DEV_PORT}`;
      }
    }
    return `http://127.0.0.1:${DEV_PORT}`;
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEV_PORT}`;
  }
  return `http://localhost:${DEV_PORT}`;
}
