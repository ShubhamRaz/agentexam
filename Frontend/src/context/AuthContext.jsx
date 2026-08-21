import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as authLogout } from '../services/auth';
import { tokenStore } from '../services/client';

/**
 * Global authentication context.
 *
 * Provides:
 *  - user: current user object | null
 *  - loading: true while checking session on app load
 *  - isAuthenticated: boolean
 *  - login: stores token (called after auth.login succeeds)
 *  - logout: clears token and user state
 *  - refreshUser: re-fetches /auth/me
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  /** On mount: check if a token exists and if so, load the current user */
  useEffect(() => {
    const initAuth = async () => {
      const token = tokenStore.get();
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await getMe();
        setUser(me);
      } catch {
        // Token invalid or expired — clear it
        tokenStore.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Call this after a successful login to hydrate user state.
   * The token is expected to already be stored by auth.login().
   */
  const login = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch (err) {
      setUser(null);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    authLogout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch {
      logout();
    }
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
