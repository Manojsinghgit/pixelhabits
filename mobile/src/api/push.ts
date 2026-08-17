import { api } from './client';

export async function registerDeviceToken(token: string, platform: 'ios' | 'android' | 'web'): Promise<void> {
  await api.post('/api/auth/device-token/', { token, platform });
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  await api.delete('/api/auth/device-token/', { data: { token } });
}
