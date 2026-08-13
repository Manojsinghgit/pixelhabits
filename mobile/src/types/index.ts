export type Niche = 'adhd' | 'anxiety' | 'general' | 'other';

export type Frequency = 'daily' | 'custom';

export interface User {
  id: number;
  username: string;
  email: string;
  niche: Niche;
  timezone: string;
}

export interface Habit {
  id: number;
  name: string;
  icon: string;
  color: string;
  frequency: Frequency;
  custom_days: number[]; // 0=Monday..6=Sunday, only meaningful when frequency === 'custom'
  reminder_time: string | null; // "HH:MM:SS"
  is_active: boolean;
  created_at: string;
  current_streak: number;
  longest_streak: number;
  completed_today: boolean;
}

export interface HabitLog {
  id: number;
  date: string; // "YYYY-MM-DD"
  completed: boolean;
  note: string;
  created_at: string;
}

export interface HabitSummaryItem {
  id: number;
  name: string;
  icon: string;
  color: string;
  current_streak: number;
  longest_streak: number;
  week_completion_pct: number;
}

export interface HabitsSummary {
  week_start: string;
  week_end: string;
  overall_completion_pct: number;
  habits: HabitSummaryItem[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface AuthTokens {
  access: string;
  refresh: string;
}
