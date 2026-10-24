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
  // CSS angle for the bar (purple bottom-left to orange top-right), rendered
  // via CssGradient so web and phone paint it the same. 13deg is what the
  // web build already showed with the old raw points on a ~343x46 bar.
  gradientScanAngle: 13,

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
  // Used by the summary card / service pill / manager card, which pass
  // start/end straight to LinearGradient.
  gradientActionStart: { x: 0.97, y: 0.97 },
  gradientActionEnd: { x: 0.974, y: 0.84 },
  gradientActionLocations: [0.88, 1.0] as const,

  // The primary action button, from the design's CSS:
  // `linear-gradient(204.34deg, #AC00FF 5.6%, #283B8F 35.35%)` — violet in
  // the top-right corner, navy by 35%. Kept as a CSS angle, not points:
  // GradientButton converts it for its real size (utils/cssGradient.ts),
  // because points computed for a square box bend on a wide button.
  gradientButton: ['#AC00FF', '#283B8F'] as const,
  gradientButtonLocations: [0.056, 0.3535] as const,
  gradientButtonAngle: 204.34,

  // Button 2 ("Enter car details", "Book Service"): violet on the left
  // sweeping to navy on the right — `linear-gradient(99.29deg, #AC00FF
  // 3.92%, #283B8F 77.06%)`.
  gradientButton2: ['#AC00FF', '#283B8F'] as const,
  gradientButton2Locations: [0.0392, 0.7706] as const,
  gradientButton2Angle: 99.29,

  // The welcome screen's "CAR WASH" headline, from the design's
  // `linear-gradient(204.34deg, #AC00FF 5.6%, #283B8F 35.35%)` — violet at
  // top-right sweeping down into navy, holding flat past the 35% stop.
  // Its own token rather than a reuse of gradientAction: same two colours,
  // but the opposite direction and different stops.
  gradientHeadline: ['#AC00FF', '#283B8F'] as const,
  gradientHeadlineStart: { x: 0.706, y: 0.044 },
  gradientHeadlineEnd: { x: 0.294, y: 0.956 },
  gradientHeadlineLocations: [0.056, 0.3535] as const,

  // The one brand surface for headline cards on staff screens (today's
  // takings, a wallet balance, MRR): navy, with the violet of the primary
  // button glowing in from the top-right corner. Same two colours and the
  // same direction as gradientButton, so the hero and the buttons under it
  // read as one family — spread wider so a tall card stays mostly navy.
  // Rendered through CssGradient, so web and phone paint it identically.
  gradientHero: ['#AC00FF', '#283B8F'] as const,
  gradientHeroLocations: [0, 0.4] as const,
  gradientHeroAngle: 220,

  // The dim laid over the screen behind any bottom sheet or dialog.
  scrim: 'rgba(11,14,28,0.55)',

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

  // The status hues above are bright enough for icons, dots and fills but
  // not for words: amber text on its own soft fill measured ~2:1, the red
  // ~3.8:1. These darker steps are what any status-coloured TEXT uses, and
  // each clears 4.5:1 on both white and its matching *Soft fill.
  successText: '#0B7A52',
  warningText: '#9A5B05',
  errorText: '#C42840',
  infoText: '#2A63B8',
  accentText: '#A84B0A',
  primaryText: violet[600],

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
  // The glow under a primary button. Kept low: a list of cards that each
  // carry a primary button turned the page into a row of violet halos.
  brand: {
    shadowColor: violet[500],
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
};

// Semantic tone lookup — one place that maps a state to its colours.
// `fg` paints icons, dots and bars; `text` is the readable step for words;
// `bg` is the soft fill a tinted chip or icon tile sits on.
export type Tone = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'accent';

export const tone: Record<Tone, { fg: string; text: string; bg: string; border: string }> = {
  primary: { fg: colors.primary, text: colors.primaryText, bg: colors.primarySoft, border: violet[200] },
  success: { fg: colors.success, text: colors.successText, bg: colors.successSoft, border: '#B7E8D2' },
  warning: { fg: colors.warning, text: colors.warningText, bg: colors.warningSoft, border: '#F8DFAE' },
  error:   { fg: colors.error,   text: colors.errorText,   bg: colors.errorSoft,   border: '#F7C3CA' },
  info:    { fg: colors.info,    text: colors.infoText,    bg: colors.infoSoft,    border: '#C3D9F7' },
  accent:  { fg: colors.accent,  text: colors.accentText,  bg: colors.accentSoft,  border: '#FFD2BE' },
  neutral: { fg: ink[500],       text: ink[600],           bg: ink[50],            border: ink[200] },
};

/**
 * The type hierarchy, as named styles rather than loose size/weight pairs.
 * Sentence case throughout, the way the client app writes — tracked
 * all-caps is kept for nothing but tiny codes (a branch's "NTD").
 *
 *   pageTitle   a screen's own headline (greeting, "Your team")
 *   section     a group heading above a card or list ("Recent washes")
 *   cardTitle   the name of the thing a card or row is about
 *   body        running text
 *   meta        supporting lines: who, when, how many
 *   label       the caption under or beside a figure
 *   figure      a number inside a card
 *   heroFigure  the one number a screen is built around
 */
export const typography = {
  pageTitle: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  section: { fontSize: font.lg, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  cardTitle: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  body: { fontSize: font.regular, color: colors.textSecondary, lineHeight: 20 },
  meta: { fontSize: font.sm, color: colors.textMuted },
  label: { fontSize: font.xs, fontWeight: weight.semibold, color: colors.textMuted },
  figure: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  heroFigure: { fontSize: font.hero, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
};

/**
 * Staff type scale — worker, manager and org admin screens (STAFF-UI-SPEC.md
 * §1): Apple HIG / Material 3 sizes, weights 400–700 only, tabular figures on
 * every number so amounts line up in a column. The client app keeps
 * `typography` above, which is matched to its verified mockup.
 *
 * Greys are chosen by measured contrast on white: ink400 is 2.9:1 and fails
 * for text, so the lightest staff text is ink500 (4.9:1) and anything read
 * at a glance outdoors is ink600 (7.9:1).
 */
const tabular: 'tabular-nums'[] = ['tabular-nums'];
export const staffText = {
  muted: ink[500],
  secondary: ink[600],
};
export const staffType = {
  // One ladder with a clear step between rungs, so a heading is always
  // bigger AND bolder than the text under it.
  hero: { fontSize: 32, lineHeight: 38, fontWeight: weight.bold, color: colors.text, fontVariant: tabular },
  title: { fontSize: 22, lineHeight: 28, fontWeight: weight.bold, color: colors.text },
  section: { fontSize: 19, lineHeight: 24, fontWeight: weight.bold, color: colors.text },
  rowTitle: { fontSize: 16, lineHeight: 22, fontWeight: weight.semibold, color: colors.text },
  body: { fontSize: 15, lineHeight: 21, fontWeight: weight.regular, color: staffText.secondary },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: weight.regular, color: staffText.secondary },
  label: { fontSize: 14, lineHeight: 20, fontWeight: weight.semibold, color: colors.text },
  meta: { fontSize: 12, lineHeight: 17, fontWeight: weight.regular, color: staffText.muted },
  /** Small headings over a group or a figure ("Today", "Takings"): darker than meta. */
  caption: { fontSize: 13, lineHeight: 18, fontWeight: weight.semibold, color: staffText.secondary },
  figure: { fontSize: 20, lineHeight: 26, fontWeight: weight.bold, color: colors.text, fontVariant: tabular },
  /** Spread into any style that shows money, counts, points or a timer. */
  tabular: { fontVariant: tabular },
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

/**
 * Org admin colour pass (COLOR-PROPOSAL.html). Staff-only and role-gated: the
 * client's `colors` are untouched, and these apply only while an org admin is
 * signed in. Every hue is lifted from the logo, splash, buttons or points pill.
 */
export const orgTheme = {
  bg: '#F3F2FA',            // page: a hint of violet instead of neutral grey
  border: '#E6E3F3',
  shadowColor: '#3C1E96',
  muted: '#5D6580',         // 5.2:1 on the page
  // Hero: violet into deep navy, orange glow in the corner.
  hero: ['#7B16D6', '#2B2D9E', '#16205C'] as const,
  heroLocations: [0, 0.42, 1] as const,
  heroAngle: 215,
  // Orange bleeding in from the top-right corner only.
  glowStops: ['rgba(255,122,26,0)', 'rgba(255,122,26,0)', 'rgba(255,122,26,0.38)'] as const,
  // Header hairline: the client gradient finishing on the logo orange.
  hairline: ['#AC00FF', '#283B8F', '#FF7A1A'] as const,
  hairlineLocations: [0, 0.62, 1] as const,
  // Charts
  barBase: '#CDB8F8',
  barOn: ['#AC00FF', '#283B8F'] as const,
  barHot: ['#FF9D4D', '#FF7A1A'] as const,
  // Avatar hues: bg / text pairs, picked by name so a person keeps their colour.
  avatars: [
    { bg: '#EFE4FF', fg: '#6B1FC9' },
    { bg: '#E3EAFF', fg: '#283B8F' },
    { bg: '#FFE9D6', fg: '#A84B0A' },
    { bg: '#FCE1F7', fg: '#A8008A' },
    { bg: '#DDF4EA', fg: '#0B7A52' },
  ],
  countPill: '#6B1FC9',
  // Worker home: today strip, "ready for a car" card, row tints.
  strip: ['#283B8F', '#7B16D6'] as const,
  freeWash: ['#FFFFFF', '#EBDDFF', '#DCC8FF'] as const,
  freeBorder: '#D4C2FF',
  cashTint: '#FFF1E4',
  rankTint: '#F2E9FF',
};

/** Set by AuthProvider from the signed-in role, so non-hook styles can read it. */
export const orgMode = { on: false };
/** Page background for a screen container: spread into its style array. */
export const orgBg = () => (orgMode.on ? { backgroundColor: orgTheme.bg } : null);

export function avatarHue(name?: string) {
  let h = 0;
  for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return orgTheme.avatars[h % orgTheme.avatars.length];
}
