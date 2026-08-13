import { MaterialCommunityIcons } from '@expo/vector-icons';

// The backend stores `Habit.icon` as a plain emoji character (legacy choice
// from before the app had a proper icon set). Rather than change the data
// contract, we keep emoji as the stored/selectable value and map it to a
// MaterialCommunityIcons glyph purely for rendering.
export type HabitIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export const HABIT_ICON_OPTIONS: { value: string; icon: HabitIconName; label: string }[] = [
  { value: '✅', icon: 'checkbox-marked-circle-outline', label: 'General' },
  { value: '💧', icon: 'water-outline', label: 'Hydration' },
  { value: '🏃', icon: 'run', label: 'Exercise' },
  { value: '🧘', icon: 'meditation', label: 'Mindfulness' },
  { value: '📖', icon: 'book-open-page-variant-outline', label: 'Reading' },
  { value: '💊', icon: 'pill', label: 'Medication' },
  { value: '🦷', icon: 'tooth-outline', label: 'Hygiene' },
  { value: '🥗', icon: 'food-apple-outline', label: 'Nutrition' },
  { value: '😴', icon: 'sleep', label: 'Sleep' },
  { value: '🧹', icon: 'broom', label: 'Chores' },
  { value: '✍️', icon: 'pencil-outline', label: 'Writing' },
  { value: '🚭', icon: 'smoking-off', label: 'Quit smoking' },
];

const ICON_LOOKUP: Record<string, HabitIconName> = HABIT_ICON_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.value]: option.icon }),
  {} as Record<string, HabitIconName>
);

const FALLBACK_ICON: HabitIconName = 'star-four-points-outline';

export function habitIconName(value: string): HabitIconName {
  return ICON_LOOKUP[value] ?? FALLBACK_ICON;
}
