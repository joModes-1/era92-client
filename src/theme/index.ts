// ─── era92 Design System ─────────────────────────────────────────────
// Deep indigo surface + hot pink accent. Depth comes from elevation and
// tonal layering, not from borders on white boxes.

const pink = {
  50:  '#FFF1F5',
  100: '#FFE4EC',
  200: '#FECDD8',
  400: '#F76B93',
  500: '#E91E63',
  600: '#D01552',
  700: '#A81044',
};

const ink = {
  0:   '#FFFFFF',
  25:  '#FBFBFD',
  50:  '#F5F6FA',
  100: '#EDEFF5',
  200: '#DFE3EC',
  300: '#C3C9D8',
  400: '#8F98AE',
  500: '#69718A',
  600: '#4A5169',
  700: '#2E3450',
  800: '#1C2138',
  900: '#121628',
  950: '#0B0E1C',
};

export const colors = {
  // Brand
  primary: pink[500],
  primaryDark: pink[600],
  primaryDeep: pink[700],
  primarySoft: pink[50],
  primaryTint: pink[100],
  accent: '#FF6B35',
  accentLight: '#FF8F65',
  accentSoft: '#FFF1EA',

  gradient: [pink[500], '#FF6B35'] as const,
  gradientDeep: [ink[900], ink[800]] as const,
  gradientBrandDeep: [pink[700], pink[500]] as const,

  // Surfaces — tonal layers, brightest = closest to the eye
  bg: ink[50],
  bgSunken: ink[100],
  bgCard: ink[0],
  bgRaised: ink[0],
  bgInput: ink[50],
  bgDark: ink[900],
  bgDarkRaised: ink[800],
  bgDarkSunken: ink[950],

  // Text
  text: ink[900],
  textSecondary: ink[500],
  textMuted: ink[400],
  textLight: ink[0],
  textOnDark: ink[0],
  textOnDarkMuted: 'rgba(255,255,255,0.62)',

  // Status
  success: '#0EA36B',
  successSoft: '#E6F7F0',
  warning: '#F59E0B',
  warningSoft: '#FEF6E7',
  error: '#E5384F',
  errorSoft: '#FDECEE',
  info: '#3B7DDD',
  infoSoft: '#ECF3FD',

  // Borders / hairlines
  border: ink[200],
  borderLight: ink[100],
  borderStrong: ink[300],
  borderOnDark: 'rgba(255,255,255,0.10)',

  // Domain states
  online: '#0EA36B',
  offline: ink[400],
  washing: '#F59E0B',
  ready: '#0EA36B',
  stale: '#E5384F',
  settled: pink[500],

  // Legacy aliases (kept so nothing breaks mid-refactor)
  bgSuccess: '#E6F7F0',
  bgWarning: '#FEF6E7',
  bgError: '#FDECEE',

  ink,
  pink,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 44,
};

export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  full: 999,
};

export const font = {
  micro: 10,
  xs: 11,
  sm: 12,
  regular: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  display: 28,
  hero: 34,
  // legacy
  title: 34,
};

export const weight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
  black: '900' as const,
};

// Tracking for all-caps micro labels — the single biggest "does this look
// designed" tell at small sizes.
export const tracking = {
  caps: 0.8,
  capsWide: 1.4,
  tight: -0.4,
  display: -0.8,
};

// Layered shadows. Cross-platform: iOS reads shadow*, Android reads elevation,
// web reads boxShadow via RN-Web's shadow translation.
export const shadow = {
  none: {},
  xs: {
    shadowColor: ink[900],
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sm: {
    shadowColor: ink[900],
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: ink[900],
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  lg: {
    shadowColor: ink[900],
    shadowOpacity: 0.14,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  brand: {
    shadowColor: pink[500],
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
};

// Semantic tone lookup — one place that maps a state to its color trio.
export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';

export const tone: Record<Tone, { fg: string; bg: string; border: string }> = {
  primary: { fg: colors.primary, bg: colors.primarySoft, border: pink[200] },
  success: { fg: colors.success, bg: colors.successSoft, border: '#B7E8D2' },
  warning: { fg: colors.warning, bg: colors.warningSoft, border: '#F8DFAE' },
  error:   { fg: colors.error,   bg: colors.errorSoft,   border: '#F7C3CA' },
  info:    { fg: colors.info,    bg: colors.infoSoft,    border: '#C3D9F7' },
  accent:  { fg: colors.accent,  bg: colors.accentSoft,  border: '#FFD2BE' },
  neutral: { fg: ink[500],       bg: ink[50],            border: ink[200] },
};

export const layout = {
  screenPadding: spacing.lg,
  cardPadding: spacing.lg,
  headerHeight: 56,
};
