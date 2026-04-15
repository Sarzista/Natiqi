import { Platform } from 'react-native';

const DEV_PORT = 5000;

/**
 * Flask API origin. Web uses 127.0.0.1 to avoid some Windows `localhost` → IPv6 issues.
 * Android emulator uses 10.0.2.2 to reach the host machine.
 */
export function getApiBase(): string {
  if (Platform.OS === 'web') {
    return `http://127.0.0.1:${DEV_PORT}`;
  }
  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${DEV_PORT}`;
  }
  return `http://localhost:${DEV_PORT}`;
}

export const API_BASE = getApiBase();
