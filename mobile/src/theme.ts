// Centralized so the ADHD-friendly design choices (high contrast, large
// touch targets, calm palette) stay consistent instead of drifting per screen.
export const colors = {
  background: '#0B0E1A',
  surface: '#171B2E',
  surfaceRaised: '#1E2338',
  surfaceAlt: '#262C48',
  overlay: 'rgba(11,14,26,0.72)',

  primary: '#7C6CFF',
  primaryDark: '#5A4FD9',
  primarySoft: 'rgba(124,108,255,0.16)',
  primaryText: '#FFFFFF',

  accent: '#00D9C0',
  accentSoft: 'rgba(0,217,192,0.14)',

  text: '#F5F6FA',
  textMuted: '#9BA0C0',
  textFaint: '#6A6F92',

  border: '#2A2F4C',
  borderLight: '#333A5C',

  success: '#3DDC97',
  successSoft: 'rgba(61,220,151,0.14)',
  danger: '#FF6B6B',
  dangerSoft: 'rgba(255,107,107,0.14)',
  warning: '#FFB84D',
  warningSoft: 'rgba(255,184,77,0.14)',
};

export const gradients = {
  primary: ['#8A7CFF', '#6C5CE0'] as const,
  accent: ['#00E0C6', '#00A896'] as const,
  success: ['#4FE3A8', '#2BB37B'] as const,
  header: ['#1C2140', '#12152A'] as const,
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
