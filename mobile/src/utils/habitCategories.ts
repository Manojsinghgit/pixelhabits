import { MaterialCommunityIcons } from '@expo/vector-icons';
import { HabitCategory } from '../types';

export const CATEGORY_OPTIONS: {
  value: HabitCategory;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { value: 'health', label: 'Health', icon: 'heart-pulse' },
  { value: 'mind', label: 'Mind', icon: 'meditation' },
  { value: 'work', label: 'Work', icon: 'briefcase-outline' },
  { value: 'learning', label: 'Learning', icon: 'book-open-page-variant-outline' },
  { value: 'other', label: 'Other', icon: 'shape-outline' },
];

export function categoryLabel(value: HabitCategory): string {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? 'Other';
}

export function categoryIcon(value: HabitCategory): keyof typeof MaterialCommunityIcons.glyphMap {
  return CATEGORY_OPTIONS.find((c) => c.value === value)?.icon ?? 'shape-outline';
}
