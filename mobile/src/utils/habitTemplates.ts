// Presets so a new user can tap once and have a sensible habit instead of
// facing a blank form — the single biggest drop-off point for this audience.
export interface HabitTemplate {
  name: string;
  icon: string;
  color: string;
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  { name: 'Drink water', icon: '💧', color: '#00AEEF' },
  { name: 'Move for 10 minutes', icon: '🏃', color: '#3DDC97' },
  { name: 'Take a mindful minute', icon: '🧘', color: '#7C6CFF' },
  { name: 'Read a page', icon: '📖', color: '#FFB84D' },
  { name: 'Take medication', icon: '💊', color: '#FF6B6B' },
  { name: 'Sleep on time', icon: '😴', color: '#F368E0' },
  { name: 'Tidy for 5 minutes', icon: '🧹', color: '#00AEEF' },
];
