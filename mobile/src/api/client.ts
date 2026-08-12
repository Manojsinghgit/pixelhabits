import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { STORAGE_KEYS, storage } from './storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error('EXPO_PUBLIC_API_URL is not set — check mobile/.env');
}

export const api = axios.create({ baseURL: API_URL });

// Plain client for the refresh call itself, so its 401s don't recurse
// through the interceptor below.
const refreshClient = axios.create({ baseURL: API_URL });

// Called by AuthContext so this module can trigger a logout without
// importing React state directly.
let onAuthFailure: (() => void) | null = null;
export function setOnAuthFailure(handler: () => void) {
  onAuthFailure = handler;
}

api.interceptors.request.use(async (config) => {
  const token = await storage.getItem(STORAGE_KEYS.accessToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Multiple requests can 401 around the same time (e.g. a screen firing off
// several calls at once) — this ensures only one refresh call happens and
// everyone else waits on it, instead of each racing to refresh separately.
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await storage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;

  try {
    const { data } = await refreshClient.post('/api/auth/refresh/', { refresh: refreshToken });
    await storage.setItem(STORAGE_KEYS.accessToken, data.access);
    if (data.refresh) {
      await storage.setItem(STORAGE_KEYS.refreshToken, data.refresh);
    }
    return data.access as string;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status !== 401 || !original || original._retried) {
      throw error;
    }
    original._retried = true;

    refreshPromise ??= refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
    const newAccessToken = await refreshPromise;

    if (!newAccessToken) {
      await storage.removeItem(STORAGE_KEYS.accessToken);
      await storage.removeItem(STORAGE_KEYS.refreshToken);
      onAuthFailure?.();
      throw error;
    }

    original.headers.Authorization = `Bearer ${newAccessToken}`;
    return api(original);
  }
);
