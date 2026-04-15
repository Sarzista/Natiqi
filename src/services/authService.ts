/**
 * Auth Service - Connects to Flask Backend
 */
import { User, UserRole } from '../types';
import { API_BASE } from '../config/apiBase';

function rethrowIfUnreachable(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    err instanceof TypeError &&
    /failed to fetch|network request failed|load failed/i.test(msg)
  ) {
    throw new Error(
      `Cannot reach the API (${API_BASE}). Start the Flask backend: open a terminal, cd into the backend folder, run python app.py (on Windows try py -3 app.py), and keep that window open while you use the app.`
    );
  }
  throw err instanceof Error ? err : new Error(msg);
}

/** Map UI role to Flask `/auth/login` `role` field */
function toBackendLoginRole(role: UserRole | string | undefined): string {
  if (role === 'admin') return 'admin';
  if (role === 'specialist') return 'specialist';
  if (role === 'patient') return 'patient';
  if (role === 'RegisteredUser') return 'RegisteredUser';
  return 'RegisteredUser';
}

export const login = async (
  email: string,
  password: string,
  role: UserRole 
): Promise<User> => {
  const backendRole = toBackendLoginRole(role);
  console.log('🔌 Connecting to Flask backend...');
  console.log('📤 Sending:', { national_id: email, password, role: backendRole });

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        national_id: email,
        password: password,
        role: backendRole,
      }),
    });

    console.log('📥 Response status:', res.status);

    const data = await res.json();
    console.log('📥 Response data:', data);

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    return data as User;
  } catch (e) {
    rethrowIfUnreachable(e);
  }
};

export const logout = async (): Promise<void> => {
  console.log('👋 Logged out');
};



export type RegisterResult = {
  message: string;
  /** Present when Flask runs in debug or `RETURN_VERIFICATION_CODE=1` — use for local testing only */
  dev_code?: string;
};

/**
 * Register - called by SignUpScreen
 */
export const register = async (
  nationalId: string,
  name: string,
  phone: string,
  email: string,
  password: string,
  gender: 'Male' | 'Female'
): Promise<RegisterResult> => {
  console.log('🔌 Sending registration to Flask...');

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        national_id: nationalId,
        name,
        phone_num: phone,
        email,
        password,
        gender,
      }),
    });

    const result = await res.json();
    console.log('📥 Register response:', result);

    if (!res.ok) {
      throw new Error(result.error || 'Registration failed');
    }
    return {
      message: result.message || 'Account created successfully!',
      dev_code: result.dev_code,
    };
  } catch (e) {
    rethrowIfUnreachable(e);
  }
};

export const verifyAccountCode = async (
  nationalId: string,
  code: string
): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ national_id: nationalId, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Verification failed');
    }
  } catch (e) {
    rethrowIfUnreachable(e);
  }
};

export const resendVerificationCode = async (
  nationalId: string
): Promise<RegisterResult> => {
  try {
    const res = await fetch(`${API_BASE}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ national_id: nationalId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not resend code');
    }
    return {
      message: data.message || 'New code sent.',
      dev_code: data.dev_code,
    };
  } catch (e) {
    rethrowIfUnreachable(e);
  }
};