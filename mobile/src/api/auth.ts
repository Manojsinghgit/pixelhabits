import { api } from './client';
import { AuthTokens, Niche, User } from '../types';

export interface RegisterInput {
  username: string;
  email?: string;
  password: string;
  niche?: Niche;
  timezone?: string;
}

export async function registerUser(payload: RegisterInput): Promise<User> {
  const { data } = await api.post<User>('/api/auth/register/', payload);
  return data;
}

export async function loginUser(username: string, password: string): Promise<AuthTokens> {
  const { data } = await api.post<AuthTokens>('/api/auth/login/', { username, password });
  return data;
}
