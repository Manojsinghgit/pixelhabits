export type Niche = 'adhd' | 'anxiety' | 'general' | 'other';

export type Frequency = 'daily' | 'custom';

export type HabitCategory = 'health' | 'mind' | 'work' | 'learning' | 'other';

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
  category: HabitCategory;
  frequency: Frequency;
  custom_days: number[]; // 0=Monday..6=Sunday, only meaningful when frequency === 'custom'
  target_count: number | null; // set => a "quantity" habit tracked by count, not a checkbox
  unit: string; // e.g. "glasses", only meaningful when target_count is set
  reminder_time: string | null; // "HH:MM:SS"
  is_active: boolean;
  created_at: string;
  current_streak: number;
  longest_streak: number;
  completed_today: boolean;
  today_count: number;
}

export interface HabitLog {
  id: number;
  date: string; // "YYYY-MM-DD"
  completed: boolean;
  count: number;
  note: string;
  created_at: string;
}

export interface CalendarDayHabit {
  id: number;
  name: string;
  icon: string;
  color: string;
  completed: boolean;
}

export interface CalendarDay {
  date: string; // "YYYY-MM-DD"
  due: number;
  done: number;
  completion_pct: number;
  habits: CalendarDayHabit[];
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

export interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: string;
  earned: boolean;
  progress: number;
  target: number;
}

export interface Gamification {
  xp: number;
  level: number;
  xp_into_level: number;
  xp_for_next_level: number;
  coins: number;
  achievements: Achievement[];
}

export interface InsightHabitRef {
  id: number;
  name: string;
  color: string;
  pct: number;
}

export interface InsightPair {
  habit_a: string;
  habit_b: string;
  lift_pct: number;
}

export interface Insights {
  best_weekday: string | null;
  best_weekday_pct: number;
  trend_pct: number;
  most_consistent: InsightHabitRef | null;
  least_consistent: InsightHabitRef | null;
  pairs: InsightPair[];
}

export interface Friend {
  id: number;
  username: string;
}

export interface FriendRequestItem {
  id: number;
  username: string;
  direction: 'incoming' | 'outgoing';
  created_at: string;
}

export interface Friends {
  friends: Friend[];
  requests: FriendRequestItem[];
}

export interface LeaderboardEntry {
  username: string;
  is_you: boolean;
  level: number;
  week_completion_pct: number;
  best_current_streak: number;
}
