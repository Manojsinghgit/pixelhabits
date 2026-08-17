import { api } from './client';
import { CalendarDay, Frequency, Habit, HabitCategory, HabitLog, HabitsSummary, Paginated } from '../types';

export interface HabitInput {
  name: string;
  icon?: string;
  color?: string;
  category?: HabitCategory;
  frequency: Frequency;
  custom_days?: number[];
  target_count?: number | null;
  unit?: string;
  reminder_time?: string | null;
  is_active?: boolean;
}

export interface ListHabitsParams {
  search?: string;
  category?: HabitCategory;
}

export async function listHabits(params?: ListHabitsParams): Promise<Habit[]> {
  const { data } = await api.get<Paginated<Habit>>('/api/habits/', { params });
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

export async function toggleHabitLog(id: number, date?: string, delta?: number): Promise<HabitLog> {
  const body: { date?: string; delta?: number } = {};
  if (date) body.date = date;
  if (delta !== undefined) body.delta = delta;
  const { data } = await api.post<HabitLog>(`/api/habits/${id}/log/`, body);
  return data;
}

export async function getHabitLogs(id: number, start?: string, end?: string): Promise<HabitLog[]> {
  const { data } = await api.get<HabitLog[]>(`/api/habits/${id}/logs/`, { params: { start, end } });
  return data;
}

export async function setHabitNote(id: number, note: string, date?: string): Promise<HabitLog> {
  const { data } = await api.post<HabitLog>(`/api/habits/${id}/note/`, date ? { note, date } : { note });
  return data;
}

export async function getHabitsSummary(): Promise<HabitsSummary> {
  const { data } = await api.get<HabitsSummary>('/api/habits/summary/');
  return data;
}

export async function getHabitsCalendar(month?: string): Promise<CalendarDay[]> {
  const { data } = await api.get<CalendarDay[]>('/api/habits/calendar/', { params: month ? { month } : {} });
  return data;
}
