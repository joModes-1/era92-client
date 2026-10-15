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
  const parts = at >= 0
    ? [headline.slice(0, at), headline.slice(at)]
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
            <View style={s.rewardHeadlineRow}>
              <Text style={s.rewardHeadlineLead} numberOfLines={1}>{parts[0]}</Text>
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
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[s.tile, selected && s.tileSelected]}
    >
      {/* The artwork owns the top half of the tile, centred — in the mockup
          the vehicle is the thing you recognise, not the label. Both
          overhanging badges anchor to this pill, not the tile — there is
          no card edge left for them to pin to. */}
      <View style={[s.tileArt, selected && s.tileArtSelected]}>
        {art.image ? (
          <Image
            source={art.image}
            style={[
              s.tileArtImage,
              art.flip && { transform: [{ scaleX: -1 }] },
              art.sizeDelta ? { width: 76 + art.sizeDelta, height: 76 + art.sizeDelta, marginLeft: -38 - art.sizeDelta / 2 } : null,
              art.offsetY ? { top: -31 + art.offsetY } : null,
            ]}
            resizeMode="contain"
          />
        ) : (
          <Icon name={art.icon} size={40} color={colors.ink[400]} />
        )}
        {/* Badges render after the art so they paint on top of it. */}
        {pointsBadge ? (
          <LinearGradient
            colors={colors.rewardIconGradient}
            start={colors.rewardIconGradientStart}
            end={colors.rewardIconGradientEnd}
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

      <Text style={s.tileName} numberOfLines={1}>
        {name}
        {meta ? <Text style={s.tileMeta}>{`  •  ${meta}`}</Text> : null}
      </Text>
    </TouchableOpacity>
  );
}

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

        <Text style={s.toastTitle}>Payment Successfully</Text>
        <Text style={s.toastBody}>
          You have successfully paid for your car wash
          {points ? <>{' '}and have earned <Text style={s.toastPoints}>+{points} points</Text></> : null}
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
 * 1", now a real one-time offer rather than decoration:
 *
 *  - `available` (default): grab it → booking flow with the offer attached;
 *    after the paid wash settles, the next one is free.
 *  - `armed`: grabbed and paid, waiting to be spent — the CTA becomes
 *    "Book your free wash" and the card stays tappable.
 *  - `used`: spent — the card goes grey and inert, but stays on the page
 *    so the layout never jumps and the offer doesn't read as a glitch.
 */
export function PromoCard({
  onPress, state = 'available',
}: {
  onPress: () => void;
  state?: 'available' | 'armed' | 'used';
}) {
  const used = state === 'used';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      disabled={used}
    >
      <LinearGradient
        colors={used
          ? [colors.bgSunken, colors.bgSunken]
          : colors.gradientBrandDeep}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.promo}
      >
        <View style={{ flex: 1 }}>
          {state === 'armed' ? (
            <>
              <Text style={s.promoLine}>YOUR NEXT WASH</Text>
              <View style={s.promoRow}>
                <Text style={s.promoLine}>Is</Text>
                <O1Badge size={24} />
                <Text style={s.promoLine}>FREE</Text>
              </View>
              <View style={[s.promoCta, used && s.promoCtaUsed]}>
                <Text style={s.promoCtaText}>Book your free wash</Text>
              </View>
            </>
          ) : (
            <>
              <Text style={[s.promoLine, used && s.promoLineUsed]}>WASH 2 CARS</Text>
              <View style={s.promoRow}>
                <Text style={[s.promoLine, used && s.promoLineUsed]}>For</Text>
                <O1Badge size={24} />
                <Text style={[s.promoLine, used && s.promoLineUsed]}>price</Text>
              </View>
              <View style={[s.promoCta, used && s.promoCtaUsed]}>
                <Text style={s.promoCtaText}>{used ? 'Offer already used' : 'Grab offer'}</Text>
              </View>
            </>
          )}
        </View>
        <Icon
          name={used ? 'check-circle' : 'car'}
          size={44}
          color={used ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.9)'}
        />
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
  // Two per row: 48% leaves room for the gap between them, and the tiles
  // wrap into a 2x2 rather than being squeezed into a single row. No card
  // background or border on the tile itself — the mockup has no box around
  // the whole tile, only a pill-shaped tint sitting behind the vehicle art
  // (`tileArt` below); the label floats on the plain page background.
  tile: {
    width: '48%',
    paddingTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  // A selected tile still needs a visible state without the tile becoming
  // a box — a ring around the art's own pill reads as "chosen" without
  // introducing the card edge the design doesn't have.
  tileSelected: {},
  // The rounded tint sits behind the art only, not the label — its own
  // element, not the tile's background, and sized to leave room for the
  // "With points" pill to overhang its top edge without clipping.
  // `overflow: visible` (the default, stated for clarity) is what lets the
  // vehicle image below bleed past this pill's own edge, per the mockup —
  // the render is drawn larger than the tint it sits on, not fitted inside
  // it.
  tileArt: {
    height: 45,
    marginTop: 6,
    marginBottom: spacing.sm,
    borderRadius: radii.xl,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  tileArtSelected: { backgroundColor: colors.primarySoft },
  // Fixed pixel size, not a percentage of the pill — a percentage shrinks
  // in lockstep with the pill itself, which is what kept the render
  // "fitting" no matter how small tileArt's own height got. A flat size
  // held constant against a 45px-tall pill is what actually overflows it,
  // the way the mockup's renders spill past their own rounded shape rather
  // than sitting fitted inside it. Bottom-aligned to the pill (top is
  // 45 - 76) so all of the overflow goes up, away from the label below —
  // overflowing down was crowding into that text instead.
  tileArtImage: {
    position: 'absolute',
    top: -31,
    left: '50%',
    marginLeft: -38,
    width: 76,
    height: 76,
  },
  // One floating pill style for both "With points" and "New": pinned only
  // by top/right (never left too — on react-native-web pinning both edges
  // stretches it full width), so it sizes to its text and floats above the
  // art's top-right corner as in the mockup.
  tileFloatPill: {
    position: 'absolute',
    top: -14,
    right: 6,
    zIndex: 3,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tileFloatPillText: {
    fontSize: font.micro,
    fontWeight: weight.semibold,
    color: '#fff',
  },
  tileName: {
    fontSize: font.sm,
    fontWeight: weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  tileMeta: { fontSize: font.xs, fontWeight: weight.regular, color: colors.textMuted },

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
  // Ink colour flips with the card: white on the dark gradient, muted ink
  // when the card is greyed out in its 'used' state.
  promoLineUsed: { color: colors.textMuted },
  promoCta: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  // The inert 'used' state: the CTA pill keeps its shape but reads as
  // spent — darker fill, muted text — rather than still being tappable.
  promoCtaUsed: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  promoCtaText: { fontSize: font.xs, fontWeight: weight.bold, color: '#fff' },
});
