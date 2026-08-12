// Centralized so the ADHD-friendly design choices (high contrast, large
// touch targets, calm palette) stay consistent instead of drifting per screen.
export const colors = {
  background: '#0F1220',
  surface: '#1B1F33',
  surfaceAlt: '#262B45',
  primary: '#6C63FF',
  primaryText: '#FFFFFF',
  text: '#F4F4F8',
  textMuted: '#A0A4C1',
  border: '#33385A',
  success: '#3DDC97',
  danger: '#FF6B6B',
};

export const spacing = (n: number) => n * 8;

export const radius = {
  md: 12,
  lg: 20,
  pill: 999,
};

export const fontSize = {
  sm: 14,
  md: 16,
  lg: 20,
  xl: 28,
};
