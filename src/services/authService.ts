/**
 * Mock authentication service
 * Later this will be replaced with real API calls
 */
import { User, UserRole } from '../types';

/**
 * Fake login function
 * Accepts any email/password and returns a mock user
 */
export const login = async (
  email: string,
  password: string,
  role: UserRole = 'patient'
): Promise<User> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // For now, accept any credentials
  // Later: validate against real API
  const roleNames = {
    admin: 'System Admin',
    specialist: 'Medical Specialist',
    patient: 'Patient',
  };

  return {
    id: '1',
    email,
    name: `${roleNames[role]} User`,
    role,
  };
};

/**
 * Fake logout function
 */
export const logout = async (): Promise<void> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 200));
  // Later: call real logout API
};

