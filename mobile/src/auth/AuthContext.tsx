import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { loginUser, RegisterInput, registerUser } from '../api/auth';
import { setOnAuthFailure } from '../api/client';
import { STORAGE_KEYS, storage } from '../api/storage';
import { registerPushToken, unregisterPushToken } from '../utils/notifications';

interface AuthContextValue {
  username: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await unregisterPushToken();
    await Promise.all([
      storage.removeItem(STORAGE_KEYS.accessToken),
      storage.removeItem(STORAGE_KEYS.refreshToken),
      storage.removeItem(STORAGE_KEYS.username),
    ]);
    setUsername(null);
  }, []);

  useEffect(() => {
    // client.ts calls this if a token refresh fails (e.g. refresh token
    // expired), so the app falls back to the login screen automatically.
    setOnAuthFailure(() => setUsername(null));
  }, []);

  useEffect(() => {
    (async () => {
      const [access, storedUsername] = await Promise.all([
        storage.getItem(STORAGE_KEYS.accessToken),
        storage.getItem(STORAGE_KEYS.username),
      ]);
      if (access && storedUsername) {
        setUsername(storedUsername);
        registerPushToken();
      }
      setIsLoading(false);
    })();
  }, []);

  const login = useCallback(async (usernameInput: string, password: string) => {
    const tokens = await loginUser(usernameInput, password);
    await Promise.all([
      storage.setItem(STORAGE_KEYS.accessToken, tokens.access),
      storage.setItem(STORAGE_KEYS.refreshToken, tokens.refresh),
      storage.setItem(STORAGE_KEYS.username, usernameInput),
    ]);
    setUsername(usernameInput);
    registerPushToken();
  }, []);

  const register = useCallback(
    async (payload: RegisterInput) => {
      await registerUser(payload);
      await login(payload.username, payload.password);
    },
    [login]
  );

  return (
    <AuthContext.Provider value={{ username, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
