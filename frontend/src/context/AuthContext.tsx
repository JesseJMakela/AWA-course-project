// Global authentication context — provides user state and auth actions to the whole app
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../api/client';

interface User {
  _id: string;
  email: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // Persist token in localStorage so the session survives page refreshes
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // On mount, validate the stored token by fetching the current user from the API
  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await authAPI.getMe();
          setUser(response.data.user);
        } catch (error) {
          // Token is invalid or expired — clear it
          console.error('Failed to fetch user:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  // Send credentials to the API and store the returned JWT
  const login = async (email: string, password: string) => {
    const response = await authAPI.login(email, password);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  // Register a new account and automatically log in
  const register = async (email: string, password: string, username: string) => {
    const response = await authAPI.register(email, password, username);
    const { token, user } = response.data;
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  // Clear the token and user state to log out
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
