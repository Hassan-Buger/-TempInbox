// Design tokens — the single source of truth for colours, spacing, type and
// radii. Every screen and component reads from here so the look stays
// consistent. No logo or colour preference was supplied by the owner, so
// these are neutral tokens (chosen by the agent, owner's best-option call).
// Light and dark: the app follows the device colour scheme.
export const Colors = {
  light: {
    background: '#F7F8FA',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF1F4',
    text: '#111827',
    textMuted: '#5B6470',
    border: '#D9DEE5',
    primary: '#0B5FFF',
    primaryText: '#FFFFFF',
    danger: '#C81E1E',
    success: '#0E7A3D',
    warning: '#8A5A00',
    expired: '#6B7280',
  },
  dark: {
    background: '#0F1115',
    surface: '#171A21',
    surfaceMuted: '#22262F',
    text: '#F3F4F6',
    textMuted: '#9AA3AF',
    border: '#2E3440',
    primary: '#5B8DEF',
    primaryText: '#0B1220',
    danger: '#F87171',
    success: '#34D399',
    warning: '#FBBF24',
    expired: '#9AA3AF',
  },
} as const;

export type ColorScheme = keyof typeof Colors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

// Type scale (font sizes in points). Body text is 16 so it stays readable.
export const TypeScale = {
  title: 24,
  subtitle: 18,
  body: 16,
  small: 14,
  caption: 12,
} as const;

// Minimum touch target height for buttons and rows (48 dp, seed §5).
export const MinTouchTarget = 48;
