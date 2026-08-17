import { api } from './client';
import { Gamification, Insights } from '../types';

export async function getGamification(): Promise<Gamification> {
  const { data } = await api.get<Gamification>('/api/gamification/');
  return data;
}

export async function getInsights(): Promise<Insights> {
  const { data } = await api.get<Insights>('/api/habits/insights/');
  return data;
}
