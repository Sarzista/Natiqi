/**
 * Auth Service - Connects to Flask Backend
 */
import { User, UserRole } from '../types';

const API_BASE = 'http://localhost:5000';

export const login = async (
  email: string,
  password: string,
  role: UserRole 
): Promise<User> => {
  console.log('🔌 Connecting to Flask backend...');
  console.log('📤 Sending:', { national_id: email, password, role });
  
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',  // ← THIS IS CRITICAL!
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      national_id: email, 
      password: password, 
      role: role 
    }),
  });

  console.log('📥 Response status:', res.status);
  
  const data = await res.json();
  console.log('📥 Response data:', data);

  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data as User;
};

export const logout = async (): Promise<void> => {
  console.log('👋 Logged out');
};



/**
 * Register - called by SignUpScreen
 */
export const register = async (
  nationalId: string,
  //name: string,
  phone: string,
  email: string,
  password: string,
  //gender: 'Male' | 'Female'
): Promise<void> => {
  console.log('🔌 Sending registration to Flask...');

  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      national_id: nationalId,
      // name:     name,
      phone_num:   phone,
      email:       email,
      password:    password,
      // gender:   gender,
    }),
  });

  const result = await res.json();
  console.log('📥 Register response:', result);

  if (!res.ok) {
    throw new Error(result.error || 'Registration failed');
  }
}