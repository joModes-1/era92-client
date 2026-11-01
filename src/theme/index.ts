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

// The three colours the whole brand is built from, as the design states
// them: the vivid violet and the navy of every button, hero and gradient,
// and the orange of the "92" in the logo. Everything else is derived.
const core = {
  violet: '#AC00FF',
  navy: '#283B8F',
  orange: '#FF721D',
};

// Neutrals carry a hint of the brand violet, so the page, hairlines and grey
// text read as one family with the purple around them. 50 is the page every
// role sits on, 200 every hairline, 500 the lightest grey allowed for text
// (5.2:1 on the page).
const ink = {
  0:   '#FFFFFF',
  25:  '#FBFBFD',
  50:  '#F3F2FA',
  100: '#EDEFF5',
  200: '#E6E3F3',
  300: '#C3C9D8',
  400: '#8F98AE',
  500: '#5D6580',
  600: '#4A5169',
  700: '#2E3450',
  800: '#1C2138',
  900: '#121628',
  950: '#0B0E1C',
};

export const colors = {
  // Brand
  primary: violet[500],
  primarySoft: violet[50],
  primaryTint: violet[100],
  // The design's own vivid violet and navy, for the rare place that needs
  // one of them flat rather than in a gradient (a spinner, a figure).
  brandViolet: core.violet,
  brandNavy: core.navy,

  // The orange from the "92" mark. Used sparingly — the scan bar, the logo
  // numerals — so it stays a signal rather than decoration.
  accent: core.orange,
  accentLight: '#FF9D4D',
  accentSoft: '#FFF2E6',

  // Violet into blue, reused anywhere the brand needs to fill a surface.
  gradient: [violet[500], brandBlue[500]] as const,
  gradientBrandDeep: [violet[700], brandBlue[600]] as const,
  // The full-bleed splash, fitted to the Figma frame: violet in the top-left
  // falling to navy. The navy is also the native splash's background, so the
  // hand-off between the two reads as one screen.
  gradientSplash: ['#9800E0', '#1B3C8E'] as const,
  gradientSplashLocations: [0.04, 0.46] as const,
  gradientSplashAngle: 145,

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
  // The points balance card (points sheet, leaderboard "you" card): a pale
  // pink into peach wash, and the award roundel on it.
  pointsCard: ['#FCE4F4', '#FFF1E8'] as const,
  pointsIcon: ['#FF8A00', '#FF2D6F', '#B000FF'] as const,
  // Gold, silver, bronze for the top three on the leaderboard.
  medal: ['#E0A100', '#9AA3B5', '#C27A45'] as const,

  // "200K in rewards" on the rewards banner — purple into orange, per the
  // Figma dev panel's own colour list for that text span.
  rewardAmountGradient: ['#B72AFB', core.orange] as const,

  // The rewards banner's own star circle — `linear-gradient(135deg,
  // #AC00FF, #283B8F)`. 135deg in CSS (0deg = up, clockwise) runs
  // top-left to bottom-right, which is this start/end pair in RN's
  // unit-square terms.
  rewardIconGradient: [core.violet, core.navy] as const,
  rewardIconGradientStart: { x: 0.15, y: 0.15 },
  rewardIconGradientEnd: { x: 0.85, y: 0.85 },

  // The booking summary card and the service pill — the design's
  // `linear-gradient(99.29deg, #283B8F 3.92%, #AC00FF 77.06%)`: deep navy
  // on the left running into vivid violet on the right, the opposite way to
  // the buttons. Rendered via CssGradient: raw start/end points painted a
  // hard-edged block on a real phone while looking fine on web.
  gradientAction: [core.navy, core.violet] as const,
  gradientActionLocations: [0.0392, 0.7706] as const,
  gradientActionAngle: 99.29,

  // The "Scan to wash" bar. The design's stack puts an opaque
  // `linear-gradient(0deg, #EEEEEE, #EEEEEE)` over a violet→orange sweep;
  // as with the other buttons that flat layer is the inactive fill — were
  // it painted it would render a flat grey bar, not the magenta-to-orange
  // the mockup shows. So this is the layer underneath, at its stated
  // stops.
  gradientScan: [core.violet, core.orange] as const,
  gradientScanLocations: [0.039, 0.771] as const,
  // CSS angle for the bar (purple bottom-left to orange top-right), rendered
  // via CssGradient so web and phone paint it the same. 13deg is what the
  // web build already showed with the old raw points on a ~343x46 bar.
  gradientScanAngle: 13,

  // ── The rewards banner ──
  // A pale violet wash, left to right, behind the "Points by wash" strip.
  promoBanner: ['#F3E8FF', '#F7EEFC', '#FCF6F3'] as const,
  promoBannerBorder: '#C9A3F5',
  // The "Wash 2 cars" offer card on the client home.
  offerCard: ['#2A3D9A', '#203187'] as const,

  // The client home's wash tracker: the empty track and its filled part.
  track: '#E9E9F0',
  trackFill: ['#6A00F4', core.violet] as const,

  // The primary action button, from the design's CSS:
  // `linear-gradient(204.34deg, #AC00FF 5.6%, #283B8F 35.35%)` — violet in
  // the top-right corner, navy by 35%. Kept as a CSS angle, not points:
  // GradientButton converts it for its real size (utils/cssGradient.ts),
  // because points computed for a square box bend on a wide button.
  gradientButton: [core.violet, core.navy] as const,
  gradientButtonLocations: [0.056, 0.3535] as const,
  gradientButtonAngle: 204.34,

  // Button 2 ("Enter car details", "Book Service"): violet on the left
  // sweeping to navy on the right — `linear-gradient(99.29deg, #AC00FF
  // 3.92%, #283B8F 77.06%)`.
  gradientButton2: [core.violet, core.navy] as const,
  gradientButton2Locations: [0.0392, 0.7706] as const,
  gradientButton2Angle: 99.29,

  // The welcome screen's "CAR WASH" headline, from the design's
  // `linear-gradient(204.34deg, #AC00FF 5.6%, #283B8F 35.35%)` — violet at
  // top-right sweeping down into navy, holding flat past the 35% stop.
  gradientHeadline: [core.violet, core.navy] as const,
  gradientHeadlineStart: { x: 0.706, y: 0.044 },
  gradientHeadlineEnd: { x: 0.294, y: 0.956 },
  gradientHeadlineLocations: [0.056, 0.3535] as const,

  // The dim laid over the screen behind every bottom sheet and dialog.
  scrim: 'rgba(11,14,28,0.55)',

  // Surfaces — tonal layers, brightest = closest to the eye
  bg: ink[50],
  bgSunken: ink[100],
  bgCard: ink[0],
  bgInput: ink[50],
  // The phone/OTP field fill and the empty camera frame on the scanner.
  bgField: ink[50],
  scanFrame: '#D9D9D9',

  // Text
  text: ink[900],
  textSecondary: ink[500],
  textMuted: ink[400],

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

  // Domain states
  washing: '#F59E0B',

  ink,
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
 * Brand surfaces shared by every role: the hero card, the worker's today
 * strip, chart bars, avatar hues. Every hue is lifted from the logo, splash,
 * buttons or points pill, so client and staff screens read as one app.
 */
export const brandTheme = {
  border: colors.border,
  shadowColor: '#3C1E96',
  // Hero: violet into deep navy, orange glow in the corner.
  hero: ['#7B16D6', '#2B2D9E', '#16205C'] as const,
  heroLocations: [0, 0.42, 1] as const,
  heroAngle: 215,
  // Orange bleeding in from the top-right corner only.
  glowStops: ['rgba(255,114,29,0)', 'rgba(255,114,29,0)', 'rgba(255,114,29,0.38)'] as const,
  // Type and lines on the hero's dark surface.
  onHeroLabel: 'rgba(255,255,255,0.80)',
  onHeroMuted: 'rgba(255,255,255,0.78)',
  onHeroLine: 'rgba(255,255,255,0.18)',
  onHeroAlert: '#FFB4C0',
  onHeroUp: '#7CF0C3',
  // Charts
  barBase: '#CDB8F8',
  barOn: [core.violet, core.navy] as const,
  // Avatar hues: bg / text pairs, picked by name so a person keeps their colour.
  avatars: [
    { bg: '#EFE4FF', fg: '#6B1FC9' },
    { bg: '#E3EAFF', fg: core.navy },
    { bg: '#FFE9D6', fg: '#A84B0A' },
    { bg: '#FCE1F7', fg: '#A8008A' },
    { bg: '#DDF4EA', fg: '#0B7A52' },
  ],
  countPill: '#6B1FC9',
  // Worker home: today strip and the "ready for a car" card.
  strip: [core.navy, '#7B16D6'] as const,
  freeWash: ['#FFFFFF', '#EBDDFF', '#DCC8FF'] as const,
  freeBorder: '#D4C2FF',
};

export function avatarHue(name?: string) {
  let h = 0;
  for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return brandTheme.avatars[h % brandTheme.avatars.length];
}
