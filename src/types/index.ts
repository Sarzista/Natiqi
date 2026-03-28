/**
 * TypeScript type definitions
 */

export type UserRole = 'admin' | 'specialist' | 'RegisteredUser';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Patient {
  nationalId:  string;
  name:        string;
  gender:      string;
  dateOfBirth: string;
  roomNumber:  string;
  device:      string;
  status:      'stable' | 'critical' | 'warning' | 'monitoring';
  specialistNationalId: string;
  lastUpdate?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

