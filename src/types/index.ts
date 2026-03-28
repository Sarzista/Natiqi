/**
 * TypeScript type definitions
 */

export type UserRole = 'admin' | 'specialist' | 'patient';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Patient {
  id: string;
  name: string;
  roomNumber: string;
  status: 'stable' | 'critical' | 'warning' | 'monitoring';
  lastUpdate?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

