import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import Icon from '../../components/Icon';
import CarWashLogo from '../../components/CarWashLogo';
import GradientText from '../../components/GradientText';
import GradientIcon from '../../components/GradientIcon';
import ScanBarStripes from '../../components/ScanBarStripes';
import CssGradient from '../../components/CssGradient';
import O1Badge from '../../components/O1Badge';
import { artFor } from './serviceArt';

/**
 * The pieces that make up the client's home screen, kept out of
 * ClientHome.tsx so that file stays about behaviour rather than growing
 * another few hundred lines of layout.
 */

/**
 * Brand bar: the 92 CarWash mark, the branch, and the points pill.
 *
 * The points pill is a worker-only concept (staff earn a per-wash incentive;
 * a client's loyalty progress has its own banner below, not a pill up here)
 * — so it and its tap target are omitted entirely when `points` is left out,
 * rather than shown as a dead or zeroed pill.
 */
export function HomeTopBar({
  branch, points, onPoints, onMenu, onBranch,
}: {
  branch: string;
  points?: number;
  onPoints?: () => void;
  onMenu: () => void;
  /** Present = the branch row is tappable and opens the nearby-branch
   *  picker. Omitted (worker screens) = inert text, exactly as before. */
  onBranch?: () => void;
}) {
  return (
    <View style={s.topBar}>
      <View style={{ flex: 1 }}>
        {/* Untinted for the same reason as the welcome screen — white bar,
            and the text build's default ink is already correct. */}
        <CarWashLogo height={16} />
        <TouchableOpacity
          onPress={onBranch}
          disabled={!onBranch}
          activeOpacity={0.6}
          style={s.branchRow}
        >
          <Text style={s.branch} numberOfLines={1}>{branch}</Text>
          <Icon name="chevron-down" size={9} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {points !== undefined ? (
        <TouchableOpacity onPress={onPoints} activeOpacity={0.85}>
          <LinearGradient
            colors={colors.pointsBadge}
            locations={colors.pointsBadgeLocations}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.pointsPill}
          >
            <View style={s.pointsStar}>
              <GradientIcon
                name="star"
                size={9}
                colorsArr={colors.rewardIconGradient}
                start={colors.rewardIconGradientStart}
                end={colors.rewardIconGradientEnd}
              />
            </View>
            <Text style={s.pointsText}>{points} Points</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity onPress={onMenu} hitSlop={10} style={s.menuBtn} activeOpacity={0.6}>
        <View style={s.menuLine} />
        <View style={s.menuLine} />
        <View style={s.menuLine} />
      </TouchableOpacity>
    </View>
  );
}

/**
 * The rewards banner — what the points are building toward.
 *
 * The headline arrives as one string but is not painted as one: the design
 * picks out everything from the amount onward ("200K in rewards") in
 * pink-red, leaving only the lead-in ("Get up to") black. `amount` names
 * where that coloured run starts; the line falls back to plain black if it
 * isn't found, so a caller can never break the banner by passing a
 * mismatched pair.
 */
export function RewardsBanner({
  onPress, headline, amount,
}: {
  onPress: () => void;
  headline: string;
  amount?: string;
}) {
  const at = amount ? headline.indexOf(amount) : -1;
  // The lead-in and the coloured run are two separate text boxes in a row,
  // and a trailing space at the end of a box is dropped when it is laid out
  // ("Get up to200K"). So the space is trimmed off here and the row's own
  // gap (rewardHeadlineGap) does the spacing instead.
  const parts = at >= 0
    ? [headline.slice(0, at).trimEnd(), headline.slice(at)]
    : null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.rewardOuter}>
      <LinearGradient
        colors={colors.promoBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.rewardCard}
      >
        <View style={s.rewardCopy}>
          {/* The star rides on the label's own line rather than beside the
              whole two-line block, so it reads as part of "Points by wash"
              and matches that line's height instead of the card's. */}
          <View style={s.rewardLabelRow}>
            <LinearGradient
              colors={colors.rewardIconGradient}
              start={colors.rewardIconGradientStart}
              end={colors.rewardIconGradientEnd}
              style={s.rewardIcon}
            >
              <Icon name="star" size={11} color="#fff" />
            </LinearGradient>
            <Text style={s.rewardLabel} numberOfLines={1}>Points by wash</Text>
          </View>
          {parts ? (
            <View style={[s.rewardHeadlineRow, s.rewardHeadlineGap]}>
              {parts[0] ? <Text style={s.rewardHeadlineLead} numberOfLines={1}>{parts[0]}</Text> : null}
              <GradientText
                text={parts[1]}
                style={s.rewardHeadline}
                colorsArr={colors.rewardAmountGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                numberOfLines={1}
              />
            </View>
          ) : (
            <Text style={[s.rewardHeadline, { marginTop: 2 }]} numberOfLines={1}>{headline}</Text>
          )}
        </View>

        <View style={s.rewardChevron}>
          <Icon name="chevron-right" size={15} color={colors.ink[900]} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/**
 * The client-facing sibling of RewardsBanner: same card, same star icon and
 * chevron, but built around wash-count progress rather than a cash headline
 * a worker's incentive earns. Shown even at zero washes — a new client
 * should see the loyalty programme exists and what it takes, not have the
 * card disappear until they have something to show.
 */
export function WashCountBanner({
  onPress, done, required,
}: {
  onPress: () => void;
  /** Washes completed toward the next free one. */
  done: number;
  /** Washes needed to earn a free one. */
  required: number;
}) {
  const remaining = Math.max(0, required - done);
  const headline = remaining === 0
    ? 'Free wash unlocked'
    : `${remaining} more ${remaining === 1 ? 'wash' : 'washes'} to go`;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.rewardOuter}>
      <LinearGradient
        colors={colors.promoBanner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.rewardCard}
      >
        <View style={s.rewardCopy}>
          <View style={s.rewardLabelRow}>
            <LinearGradient
              colors={colors.rewardIconGradient}
              start={colors.rewardIconGradientStart}
              end={colors.rewardIconGradientEnd}
              style={s.rewardIcon}
            >
              <Icon name="star" size={11} color="#fff" />
            </LinearGradient>
            <Text style={s.rewardLabel} numberOfLines={1}>Car washes</Text>
          </View>
          <View style={s.rewardHeadlineRow}>
            <GradientText
              text={`${done}/${required}`}
              style={s.rewardHeadline}
              colorsArr={colors.rewardAmountGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              numberOfLines={1}
            />
            <Text style={[s.rewardHeadlineLead, { marginLeft: 6 }]} numberOfLines={1}>
              {headline}
            </Text>
          </View>
        </View>

        <View style={s.rewardChevron}>
          <Icon name="chevron-right" size={15} color={colors.ink[900]} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const TRACK_STAGES = ['Booked', 'In Progress', 'Finished'];

/** Booked → In Progress → Finished progress track, with a car knob at the current stage. */
export function WashTracker({ status }: { status: string }) {
  const idx = status === 'ready' || status === 'settled' ? 2 : status === 'in_progress' ? 1 : 0;
  const pct = `${idx * 50}%` as const;
  return (
    <View>
      <View style={s.trackWrap}>
        <View style={s.track} />
        <LinearGradient
          colors={['#6A00F4', '#AC00FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[s.trackFill, { width: pct }]}
        />
        <View style={[s.trackNode, s.trackNodeStart]} />
        <View style={[s.trackNode, s.trackNodeEnd, idx === 2 && s.trackNodeDone]} />
        <View style={[s.trackKnob, { left: pct }]}>
          <Image
            source={require('../../../assets/scan-cars.png')}
            style={s.trackCar}
            resizeMode="contain"
          />
        </View>
      </View>

      <View style={s.trackLabels}>
        {TRACK_STAGES.map((label, i) => {
          const done = i < idx || (i === 2 && idx === 2);
          const current = i === idx && !done;
          return (
            <View key={label} style={s.trackLabelItem}>
              <Icon
                name={current ? 'circle-notch' : 'check-circle'}
                size={10}
                color={done || current ? colors.primary : colors.border}
              />
              <Text style={s.trackLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** One service tile in the pick-a-wash grid. */
export function ServiceTile({
  name, badge, badgeTone, pointsBadge, meta, onPress, selected,
}: {
  name: string;
  badge?: string;
  badgeTone?: 'brand' | 'accent';
  /** The floating "With points" pill over the art, as in the mockup's
   *  first tile — distinct from `badge`, which sits on the tile's edge. */
  pointsBadge?: string;
  meta?: string;
  onPress: () => void;
  selected?: boolean;
}) {
  const art = artFor(name);
  // The render is sized in px from the block's measured width. A % width
  // alone is not enough: an Image with no explicit height falls back to its
  // file's natural height (264px for the cars), and `contain` then floats
  // the picture up inside that tall box — a full row above its tile.
  const [blockW, setBlockW] = React.useState(0);
  const artW = (blockW * TILE_ART_WIDTH * (art.tileScale ?? 1)) / 100;
  const artH = artW / TILE_ART_ASPECT;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.tile, selected && s.tileSelected]}
      accessibilityRole="button"
      accessibilityLabel={meta ? `${name}, ${meta}` : name}
    >
      {/* The mockup's tile: a rounded grey block with the vehicle standing on
          its floor and rising out of the top — the vehicle is the thing you
          recognise, not the label. Both overhanging badges anchor to this
          block's top-right corner. */}
      <View
        style={[s.tileArt, selected && s.tileArtSelected]}
        onLayout={(e) => setBlockW(e.nativeEvent.layout.width)}
      >
        {art.image ? (
          blockW > 0 ? (
            <Image
              source={art.image}
              style={[
                s.tileArtImage,
                { width: artW, height: artH, left: (blockW - artW) / 2, bottom: art.tileBottom ?? 0 },
                art.flip && { transform: [{ scaleX: -1 }] },
              ]}
              resizeMode="contain"
            />
          ) : null
        ) : (
          <Icon name={art.icon} size={32} color={colors.ink[400]} />
        )}
        {/* Badges render after the art so they paint on top of it. */}
        {pointsBadge ? (
          <LinearGradient
            colors={colors.rewardIconGradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={s.tileFloatPill}
          >
            <Text style={s.tileFloatPillText}>{pointsBadge}</Text>
          </LinearGradient>
        ) : badge ? (
          <View style={[s.tileFloatPill, { backgroundColor: badgeTone === 'brand' ? colors.primary : colors.accent }]}>
            <Text style={s.tileFloatPillText}>{badge}</Text>
          </View>
        ) : null}
      </View>

      {/* The name sits in a tab cut into the block's bottom edge, painted
          the page colour — the mockup's notch. Drawn after the block, so it
          also covers the bottom of the render, as the wheels are there. */}
      <View style={s.tileLabelTab}>
        <Text style={s.tileName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {name}
          {meta ? (
            <>
              {'  •  '}
              <Text style={s.tileMeta}>{meta}</Text>
            </>
          ) : null}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** Width of a tile's render as a % of the tile, before its own tileScale. */
const TILE_ART_WIDTH = 80;
/** Width ÷ height of the box a tile's render is fitted (contain) into. */
const TILE_ART_ASPECT = 1.29;

/** The wide orange call to action that starts a job by scanning. */
export function ScanBar({ onPress, onManual }: { onPress: () => void; onManual: () => void }) {
  return (
    <View>
      <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
        <CssGradient
          colors={colors.gradientScan}
          locations={colors.gradientScanLocations}
          angle={colors.gradientScanAngle}
          style={s.scanBar}
        >
          {/* Stripes first so the cars paint over their left edge. */}
          <View style={s.scanStripes} pointerEvents="none">
            <ScanBarStripes />
          </View>
          {/* The cars sit against the left edge and bleed off the bottom of
              the bar, exactly as in the mockup. Absolute so they cannot
              push the label off-centre as the bar's width changes. */}
          <Image
            source={require('../../../assets/scan-cars.png')}
            style={s.scanCars}
            resizeMode="contain"
          />
          <Text style={s.scanText}>Scan to wash</Text>
          <View style={s.scanQr}>
            <Icon name="qrcode" size={19} color={colors.ink[900]} />
          </View>
        </CssGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={onManual} activeOpacity={0.6} style={s.manualBtn}>
        <Text style={s.manualText}>Scan to enter car details</Text>
      </TouchableOpacity>
    </View>
  );
}

/** A finished job in the recent list. */
export function RecentRow({
  title, subtitle, amount, tone, onPress, image,
}: {
  title: string;
  subtitle: string;
  amount: string;
  tone?: 'brand' | 'accent';
  onPress?: () => void;
  /** Service art shown in the icon box; falls back to a car glyph. */
  image?: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      style={s.recentRow}
    >
      <View style={s.recentIcon}>
        {image ? (
          <Image source={image} style={s.recentIconImage} resizeMode="contain" />
        ) : (
          <Icon name="car" size={14} color={colors.textSecondary} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.recentTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.recentSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={[s.recentAmount, tone === 'accent' && { color: colors.accent }]}>
        {amount}
      </Text>
    </TouchableOpacity>
  );
}

/** A nudge row — the mockup's "Verify your account" prompt. */
export function PromptRow({
  icon, title, subtitle, onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={s.recentRow}>
      <View style={[s.recentIcon, { backgroundColor: colors.infoSoft }]}>
        <Icon name={icon} size={13} color={colors.info} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.recentTitle} numberOfLines={1}>{title}</Text>
        <Text style={s.recentSub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={11} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

/**
 * The confirmation that sits over the home screen after a payment.
 *
 * Distinct from the receipt page, which is the formal record handed to the
 * customer. This is the worker's own reassurance once they are back at the
 * home screen — it names what they earned and goes away when dismissed, so
 * it never blocks the next car.
 */
export function SuccessToast({
  points, onDismiss, onViewPoints,
}: {
  points?: number | null;
  onDismiss: () => void;
  onViewPoints: () => void;
}) {
  return (
    <View style={s.toastWrap} pointerEvents="box-none">
      <LinearGradient
        colors={['#2A3D9A', '#203187']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.toast}
      >
        <TouchableOpacity onPress={onDismiss} style={s.toastClose} hitSlop={12} activeOpacity={0.7}>
          <Icon name="times" size={12} color="rgba(255,255,255,0.85)" />
        </TouchableOpacity>

        {/* Shown after the client picks how to pay — nothing has been charged
            yet; the attendant confirms the payment at the bay. */}
        <Text style={s.toastTitle}>Payment method saved</Text>
        <Text style={s.toastBody}>
          Pay the attendant when your car is ready — you earn your points once they confirm it
          {points ? <>{' '}(<Text style={s.toastPoints}>+{points} points</Text>)</> : null}
        </Text>

        <TouchableOpacity onPress={onViewPoints} style={s.toastBtn} activeOpacity={0.8}>
          <Text style={s.toastBtnText}>View Points</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

/**
 * The promotional card that closes the page — "wash 2 cars for the price of
 * 1", a real one-time offer rather than decoration:
 *
 *  - `available` (default): "Grab offer" → one booking with two cars, the
 *    dearer one charged and the other free.
 *  - `used`: taken — the card goes grey and inert, but stays on the page so
 *    the layout never jumps and the offer doesn't read as a glitch.
 */
export function PromoCard({
  onPress, state = 'available',
}: {
  onPress: () => void;
  state?: 'available' | 'used';
}) {
  const used = state === 'used';
  // Used keeps the card's full colour (the owner's call): the offer stays
  // part of the page's look. Only the button changes, and a tap explains
  // instead of booking — the caller's onPress handles that case.
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={used ? 'Wash 2 cars offer, already used' : 'Wash 2 cars for the price of 1, grab offer'}
    >
      <LinearGradient
        colors={colors.gradientBrandDeep}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.promo}
      >
        <View style={{ flex: 1 }}>
          <Text style={s.promoLine}>WASH 2 CARS</Text>
          <View style={s.promoRow}>
            <Text style={s.promoLine}>For</Text>
            <O1Badge size={24} />
            <Text style={s.promoLine}>price</Text>
          </View>
          <View style={[s.promoCta, used && s.promoCtaUsed]}>
            {used ? <Icon name="check" size={10} color="#fff" /> : null}
            <Text style={s.promoCtaText}>{used ? 'Offer already used' : 'Grab offer'}</Text>
          </View>
        </View>
        <Icon name="car" size={44} color="rgba(255,255,255,0.9)" />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  // ── Top bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgCard,
  },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  branch: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.medium },

  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  pointsText: { fontSize: font.sm, fontWeight: weight.heavy, color: '#fff' },
  pointsStar: {
    width: 16, height: 16, borderRadius: radii.full,
    backgroundColor: colors.pointsStarBg,
    alignItems: 'center', justifyContent: 'center',
  },

  menuBtn: { width: 28, height: 28, justifyContent: 'center', gap: 4, alignItems: 'flex-end' },
  menuLine: { width: 17, height: 2, borderRadius: 1, backgroundColor: colors.text },

  // ── Rewards banner ──
  // A tint alone was too faint to read as its own section — it needs a
  // visible edge and a filled icon to hold the eye, as it does in the design.
  // The border lives on the outer view and the gradient fills inside it,
  // so the 1px rule cannot be painted over by the gradient's own edge.
  rewardOuter: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.promoBannerBorder,
    // Clips the gradient's square corners to the rounded border.
    overflow: 'hidden',
  },
  // 16px radius and 16px padding, per the Figma frame. The design's
  // `space-between` is what pushes the chevron to the right edge; here the
  // copy block takes the slack with flex: 1, which does the same thing
  // without letting the star and the text drift apart.
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  // Sized to the label it sits beside (font.regular, 18px line box) rather
  // than to the card, so the two read as one line.
  rewardIcon: {
    width: 18, height: 18, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  rewardCopy: { flex: 1 },
  rewardLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rewardLabel: {
    fontSize: font.regular,
    lineHeight: 18,
    color: colors.ink[900],
    fontWeight: weight.medium,
  },
  rewardHeadlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  // About one word-space at this size (font.xl).
  rewardHeadlineGap: { gap: 5 },
  rewardHeadline: {
    fontSize: font.xl,
    fontWeight: weight.black,
    color: colors.ink[900],
    letterSpacing: tracking.tight,
  },
  // The lead-in ("Get up to") is noticeably lighter than the coloured
  // amount that follows it in the design — sharing rewardHeadline's black
  // weight made the whole line read as one bold block instead of two.
  rewardHeadlineLead: {
    fontSize: font.xl,
    fontWeight: weight.medium,
    color: colors.ink[900],
    letterSpacing: tracking.tight,
  },
  // 32x32 per the Figma frame, not 34 — close enough to have been easy to
  // miss, but the arrow inside was the bigger gap: 12px read much smaller
  // than the frame's own chevron (8.78 x 14.89, i.e. sized by its height).
  rewardChevron: {
    width: 32, height: 32, borderRadius: radii.full,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Service tiles ──
  // Measured off the mockup's tile grid: two narrower columns with a wide
  // gutter between them (the grid is inset from the page edge — see
  // ClientHome's tileGrid), each tile a rounded grey block about three times
  // as wide as it is tall, the vehicle standing on its floor and rising out
  // of the top, the name in a page-coloured tab notched into the bottom
  // edge. No card or border around the tile itself.
  //
  // paddingTop is the headroom the render rises into above the block, so
  // the second row's vehicles never reach the first row's names.
  tile: {
    width: '43%',
    paddingTop: 40,
    marginBottom: spacing.sm,
  },
  // A selected tile still needs a visible state without the tile becoming
  // a box — the block's own tint changes instead (tileArtSelected).
  tileSelected: {},
  // `overflow: visible` (the default, stated for clarity) is what lets the
  // render and the badges spill past the block's edges, as in the mockup.
  tileArt: {
    width: '100%',
    aspectRatio: 3,
    borderRadius: 18,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tileArtSelected: { backgroundColor: colors.primarySoft },
  // Anchored to the block's floor (bottom), sized in px from the block's
  // width (set per render in ServiceTile). Anchoring by the bottom is what
  // stands every vehicle on the same floor whatever its height; overflow
  // then all goes upward.
  tileArtImage: { position: 'absolute' },
  // "With points" / "New": on the block's top-right corner, mostly above
  // the top edge and just past the right one. Pinned only by top/right
  // (never left too — on react-native-web pinning both edges stretches it
  // full width), so it sizes to its text.
  tileFloatPill: {
    position: 'absolute',
    top: -20,
    right: -10,
    zIndex: 3,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tileFloatPillText: {
    fontSize: font.sm,
    fontWeight: weight.medium,
    color: '#fff',
  },
  // The notch: the page background (colors.bg, ClientHome's own) with
  // rounded top corners, pulled up over the block's bottom edge. It covers
  // the bottom of the render too, which is where the mockup's wheels go.
  tileLabelTab: {
    alignSelf: 'center',
    maxWidth: '100%',
    marginTop: -9,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: spacing.sm + 2,
    paddingTop: 4,
  },
  // The "•" before a meta line inherits this — dark, as in the mockup —
  // and only the meta itself ("30 mins") is grey.
  tileName: {
    fontSize: 13,
    fontWeight: weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  tileMeta: { fontSize: font.sm, fontWeight: weight.regular, color: colors.textMuted },


  // ── Wash tracker ──
  trackWrap: { height: 30, justifyContent: 'center', marginHorizontal: 9 },
  track: {
    position: 'absolute', left: 0, right: 0,
    height: 12, borderRadius: radii.full, backgroundColor: '#E9E9F0',
  },
  trackFill: { position: 'absolute', left: 0, height: 12, borderRadius: radii.full },
  trackNode: {
    position: 'absolute',
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 4,
  },
  trackNodeStart: { left: -9, borderColor: '#6A00F4' },
  trackNodeEnd: { right: -9, borderColor: '#E9E9F0' },
  trackNodeDone: { borderColor: '#AC00FF' },
  trackKnob: {
    position: 'absolute',
    marginLeft: -15,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    ...shadow.sm,
  },
  trackCar: { width: 22, height: 16, transform: [{ scaleX: -1 }] },
  trackLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  trackLabelItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trackLabel: { fontSize: font.xs, color: colors.textSecondary, fontWeight: weight.medium },

  // ── Scan bar ──
  // 46px tall with a 16px radius, per the Figma frame. `overflow: hidden`
  // is what lets the cars bleed off the left edge and still be clipped to
  // the rounded corner.
  scanBar: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
    ...shadow.sm,
  },
  // Larger than the bar and pushed past its left and bottom edges, so the
  // bar's own overflow:hidden crops the cars the way the Figma frame does.
  scanCars: {
    position: 'absolute',
    left: -36,
    bottom: -14,
    width: 118,
    height: 64,
    // The source art faces left; mirrored so the cars drive toward the label.
    transform: [{ scaleX: -1 }],
  },
  // The stripe patch, shifted left of centre per request — closer to the
  // car icon's side of the bar rather than dead-centre.
  // 73.5px into a 327px bar in the Figma frame = 22.5% of the width.
  scanStripes: {
    position: 'absolute',
    left: '22.5%',
    top: 0,
  },
  scanText: {
    // Centred in the bar rather than laid out in the row: the cars on the
    // left would otherwise shove the label toward the QR tile. flex: 1 with
    // a centred text keeps it on the bar's true midline, which is where the
    // mockup has it.
    flex: 1,
    textAlign: 'center',
    fontSize: font.lg,
    fontWeight: weight.black,
    color: '#fff',
    letterSpacing: tracking.tight,
  },
  // Solid white in the design, not a translucent wash — it reads as a
  // physical tile sitting on the bar.
  scanQr: {
    width: 34, height: 34, borderRadius: radii.sm,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  manualBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  manualText: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.medium },

  // ── Recent rows ──
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadow.xs,
  },
  recentIcon: {
    width: 34, height: 34, borderRadius: radii.sm,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  recentIconImage: { width: 28, height: 24 },
  recentTitle: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  recentSub: { fontSize: font.micro, color: colors.textMuted, marginTop: 2 },
  recentAmount: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.primary },

  // ── Success toast ──
  // Pinned near the bottom, over the page rather than in it, so dismissing
  // it leaves the home screen exactly as it was.
  toastWrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    zIndex: 50,
  },
  toast: {
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadow.lg,
  },
  toastClose: { position: 'absolute', top: spacing.md, right: spacing.md, padding: 2 },
  toastTitle: {
    fontSize: font.regular,
    fontWeight: weight.black,
    color: '#fff',
    letterSpacing: tracking.tight,
    paddingRight: spacing.lg,
  },
  toastBody: {
    fontSize: font.xs,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 17,
    marginTop: 4,
  },
  toastPoints: { color: colors.accentLight, fontWeight: weight.heavy },
  toastBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: 7,
    marginTop: spacing.md,
  },
  toastBtnText: { fontSize: font.xs, fontWeight: weight.bold, color: '#fff' },

  // ── Promo ──
  promo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  promoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  promoLine: {
    fontSize: font.xl,
    fontWeight: weight.black,
    color: '#fff',
    letterSpacing: tracking.tight,
  },
  promoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  // The 'used' state keeps the card's colour; only the button reads as
  // spent — an outline instead of a fill, with a tick before the words.
  promoCtaUsed: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  promoCtaText: { fontSize: font.xs, fontWeight: weight.bold, color: '#fff' },
});
