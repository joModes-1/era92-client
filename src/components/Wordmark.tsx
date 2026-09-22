import React from 'react';
import { View, Text, Image, StyleSheet, Platform, StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Path, Text as SvgText, Mask, G } from 'react-native-svg';
import { colors, weight, tracking } from '../theme';

/**
 * The 92 CarWash wordmark.
 *
 * Ships as the exported artwork, not reconstructed type: the numerals in
 * the source mark are their own drawn shapes, not a real font run through
 * an italic slant, and no installed system face reproduces them. An
 * earlier build tried to fake it with `Arial Rounded MT Bold` forced
 * italic — a face that does not exist on Android or web at all, so it
 * silently fell back to a generic sans there, and even where it did
 * resolve, synthesising an italic out of a non-italic face distorts the
 * letterforms. Using the real PNG is the only way the "92" is guaranteed
 * to match the design rather than approximate it.
 *
 * Two export are kept because the tile's "92" is knocked OUT of the
 * orange (a hole, so the background shows through it) in the artwork
 * itself — `logo-wordmark.png` for the dark-ink-on-white screens,
 * `wordmark-knockout.png` for white-on-a-dark-field use (the splash).
 * Picking the file by context, rather than tinting one bitmap for both,
 * is what keeps the orange tile orange on the light screens instead of
 * the tint colouring the whole mark.
 */

type Variant = 'text' | 'image';

/** Flip this to move every screen at once. */
const DEFAULT_VARIANT: Variant = 'image';

// ── The Figma frame. Everything below is a ratio derived from these. ──
const SRC_W = 239;
const SRC_H = 33;
/** Kept for callers that lay the mark out by width. */
export const WORDMARK_RATIO = SRC_W / SRC_H;

// The orange "92" tile: 50.68 wide against a 33 frame.
const BADGE_W_RATIO = 50.68 / SRC_H;
// The capitals (C at 32.93 tall, W at 31.83) run the full height of the
// frame; the lowercase are set noticeably smaller.
const CAP_RATIO = 32.93 / SRC_H;
const LOWER_RATIO = 0.70;
// "CarWash" starts at x=54.65, just past the 50.68 tile — a 3.97 gap.
const GAP_RATIO = (54.65 - 50.68) / SRC_H;

export const WORDMARK_ORANGE = '#FF9002';

/**
 * The mark is set in Arial Rounded MT Bold.
 *
 * That face ships with macOS and iOS (and with Office on Windows), but NOT
 * with Android or a bare browser — nothing is bundled here, so on those
 * platforms the name simply will not resolve and the text falls back
 * silently to the system face. Hence a chain rather than one name: each
 * platform gets the nearest rounded face it actually has, and the last
 * entry is a generic that always resolves.
 *
 * Web takes a comma-separated list natively. React Native does not — it
 * needs one real family name — so the native side picks a single best
 * guess per platform instead.
 */
export const WORDMARK_FONT = Platform.select({
  ios: 'ArialRoundedMTBold',
  android: 'sans-serif-medium',
  default: '"Arial Rounded MT Bold", "Arial Rounded MT", "Helvetica Rounded", Arial, sans-serif',
}) as string;

// The numerals nearly fill the tile's height: the mark reads as a solid
// orange block with the figures cut out of it, not as small type floating
// in a field.
const NUMERAL_RATIO = 0.95;

/**
 * The tile's outline: rounded on the left two corners, square on the right.
 *
 * Starts at the top-left arc and runs clockwise. The right edge is drawn as
 * plain corners so the tile reads as cut off where the wordmark begins,
 * which is how the logo is built — it is not a pill.
 */
function tilePath(w: number, h: number, r: number): string {
  return [
    `M ${r} 0`,           // top edge, just past the corner arc
    `H ${w}`,             // across to the square top-right
    `V ${h}`,             // straight down the right edge
    `H ${r}`,             // back along the bottom
    `A ${r} ${r} 0 0 1 0 ${h - r}`, // bottom-left arc
    `V ${r}`,             // up the left edge
    `A ${r} ${r} 0 0 1 ${r} 0`,     // top-left arc
    'Z',
  ].join(' ');
}

/**
 * The orange tile with the numerals cut out of it.
 *
 * The mask is the whole tile painted white (keep) with the "92" drawn over
 * it in black (drop), so the numerals become transparent.
 */
function Badge({ size }: { size: number }) {
  const w = size * BADGE_W_RATIO;

  return (
    <Svg width={w} height={size} viewBox={`0 0 ${w} ${size}`}>
      <Mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={size}>
        <Rect x="0" y="0" width={w} height={size} fill="#fff" />
        {/* Anchored to the RIGHT edge, not centred: the numerals run to the
            end of the tile so there is no orange gutter between the "2" and
            the "C". The italic lean means the glyphs' own overhang is the
            only spacing needed there. */}
        <SvgText
          x={w}
          y={size * 0.80}
          fontSize={size * NUMERAL_RATIO}
          fontFamily={WORDMARK_FONT}
          fontWeight="900"
          fontStyle="italic"
          textAnchor="end"
          fill="#000"
        >
          92
        </SvgText>
      </Mask>
      <G mask="url(#cut)">
        {/* Rounded on the left, square on the right. The mark's tile is cut
            off where it meets "CarWash" rather than closing into a pill —
            `rx` on a Rect rounds all four corners at once, so the shape is
            drawn as a path to round only the two outer ones. */}
        <Path d={tilePath(w, size, size * 0.18)} fill={WORDMARK_ORANGE} />
      </G>
    </Svg>
  );
}

export default function Wordmark({
  height = SRC_H,
  tint,
  variant = DEFAULT_VARIANT,
  style,
}: {
  height?: number;
  /**
   * Colours the "CarWash" half. Defaults to the app's ink, which is right
   * on the white screens; the splash passes white for the violet field.
   *
   * In the 'image' build this tints the whole bitmap, orange tile
   * included — `tintColor` cannot address half an image. In the 'text'
   * build only the letters take it and the tile keeps its orange, which is
   * the more faithful result.
   */
  tint?: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
}) {
  const width = height * WORDMARK_RATIO;

  if (variant === 'image') {
    // A `tint` means "white-on-dark" (the splash) — that is exactly what
    // the knockout export already is, so it is used as-is rather than
    // tinted; tinting the full-colour export instead would recolour the
    // orange tile along with the letters, which is wrong on every screen
    // that uses it. No tint means the full-colour export on a light
    // background, unmodified.
    return (
      <Image
        source={tint
          ? require('../../assets/wordmark-knockout.png')
          : require('../../assets/logo-wordmark.png')}
        style={[{ height, width }, style as any]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="92 CarWash"
      />
    );
  }

  const cap = height * CAP_RATIO;
  const lower = height * LOWER_RATIO;
  const color = tint ?? colors.ink[900];

  // Set as separate runs, not one string: the capitals carry the mark's
  // full height and the lowercase sit under it.
  const L = (t: string, size: number) => (
    <Text style={[s.letter, { fontSize: size, color }]} allowFontScaling={false}>
      {t}
    </Text>
  );

  return (
    <View
      style={[s.row, { height }, style]}
      accessibilityRole="image"
      accessibilityLabel="92 CarWash"
    >
      <Badge size={height} />
      <View style={[s.name, { marginLeft: height * GAP_RATIO }]}>
        {L('C', cap)}
        {L('ar', lower)}
        {L('W', cap)}
        {L('ash', lower)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  // `baseline` is what keeps the big capitals and the small lowercase
  // sitting on one line; `center` would float the lowercase mid-cap.
  name: { flexDirection: 'row', alignItems: 'baseline' },
  // Unlike a pre-slanted black cut, this family has no italic of its own,
  // so the lean and the weight are asked for explicitly and synthesised.
  letter: {
    fontFamily: WORDMARK_FONT,
    fontWeight: weight.black,
    fontStyle: 'italic',
    letterSpacing: tracking.display,
    includeFontPadding: false,
  },
});
