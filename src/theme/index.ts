// ─── 92 CarWash Design System ────────────────────────────────────────
// Violet-to-blue brand with an orange accent, taken from the 92 CarWash
// mark. Depth comes from elevation and tonal layering, not from borders on
// white boxes.
//
// Everything downstream reads the named tokens in `colors`, never a ramp
// directly, so a rebrand is a change to the ramps below and nothing else.

const violet = {
  50:  '#F4F0FF',
  100: '#E9E0FF',
  200: '#D4C2FF',
  400: '#A87BF5',
  500: '#8B3FE8',   // brand violet — the top of the splash gradient
  600: '#7326D4',
  700: '#5A18A8',
};

// The blue the splash gradient resolves into, and the base for deep
// surfaces so dark areas read as brand rather than neutral grey.
const brandBlue = {
  400: '#3D5AC4',
  500: '#2B3F9E',
  600: '#1F2D7A',
  700: '#16205C',
};

/**
 * Kept so the admin screens that still reference pink tints keep working
 * through the rebrand. New work should use the violet ramp.
 */
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
  primary: violet[500],
  primaryDark: violet[600],
  primaryDeep: violet[700],
  primarySoft: violet[50],
  primaryTint: violet[100],

  // The orange from the "92" mark. Used sparingly — the scan bar, the logo
  // numerals — so it stays a signal rather than decoration.
  accent: '#F47C20',
  accentLight: '#FF9D4D',
  accentSoft: '#FFF2E6',

  // Violet into blue, the splash gradient, reused anywhere the brand needs
  // to fill a surface.
  gradient: [violet[500], brandBlue[500]] as const,
  gradientDeep: [ink[900], ink[800]] as const,
  gradientBrandDeep: [violet[700], brandBlue[600]] as const,
  // The full-bleed splash: violet at the top edge falling to deep blue.
  gradientSplash: [violet[600], brandBlue[500], brandBlue[700]] as const,

  // The points pill, magenta into orange. The CSS export's literal layer
  // stack reads as flat red-to-gold (its top layer is opaque, so by normal
  // stacking rules the two gradients under it should never show) — but
  // Figma's own rendered preview does not match that reading, so these
  // values are pixel-sampled straight from a screenshot of the actual pill
  // instead of derived from the CSS text. `pointsBadgeLocations` pushes the
  // magenta stop further right, so more of the pill reads purple/magenta
  // before it turns to orange, per request.
  pointsBadge: ['#DC00B3', '#FF6800'] as const,
  pointsBadgeLocations: [0.35, 1] as const,
  // The top-bar pill's star circle: white, with the icon itself carrying
  // the purple/magenta instead — an inverted take on the pill's own colour.
  pointsStarBg: '#fff',
  pointsStarIcon: '#DC00B3',
  // The floating "With points" tile pill's own, much smaller star circle —
  // kept as its own token since it sits on a solid black pill, not this
  // gradient one, and inverting it the same way would hide a white icon on
  // a white circle.
  tilePointsStarBg: '#FF721D',

  // The "With points" pill that floats over the vehicle art on the first
  // service tile. The spec's top layer is flat black, fully opaque, so it
  // is the only one that ever paints — the violet→navy gradient beneath
  // it (`#AC00FF` to `#283B8F`) never shows through.
  tilePointsPillBg: '#000000',

  // "200K in rewards" on the rewards banner — purple into orange, per the
  // Figma dev panel's own colour list for that text span.
  rewardAmountGradient: ['#B72AFB', '#FF721D'] as const,

  // The rewards banner's own star circle — `linear-gradient(135deg,
  // #AC00FF, #283B8F)`. 135deg in CSS (0deg = up, clockwise) runs
  // top-left to bottom-right, which is this start/end pair in RN's
  // unit-square terms.
  rewardIconGradient: ['#AC00FF', '#283B8F'] as const,
  rewardIconGradientStart: { x: 0.15, y: 0.15 },
  rewardIconGradientEnd: { x: 0.85, y: 0.85 },

  // The primary action button, taken verbatim from the design's
  // `linear-gradient(99.29deg, #283B8F 3.92%, #AC00FF 77.06%)`: deep navy
  // on the left running into vivid violet on the right. Note this runs the
  // opposite way to `gradient` above (violet → blue), which is why it is
  // its own token rather than a reuse.
  gradientAction: ['#283B8F', '#AC00FF'] as const,

  // The "Scan to wash" bar. The design's stack puts an opaque
  // `linear-gradient(0deg, #EEEEEE, #EEEEEE)` over a violet→orange sweep;
  // as with the other buttons that flat layer is the inactive fill — were
  // it painted it would render a flat grey bar, not the magenta-to-orange
  // the mockup shows. So this is the layer underneath, at its stated
  // stops.
  gradientScan: ['#AC00FF', '#FF721D'] as const,
  gradientScanLocations: [0.039, 0.771] as const,

  // ── The rewards banner ──
  // A pale violet wash, left to right, behind the "Points by wash" strip.
  promoBanner: ['#F3E8FF', '#F7EEFC', '#FCF6F3'] as const,
  promoBannerBorder: '#C9A3F5',
  // The highlighted amount ("200K"). The design's own stack puts an opaque
  // `linear-gradient(0deg, #000000, #000000)` over a violet→orange sweep;
  // that top layer would hide the sweep entirely and render flat black,
  // which is not what the mockup shows — the amount is clearly pink-red
  // there. So the visible paint is the layer underneath, and this is its
  // warm end, which is what the numerals read as at this size.
  promoAmount: '#FF2D6F',
  // The star roundel on the same strip.
  promoStarBg: '#9B1FE8',
  // 99.29deg in CSS is a near-horizontal sweep tilted slightly downward.
  // CSS measures clockwise from "up"; RN takes unit-square start/end
  // points, so this is that angle expressed the way LinearGradient wants.
  gradientActionStart: { x: 0.02, y: 0.12 },
  gradientActionEnd: { x: 0.98, y: 0.88 },
  // The colour stops sit at 3.92% and 77.06%, not 0/100 — so violet
  // saturates before the right edge and holds flat to the corner.
  gradientActionLocations: [0.039, 0.771] as const,

  // Translucent brand washes for the soft blooms on dark screens. Tokens
  // rather than inline rgba so a rebrand does not have to hunt them down —
  // which is exactly what happened to the last set.
  bloomBrand: 'rgba(139,63,232,0.30)',
  bloomBrandSoft: 'rgba(139,63,232,0.18)',
  bloomAccent: 'rgba(244,124,32,0.16)',

  // Surfaces — tonal layers, brightest = closest to the eye
  bg: ink[50],
  bgSunken: ink[100],
  bgCard: ink[0],
  bgRaised: ink[0],
  bgInput: ink[50],
  // The phone/OTP field fill, taken straight from the Figma spec. A hair
  // cooler than ink[50] — kept as its own token rather than nudging the
  // ramp, which every other surface in the app also reads.
  bgField: '#F4F5F8',
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
  settled: violet[500],

  // Legacy aliases (kept so nothing breaks mid-refactor)
  bgSuccess: '#E6F7F0',
  bgWarning: '#FEF6E7',
  bgError: '#FDECEE',

  ink,
  pink,
  violet,
  brandBlue,
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
    shadowColor: violet[500],
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 7,
  },
};

// Semantic tone lookup — one place that maps a state to its color trio.
export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';

export const tone: Record<Tone, { fg: string; bg: string; border: string }> = {
  primary: { fg: colors.primary, bg: colors.primarySoft, border: violet[200] },
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

/**
 * Suppresses the browser's own focus ring on text inputs.
 *
 * On web, Chrome paints a thick default outline (gold/amber in this app's
 * colours) around a focused input, sitting on top of — and clashing with —
 * the pink focus border the inputs already draw themselves. Native ignores
 * `outlineStyle` entirely, so this is inert off the web.
 *
 * Spread into any TextInput's style. Removing the ring is only safe because
 * focus stays clearly visible through that pink border; an input with no
 * focus styling of its own must not use this.
 */
export const noFocusRing = { outlineStyle: 'none' } as any;
