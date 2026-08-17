import { api } from './client';
import { Friends, LeaderboardEntry } from '../types';

export async function getFriends(): Promise<Friends> {
  const { data } = await api.get<Friends>('/api/friends/');
  return data;
}

export async function sendFriendRequest(username: string): Promise<void> {
  await api.post('/api/friends/request/', { username });
}

export async function acceptFriendRequest(id: number): Promise<void> {
  await api.post(`/api/friends/${id}/respond/`);
}

export async function removeFriendRequest(id: number): Promise<void> {
  await api.delete(`/api/friends/${id}/respond/`);
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data } = await api.get<LeaderboardEntry[]>('/api/friends/leaderboard/');
  return data;
}
