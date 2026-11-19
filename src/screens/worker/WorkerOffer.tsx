import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, soft, tint, jk, offer as O, staffType } from '../../theme';
import CarWashLogo from '../../components/CarWashLogo';
import Icon from '../../components/admin/LineIcon';
import { SlideToConfirm } from '../../components/ui';
import { Btn } from '../../components/admin/kit';
import CountdownRing from './CountdownRing';

/**
 * The worker's job offer, in the three shapes the design gives it:
 *  - OfferCard: the offer inline on Home, with a swipe to take it;
 *  - OfferFullScreen: the same offer taking over the screen when it arrives;
 *  - OfferClosed: what is left once it has gone to someone else.
 */

const ugx = (n: any) => Number(n || 0).toLocaleString();

/** What a worker is paid for, in one line: "Saloon · Engine wash". */
const carLine = (w: any) => [w.vehicle_class_name, w.service_name].filter(Boolean).join(' · ');
const price = (w: any) => (w.is_redemption ? (w.promo_key ? 'Free · 2-for-1' : 'Free') : `UGX ${ugx(w.quoted_amount_ugx)}`);

/** The number plate, drawn like one: boxed, bold, tracked. */
export function PlateBox({ text, muted, big }: { text: string; muted?: boolean; big?: boolean }) {
  return (
    <View style={[s.plate, muted && s.plateMuted, big && s.plateBig]}>
      <Text style={[s.plateText, muted && { color: O.closedRing }, big && { fontSize: 34, lineHeight: 40 }]}>{text}</Text>
    </View>
  );
}

/** A small tinted label: "UGX 8,000" in blue, "+10 pts" in violet. */
function Chip({ text, tone }: { text: string; tone: 'info' | 'primary' }) {
  return (
    <View style={[s.chip, { backgroundColor: tint[tone].bg }]}>
      <Text style={[s.chipText, { color: tint[tone].text }]}>{text}</Text>
    </View>
  );
}

// ───────────────────────── Inline on Home ─────────────────────────

export function OfferCard({
  wash, left, total, canTake, why, taking, onTake, onOpen, busyWithCar,
}: {
  wash: any;
  left: number;
  total: number;
  canTake: boolean;
  /** Why the swipe isn't offered ("Finish UBD 019Q first"). */
  why?: string;
  taking: boolean;
  onTake: () => void;
  onOpen: () => void;
  /**
   * The worker is already washing a car, so the page already carries its
   * slide (finish washing). Taking another is a plain button — never a
   * second slide competing with that one.
   */
  busyWithCar?: boolean;
}) {
  const pts = Number(wash.worker_points_to_award || 0);
  const secs = Math.max(0, left);
  return (
    <View style={s.card}>
      <TouchableOpacity activeOpacity={0.8} onPress={onOpen} style={s.cardTop} accessibilityRole="button" accessibilityLabel="Open this job offer">
        <CountdownRing left={left} total={total} size={58} stroke={5} color={O.ring} track={O.ringTrack}>
          <Text style={s.ringSmall}>{secs}</Text>
        </CountdownRing>
        <View style={{ flex: 1 }}>
          <Text style={s.cardCar} numberOfLines={1}>{carLine(wash)}</Text>
          <Text style={s.cardWho} numberOfLines={1}>{[wash.plate, wash.client_name].filter(Boolean).join(' · ')}</Text>
          <View style={s.chips}>
            <Chip text={price(wash)} tone="info" />
            {pts > 0 ? <Chip text={`+${pts} pts`} tone="primary" /> : null}
          </View>
        </View>
      </TouchableOpacity>

      {canTake && busyWithCar ? (
        <View style={{ marginTop: 14 }}>
          <Btn small primary title={taking ? 'Taking…' : 'Take this car too'} disabled={taking} onPress={onTake} />
        </View>
      ) : canTake ? (
        <View style={{ marginTop: 14 }}>
          <SlideToConfirm label="Swipe to take" onConfirm={onTake} loading={taking} showHint={false} outlined />
        </View>
      ) : (
        <View style={s.whyBox}><Text style={s.whyText}>{why || 'Not your turn yet'}</Text></View>
      )}

      <View style={s.track}><View style={[s.trackFill, { width: `${Math.max(0, Math.min(1, total > 0 ? left / total : 0)) * 100}%` }]} /></View>
      <Text style={s.wait}>{secs > 0 ? `Goes to the next worker in ${secs}s` : 'Assigning…'}</Text>
    </View>
  );
}

// ───────────────────────── Full screen ─────────────────────────

function Header({ branch, pill, closed }: { branch?: string; pill: string; closed?: boolean }) {
  return (
    <View style={s.header}>
      <View style={{ flex: 1 }}>
        <CarWashLogo height={16} />
        {branch ? <Text style={s.headerBranch} numberOfLines={1}>{branch}</Text> : null}
      </View>
      <View style={[s.headerPill, closed && { backgroundColor: O.closedTrack }]}>
        <Text style={[s.headerPillText, closed && { color: colors.textSecondary }]}>{pill}</Text>
      </View>
    </View>
  );
}

export function Row({ label, value, pill, last }: { label: string; value: string; pill?: boolean; last?: boolean }) {
  return (
    <View style={[s.row, last && { borderBottomWidth: 0 }]}>
      <Text style={s.rowLabel}>{label}</Text>
      {pill ? (
        <View style={[s.chip, { backgroundColor: tint.primary.bg }]}><Text style={[s.chipText, { color: tint.primary.text }]}>{value}</Text></View>
      ) : (
        <Text style={s.rowValue}>{value}</Text>
      )}
    </View>
  );
}

export function OfferFullScreen({
  branch, wash, left, total, taking, onTake, onPass,
}: {
  branch?: string;
  wash: any;
  left: number;
  total: number;
  taking: boolean;
  onTake: () => void;
  onPass: () => void;
}) {
  const pts = Number(wash.worker_points_to_award || 0);
  const others = Number(wash.others_seeing || 0);
  const secs = Math.max(0, left);
  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <Header branch={branch} pill="New job" />
      <View style={s.body}>
        <Text style={s.lead}>A client is waiting for a wash</Text>

        <View style={{ alignItems: 'center', marginTop: 6 }}>
          <CountdownRing left={left} total={total} size={206} stroke={13} color={O.ring} track={O.ringTrack}>
            <Text style={s.ringBig}>{secs}</Text>
            <Text style={s.ringCaption}>seconds left</Text>
          </CountdownRing>
        </View>

        <View style={s.plateCard}>
          {wash.plate ? <PlateBox text={wash.plate} big /> : null}
          <Text style={s.plateCar}>{carLine(wash)}</Text>
        </View>

        <View style={s.details}>
          {wash.client_name ? <Row label="Client" value={wash.client_name} /> : null}
          <Row label="You collect" value={wash.is_redemption ? 'Free wash' : `UGX ${ugx(wash.quoted_amount_ugx)}`} />
          {pts > 0 ? <Row label="You earn" value={`+${pts} points`} pill /> : null}
          <Row label="Also seeing this" value={others === 1 ? '1 other worker' : `${others} other workers`} last />
        </View>
      </View>

      <View style={s.footer}>
        <SlideToConfirm label="Swipe to take this job" onConfirm={onTake} loading={taking} outlined />
        <TouchableOpacity onPress={onPass} hitSlop={12} style={s.pass} accessibilityRole="button">
          <Text style={s.passText}>Pass</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ───────────────────────── Closed ─────────────────────────

export function OfferClosed({
  branch, wash, taken, stats, onBack,
}: {
  branch?: string;
  wash: any;
  /** True when another worker took it before the time ran out. */
  taken: boolean;
  stats?: { offers_today: number; taken_today: number; avg_take_seconds: number | null } | null;
  onBack: () => void;
}) {
  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <Header branch={branch} pill="Closed" closed />
      <View style={s.body}>
        <Text style={s.lead}>{taken ? 'Someone else took it' : 'Too slow this time'}</Text>

        <View style={{ alignItems: 'center', marginTop: 6 }}>
          <CountdownRing left={0} total={1} size={206} stroke={13} color={O.closedRing} track={O.closedTrack}>
            <Text style={[s.ringBig, { color: O.closedRing }]}>0</Text>
            <Text style={s.ringCaption}>{taken ? 'taken' : "time's up"}</Text>
          </CountdownRing>
        </View>

        <View style={[s.plateCard, { backgroundColor: O.closedCard }]}>
          {wash.plate ? <PlateBox text={wash.plate} muted big /> : null}
          <Text style={[s.plateCar, { color: O.closedRing }]}>{carLine(wash)}</Text>
          <View style={s.passed}><Text style={s.passedText}>Passed to the next worker</Text></View>
        </View>

        <View style={s.stay}>
          <View style={s.stayIcon}><Icon name="clock" size={17} color={tint.info.fg} /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.stayTitle}>Stay on this screen</Text>
            <Text style={s.staySub}>The next booking comes to you.</Text>
          </View>
        </View>

        {stats && stats.offers_today > 0 ? (
          <View style={s.details}>
            <Row label="Offers taken today" value={`${stats.taken_today} of ${stats.offers_today}`} last={stats.avg_take_seconds == null} />
            {stats.avg_take_seconds != null ? <Row label="Average time to take" value={`${stats.avg_take_seconds} seconds`} last /> : null}
          </View>
        ) : null}
      </View>

      <View style={s.footer}>
        <TouchableOpacity onPress={onBack} activeOpacity={0.8} style={s.back} accessibilityRole="button">
          <Text style={s.backText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // Inline card
  card: { backgroundColor: O.card, borderRadius: 22, borderWidth: 1.5, borderColor: O.border, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ringSmall: { fontSize: 18, ...jk.heavy, color: colors.text, ...staffType.tabular },
  cardCar: { fontSize: 16, ...jk.bold, color: colors.text },
  cardWho: { fontSize: 12, ...jk.medium, color: colors.textSecondary, marginTop: 2 },
  chips: { flexDirection: 'row', gap: 6, marginTop: 8 },
  chip: { borderRadius: 9, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontSize: 12, ...jk.bold },
  whyBox: { marginTop: 14, backgroundColor: colors.bgSunken, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14 },
  whyText: { fontSize: 13, ...jk.semibold, color: colors.textSecondary, textAlign: 'center' },
  track: { height: 6, borderRadius: 3, backgroundColor: O.ringTrack, marginTop: 14, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3, backgroundColor: O.ring },
  wait: { fontSize: 13, ...jk.bold, color: O.waitText, marginTop: 8 },

  // Full screen
  screen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  headerBranch: { fontSize: 12, ...jk.medium, color: colors.textSecondary, marginTop: 2 },
  headerPill: { backgroundColor: O.pill, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  headerPillText: { fontSize: 12, ...jk.bold, color: O.pillText },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 12, gap: 14 },
  lead: { fontSize: 15, ...jk.bold, color: colors.text, textAlign: 'center' },
  ringBig: { fontSize: 64, lineHeight: 70, ...jk.heavy, color: colors.text, ...staffType.tabular },
  ringCaption: { fontSize: 14, ...jk.medium, color: colors.textSecondary },

  plate: {
    borderWidth: 2, borderColor: O.plateInk, borderRadius: 8, backgroundColor: O.plateBg,
    paddingHorizontal: 18, paddingVertical: 4,
  },
  plateMuted: { borderColor: O.closedRing, backgroundColor: 'transparent' },
  plateBig: { paddingHorizontal: 20, paddingVertical: 6 },
  plateText: { fontSize: 28, lineHeight: 34, ...jk.heavy, color: O.plateInk, letterSpacing: 2 },
  plateCard: { backgroundColor: colors.bgCard, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center', gap: 10, ...soft.cardShadow },
  plateCar: { fontSize: 17, ...jk.bold, color: colors.text },
  passed: { backgroundColor: colors.bgCard, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  passedText: { fontSize: 11, ...jk.semibold, color: colors.textSecondary },

  details: { backgroundColor: colors.bgCard, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 4, ...soft.cardShadow },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: soft.line },
  rowLabel: { fontSize: 14, ...jk.medium, color: colors.textSecondary },
  rowValue: { fontSize: 14, ...jk.bold, color: colors.text },

  stay: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.bgCard, borderRadius: 18, padding: 14, ...soft.cardShadow },
  stayIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: tint.info.bg, alignItems: 'center', justifyContent: 'center' },
  stayTitle: { fontSize: 14, ...jk.bold, color: colors.text },
  staySub: { fontSize: 12, ...jk.medium, color: colors.textSecondary, marginTop: 2 },

  footer: { paddingHorizontal: 20, paddingBottom: 16, paddingTop: 8 },
  pass: { alignItems: 'center', paddingVertical: 14 },
  passText: { fontSize: 15, ...jk.semibold, color: colors.textSecondary },
  back: { height: 54, borderRadius: 27, backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 15, ...jk.bold, color: colors.text },
});
