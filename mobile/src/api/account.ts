import { api } from './client';
import { Niche } from '../types';

export interface MeResponse {
  username: string;
  email: string;
  niche: Niche;
  timezone: string;
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/api/auth/me/');
  return data;
}

export async function updateMe(
  payload: Partial<Pick<MeResponse, 'email' | 'niche' | 'timezone'>>
): Promise<MeResponse> {
  const { data } = await api.patch<MeResponse>('/api/auth/me/', payload);
  return data;
}

export async function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  await api.post('/api/auth/change-password/', { old_password: oldPassword, new_password: newPassword });
}
