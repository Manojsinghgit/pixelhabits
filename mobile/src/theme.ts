import { Platform } from 'react-native';

// Centralized so the ADHD-friendly design choices (high contrast, large
// touch targets, calm palette) stay consistent instead of drifting per screen.
export const colors = {
  background: '#080B08',
  surface: '#10150F',
  surfaceRaised: '#161D14',
  surfaceAlt: '#1E271B',
  overlay: 'rgba(6,10,6,0.72)',

  primary: '#22C55E',
  primaryDark: '#16A34A',
  primarySoft: 'rgba(34,197,94,0.16)',
  primaryText: '#07170D',

  accent: '#84CC16',
  accentSoft: 'rgba(132,204,22,0.14)',

  text: '#EAF5EC',
  textMuted: '#8FA893',
  textFaint: '#5B6E5D',

  border: '#1C261A',
  borderLight: '#28351F',

  success: '#4ADE80',
  successSoft: 'rgba(74,222,128,0.14)',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.14)',
  warning: '#FFB84D',
  warningSoft: 'rgba(255,184,77,0.14)',
};

export const gradients = {
  primary: ['#34D399', '#16A34A'] as const,
  accent: ['#BEF264', '#65A30D'] as const,
  success: ['#4ADE80', '#16A34A'] as const,
  header: ['#0F150E', '#080B08'] as const,
};

export const spacing = (n: number) => n * 8;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '600' as const,
  bold: '700' as const,
  black: '800' as const,
};

// A real monospace font per platform (not a downloaded/async one) — every
// weight in fontWeight above renders correctly with these, on every device,
// with no font-load flash or risk of a broken build if a download fails.
export const fontFamily = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'ui-monospace, "SF Mono", Menlo, Consolas, "JetBrains Mono", monospace',
});

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  floating: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  }),
};
