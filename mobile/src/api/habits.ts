import { api } from './client';
import { Frequency, Habit, HabitLog, HabitsSummary, Paginated } from '../types';

export interface HabitInput {
  name: string;
  icon?: string;
  color?: string;
  frequency: Frequency;
  custom_days?: number[];
  reminder_time?: string | null;
  is_active?: boolean;
}

export async function listHabits(): Promise<Habit[]> {
  const { data } = await api.get<Paginated<Habit>>('/api/habits/');
  return data.results;
}

export async function getHabit(id: number): Promise<Habit> {
  const { data } = await api.get<Habit>(`/api/habits/${id}/`);
  return data;
}

export async function createHabit(input: HabitInput): Promise<Habit> {
  const { data } = await api.post<Habit>('/api/habits/', input);
  return data;
}

export async function updateHabit(id: number, input: Partial<HabitInput>): Promise<Habit> {
  const { data } = await api.patch<Habit>(`/api/habits/${id}/`, input);
  return data;
}

export async function deleteHabit(id: number): Promise<void> {
  await api.delete(`/api/habits/${id}/`);
}

export async function toggleHabitLog(id: number, date?: string): Promise<HabitLog> {
  const { data } = await api.post<HabitLog>(`/api/habits/${id}/log/`, date ? { date } : {});
  return data;
}

export async function getHabitLogs(id: number, start?: string, end?: string): Promise<HabitLog[]> {
  const { data } = await api.get<HabitLog[]>(`/api/habits/${id}/logs/`, { params: { start, end } });
  return data;
}

export async function getHabitsSummary(): Promise<HabitsSummary> {
  const { data } = await api.get<HabitsSummary>('/api/habits/summary/');
  return data;
}
