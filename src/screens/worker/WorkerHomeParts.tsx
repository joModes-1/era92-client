import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing } from 'react-native';
import { colors, soft, tint, jk, offer as O, staffType } from '../../theme';
import Icon from '../../components/admin/LineIcon';
import { artFor } from '../client/serviceArt';

/**
 * The worker home's building blocks, in the client home's visual language —
 * a white page, one bold brand-gradient card, grey "art" blocks with the car
 * standing in them, and quiet lists — so the two apps read as one brand.
 */

const ugx = (n: any) => Number(n || 0).toLocaleString();
const compact = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : String(n));

// ───────────────────────── Duty ─────────────────────────

/**
 * The on-duty switch as one slim white row at the top of the page — the one
 * control a worker reaches for when they start or end the day, and how many
 * workers are on site with them.
 */
export function DutyBar({ dutyOn, online, onToggle }: { dutyOn: boolean; online: number; onToggle: () => void }) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      style={s.duty}
      accessibilityRole="switch"
      accessibilityState={{ checked: dutyOn }}
      accessibilityLabel="On duty"
    >
      {dutyOn ? <LiveDot color={O.duty} /> : <View style={[s.liveDot, { backgroundColor: colors.textMuted }]} />}
      <Text style={s.dutyText} numberOfLines={1}>
        {dutyOn ? 'On duty' : 'Off duty'}
        <Text style={s.liveMuted}>  ·  {online} {online === 1 ? 'worker' : 'workers'} on site</Text>
      </Text>
      <View style={[s.dutyTrack, dutyOn && s.dutyTrackOn]}>
        <View style={[s.dutyKnob, dutyOn && s.dutyKnobOn]} />
      </View>
    </TouchableOpacity>
  );
}

// ───────────────────────── Status ─────────────────────────

/** A dot that breathes, so "waiting" reads as live, not frozen. */
function LiveDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return (
    <View style={s.liveWrap}>
      <Animated.View style={[s.liveRing, { backgroundColor: color, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }]} />
      <View style={[s.liveDot, { backgroundColor: color }]} />
    </View>
  );
}

/**
 * Where the worker stands, as the page's picture: the car standing in a grey
 * block (the client tiles' look), "Ready for a car" and a live line saying
 * the app is waiting for bookings. Off duty, it says so and offers the way
 * back on.
 */
export function StatusCard({
  dutyOn, waiting, onGoOnDuty,
}: {
  dutyOn: boolean;
  /** Cars waiting that this worker can see (0 = none). */
  waiting: number;
  onGoOnDuty: () => void;
}) {
  const art = artFor('Full car wash');
  return (
    <View style={s.status}>
      <View style={s.statusArtBlock}>
        <Image
          source={art.image}
          style={[s.statusArt, !dutyOn && { opacity: 0.45 }, art.flip && { transform: [{ scaleX: -1 }] }]}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
      <View style={s.statusCopy}>
        <Text style={s.statusTitle}>{dutyOn ? 'Ready for a car' : "You're off duty"}</Text>
        <Text style={s.statusSub}>
          {dutyOn
            ? waiting > 0 ? 'A car is waiting below — take it before the timer runs out.' : 'The next booking comes straight to you.'
            : "You won't be offered new cars until you're back on."}
        </Text>
        {dutyOn ? (
          <View style={s.live}>
            <LiveDot color={O.duty} />
            <Text style={s.liveText}>
              {waiting > 0 ? `${waiting} ${waiting === 1 ? 'car' : 'cars'} waiting` : 'Waiting for bookings'}
            </Text>
          </View>
        ) : (
          <TouchableOpacity onPress={onGoOnDuty} activeOpacity={0.85} style={s.goOn} accessibilityRole="button">
            <Icon name="bolt" size={13} color="#fff" />
            <Text style={s.goOnText}>Go on duty</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ───────────────────────── Two tiles ─────────────────────────

function Tile({ icon, tone, label, value, sub, onPress }: {
  icon: string; tone: 'warning' | 'primary' | 'success'; label: string; value: string; sub: string; onPress: () => void;
}) {
  const t = tint[tone];
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[s.tile, { backgroundColor: t.bg }]} accessibilityRole="button">
      <View style={s.tileHead}>
        <View style={s.tileIcon}><Icon name={icon} size={15} color={t.fg} /></View>
        <Text style={s.tileLabel} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={s.tileValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <View style={s.tileFoot}>
        <Text style={[s.tileSub, { color: t.text }]} numberOfLines={1}>{sub}</Text>
        <Icon name="chevron-right" size={12} color={t.text} />
      </View>
    </TouchableOpacity>
  );
}

/** Cash still to hand in, and this week's place on the board — side by side. */
export function QuickTiles({
  owes, rank, weekPoints, onCash, onBoard,
}: {
  owes: number;
  rank: number | null;
  weekPoints: number;
  onCash: () => void;
  onBoard: () => void;
}) {
  return (
    <View style={s.tiles}>
      {owes > 0 ? (
        <Tile icon="money-bill-wave" tone="warning" label="Cash to hand in" value={compact(owes)} sub="Hand over" onPress={onCash} />
      ) : (
        <Tile icon="check" tone="success" label="Cash" value="All in" sub="Nothing to hand in" onPress={onCash} />
      )}
      <Tile icon="trophy" tone="primary" label="This week" value={rank ? `#${rank}` : '—'} sub={`${ugx(weekPoints)} pts · board`} onPress={onBoard} />
    </View>
  );
}

// ───────────────────────── Done today ─────────────────────────

const hhmm = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** The cars finished today, in the client's "Recent washes" style, with the day's total. */
export function DoneToday({ rows }: { rows: any[] }) {
  const total = rows.reduce((t: number, r: any) => t + Number(r.amount_ugx || 0), 0);
  return (
    <View style={{ gap: 10 }}>
      <View style={s.sectionRow}>
        <Text style={s.section}>Done today</Text>
        <Text style={s.sectionMeta}>{rows.length} {rows.length === 1 ? 'car' : 'cars'} · UGX {ugx(total)}</Text>
      </View>
      <View style={s.list}>
        {rows.map((r: any, i: number) => {
          const art = artFor(r.service_name || '');
          const pts = Number(r.worker_points_to_award || 0);
          return (
            <View key={r.id} style={[s.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={s.rowArt}>
                {art.image ? <Image source={art.image} style={s.rowArtImg} resizeMode="contain" /> : <Icon name="car" size={16} color={colors.textSecondary} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{r.plate || r.job_no}</Text>
                <Text style={s.rowSub} numberOfLines={1}>{[r.vehicle_class_name, r.service_name, hhmm(r.settled_at)].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 3 }}>
                <Text style={s.rowAmount}>UGX {ugx(r.amount_ugx)}</Text>
                {pts > 0 ? <Text style={s.rowPts}>+{pts} pts</Text> : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/** A section heading in the client's style, with an optional count on the right. */
export function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.section}>{title}</Text>
      {meta ? <Text style={s.sectionMeta}>{meta}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  // Duty row
  duty: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingLeft: 16, paddingRight: 12,
    borderRadius: 18, backgroundColor: colors.bgCard, ...soft.cardShadow,
  },
  dutyText: { flex: 1, fontSize: 14, ...jk.bold, color: colors.text },
  dutyTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#D9DFEC', padding: 3, justifyContent: 'center' },
  dutyTrackOn: { backgroundColor: O.duty },
  dutyKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  dutyKnobOn: { alignSelf: 'flex-end' },

  // Status
  status: { backgroundColor: colors.bgCard, borderRadius: 24, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, ...soft.cardShadow },
  statusArtBlock: { width: 112, height: 96, borderRadius: 18, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'flex-end', overflow: 'visible' },
  statusArt: { width: 124, height: 92, marginBottom: -6 },
  statusCopy: { flex: 1, gap: 5 },
  statusTitle: { fontSize: 18, ...jk.heavy, color: colors.text },
  statusSub: { fontSize: 12.5, lineHeight: 17, ...jk.medium, color: colors.textSecondary },
  live: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  liveWrap: { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  liveRing: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { flexShrink: 1, fontSize: 12, ...jk.bold, color: tint.success.text },
  liveMuted: { ...jk.medium, color: colors.textSecondary },
  goOn: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6,
    backgroundColor: O.duty, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8,
  },
  goOnText: { fontSize: 13, ...jk.bold, color: '#fff' },

  // Tiles
  tiles: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, borderRadius: 22, padding: 14, gap: 4 },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  tileLabel: { flex: 1, fontSize: 12, ...jk.semibold, color: colors.text },
  tileValue: { fontSize: 26, lineHeight: 32, ...jk.heavy, color: colors.text, marginTop: 6, ...staffType.tabular },
  tileFoot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tileSub: { flex: 1, fontSize: 12, ...jk.bold },

  // Section + list
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  section: { fontSize: 18, ...jk.heavy, color: colors.text },
  sectionMeta: { fontSize: 12, ...jk.semibold, color: colors.textSecondary },
  list: { backgroundColor: colors.bgCard, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 4, ...soft.cardShadow },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: soft.line },
  rowArt: { width: 48, height: 40, borderRadius: 12, backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center' },
  rowArtImg: { width: 44, height: 34 },
  rowTitle: { fontSize: 15, ...jk.bold, color: colors.text, letterSpacing: 0.3 },
  rowSub: { fontSize: 12, ...jk.medium, color: colors.textSecondary, marginTop: 2 },
  rowAmount: { fontSize: 14, ...jk.heavy, color: colors.text, ...staffType.tabular },
  rowPts: { fontSize: 11, ...jk.bold, color: tint.success.text },
});
