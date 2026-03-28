/**
 * Authentication Context
 * Manages user authentication state
 */
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthContextType, UserRole } from '../types';
import { login as authLogin, logout as authLogout } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('auth:user');
        if (stored) {
          const parsed: User = JSON.parse(stored);
          setUser(parsed);
        }
      } catch (error) {
        console.error('Failed to hydrate auth user', error);
      } finally {
        setHydrated(true);
      }
    };
    loadUser();
  }, []);

  const login = async (email: string, password: string, role?: UserRole) => {
    try {
      const userData = await authLogin(email, password, role);
      setUser(userData);
      await AsyncStorage.setItem('auth:user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
      await AsyncStorage.removeItem('auth:user');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {/* Delay render until hydration finishes to avoid role flicker */}
      {hydrated ? children : null}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

