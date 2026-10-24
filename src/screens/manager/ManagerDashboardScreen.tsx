import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, spacing, weight, Tone, tone as toneMap, staffType, staffText } from '../../theme';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from '../../components/Icon';
import CssGradient from '../../components/CssGradient';
import AppTopBar from '../../components/AppTopBar';
import { Surface, SectionHeader, SkeletonList, Avatar } from '../../components/ui';

/**
 * The manager's Home — "how is today going, and what needs me", laid out
 * per STAFF-UI-SPEC.md §4 from Toast Now, Square Dashboard, Shopify Home and
 * 7shifts:
 *
 *  1. A date bar (Today ‹ ›) — one day at a time, like Toast Now.
 *  2. Takings for that day with a fair comparison: today so far against the
 *     same weekday last week UP TO THE SAME TIME (Toast "same time", DRB
 *     "period to date"); a past day against the whole of that weekday.
 *  3. Four tiles: cars washed, average per car, and — for today — cars in
 *     progress and workers on shift.
 *  4. Needs attention (today): one row per thing to act on, with its count;
 *     "All clear" said out loud when there is nothing.
 *  5. Who's working: a status word on every person, never a dot alone
 *     (Deputy, 7shifts), and the cash each is holding.
 *  6. Recent activity.
 */

const ugx = (n: any) => Number(n || 0).toLocaleString();
const isoDay = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function timeAgo(iso?: string) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_META: Record<string, { tone: Tone; label: string; icon: string }> = {
  requested: { tone: 'neutral', label: 'Booked', icon: 'clock' },
  in_progress: { tone: 'warning', label: 'Washing', icon: 'soap' },
  ready: { tone: 'info', label: 'Ready', icon: 'check-circle' },
  settled: { tone: 'success', label: 'Paid', icon: 'check-double' },
  cancelled: { tone: 'error', label: 'Cancelled', icon: 'times-circle' },
  reversed: { tone: 'error', label: 'Reversed', icon: 'undo' },
  disputed: { tone: 'error', label: 'Disputed', icon: 'gavel' },
};

export default function ManagerDashboardScreen() {
  const navigation = useNavigation<any>();
  const { actor } = useAuth();
  const [day, setDay] = useState(() => new Date());
  const [daily, setDaily] = useState<any>(null);
  const [compare, setCompare] = useState<any>(null);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [queue, setQueue] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [stale, setStale] = useState<{ ready: number; washing: number }>({ ready: 0, washing: 0 });
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isToday = sameDay(day, new Date());

  const load = useCallback(async () => {
    const date = isoDay(day);
    const lastWeek = isoDay(addDays(day, -7));
    const now = new Date();
    const weekAgo = isoDay(addDays(now, -7));
    const [d, c, e, sh, q, r, wl, st] = await Promise.allSettled([
      api.daily(date),
      // Today: last week's same day up to this minute. A past day: all of it.
      api.daily(lastWeek, undefined, sameDay(day, now) ? hhmm(now) : undefined),
      api.exceptions(weekAgo, isoDay(now)),
      api.listShifts({ from: isoDay(now), to: isoDay(now) }),
      api.getQueue(),
      api.listWashes(),
      api.listWallets(),
      api.stale(),
    ]);
    if (d.status === 'fulfilled') setDaily(d.value);
    if (c.status === 'fulfilled') setCompare(c.value);
    if (e.status === 'fulfilled' && Array.isArray(e.value)) setExceptions(e.value);
    if (sh.status === 'fulfilled' && Array.isArray(sh.value)) setShifts(sh.value);
    if (q.status === 'fulfilled') setQueue(q.value);
    if (r.status === 'fulfilled' && Array.isArray(r.value)) setRecent(r.value.slice(0, 6));
    // Cash held comes from the worker wallets — the same figures Cash
    // Handover uses, so the two screens never disagree.
    if (wl.status === 'fulfilled') setWallets(wl.value?.staff || []);
    if (st.status === 'fulfilled' && st.value) {
      setStale({ ready: (st.value.stale_ready || []).length, washing: (st.value.long_in_progress || []).length });
    }
    setUpdatedAt(new Date());
  }, [day]);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const top = (
    <AppTopBar context={actor?.branch_name || 'Your branch'} onMenu={() => navigation.openDrawer?.()} />
  );

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {top}
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} /></ScrollView>
      </SafeAreaView>
    );
  }

  const summary = daily?.summary || {};
  const gross = Number(summary.gross_ugx || 0);
  const cars = Number(summary.settled_washes || 0);
  const avg = cars > 0 ? Math.round(gross / cars) : 0;
  const before = Number(compare?.summary?.gross_ugx || 0);
  const change = before > 0 ? Math.round(((gross - before) / before) * 100) : null;
  const weekday = addDays(day, -7).toLocaleDateString(undefined, { weekday: 'short' });
  const compareText = change == null
    ? (isToday ? `Nothing yet last ${weekday} by this time` : `Nothing on the same day last week`)
    : `${change === 0 ? 'Same as' : `${Math.abs(change)}% ${change > 0 ? 'up on' : 'down on'}`} last ${weekday}${isToday ? ', same time' : ''}`;
  const changeTone = change == null || change === 0 ? staffText.muted : change > 0 ? colors.successText : colors.errorText;
  // Light tints that stay readable on the violet → navy card.
  const changeOnBrand = change == null || change === 0 ? 'rgba(255,255,255,0.85)' : change > 0 ? '#A7F3D0' : '#FECACA';

  const working = shifts.filter((s: any) => s.status === 'open');
  const onCar = new Map<string, any>();
  (queue?.washing || []).forEach((w: any) => onCar.set(w.started_by_worker_id, w));
  const inProgress = (queue?.washing || []).length + (queue?.ready || []).length;
  const heldBy = new Map<string, number>(wallets.map((w: any) => [w.staff_id, Number(w.owes_ugx || 0)]));
  const owed = wallets.reduce((t: number, w: any) => t + Number(w.owes_ugx || 0), 0);
  const owing = wallets.filter((w: any) => Number(w.owes_ugx) > 0).length;
  const staleTotal = stale.ready + stale.washing;
  const unverified = exceptions.filter((e: any) => e.exception_type === 'unverified').length;
  const disputes = exceptions.filter((e: any) => e.exception_type === 'dispute').length;

  const attention = [
    owed > 0 && {
      key: 'cash', tone: 'warning' as Tone, icon: 'hand-holding-usd',
      title: `UGX ${ugx(owed)} to collect`,
      sub: `${owing} ${owing === 1 ? 'worker is' : 'workers are'} holding cash`,
      go: 'Cash Handover',
    },
    staleTotal > 0 && {
      key: 'stale', tone: 'error' as Tone, icon: 'hourglass-half',
      title: `${staleTotal} ${staleTotal === 1 ? 'car' : 'cars'} waiting too long`,
      sub: [stale.ready ? `${stale.ready} ready, not collected` : null, stale.washing ? `${stale.washing} still washing` : null].filter(Boolean).join(' · '),
      go: 'Stale Alerts',
    },
    (unverified + disputes) > 0 && {
      key: 'review', tone: 'info' as Tone, icon: 'clipboard-check',
      title: `${(unverified + disputes).toLocaleString()} to review this week`,
      sub: [unverified ? `${unverified.toLocaleString()} unverified payments` : null, disputes ? `${disputes} disputes` : null].filter(Boolean).join(' · '),
      go: 'Exceptions',
    },
  ].filter(Boolean) as { key: string; tone: Tone; icon: string; title: string; sub: string; go: string }[];

  const tiles = isToday
    ? [
      { label: 'Cars washed', value: cars.toLocaleString(), go: 'Daily Report', icon: 'car', tone: 'primary' as Tone },
      { label: 'Avg per car', value: `UGX ${ugx(avg)}`, go: 'Daily Report', icon: 'coins', tone: 'success' as Tone },
      { label: 'In progress', value: inProgress.toLocaleString(), go: 'Stale Alerts', icon: 'soap', tone: 'warning' as Tone },
      { label: 'On shift', value: working.length.toLocaleString(), go: 'Performance', icon: 'user-clock', tone: 'info' as Tone },
    ]
    : [
      { label: 'Cars washed', value: cars.toLocaleString(), go: 'Daily Report', icon: 'car', tone: 'primary' as Tone },
      { label: 'Avg per car', value: `UGX ${ugx(avg)}`, go: 'Daily Report', icon: 'coins', tone: 'success' as Tone },
      { label: 'Free washes', value: Number(summary.redemption_count || 0).toLocaleString(), go: 'Daily Report', icon: 'gift', tone: 'accent' as Tone },
      { label: 'Cancelled', value: Number(summary.cancelled_washes || 0).toLocaleString(), go: 'Cancellations', icon: 'times-circle', tone: 'error' as Tone },
    ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {top}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Date bar ── */}
        <View style={styles.dateBar}>
          <TouchableOpacity onPress={() => setDay(addDays(day, -1))} style={styles.dateBtn} accessibilityLabel="Previous day">
            <Icon name="chevron-left" size={18} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.dateTitle}>{isToday ? 'Today' : day.toLocaleDateString(undefined, { weekday: 'long' })}</Text>
            <Text style={styles.dateSub}>{day.toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</Text>
          </View>
          <TouchableOpacity
            onPress={() => !isToday && setDay(addDays(day, 1))}
            style={[styles.dateBtn, isToday && styles.dateBtnOff]}
            disabled={isToday}
            accessibilityLabel="Next day"
          >
            <Icon name="chevron-right" size={18} color={isToday ? staffText.muted : colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Takings + fair comparison ── */}
        {/* TRIAL: the app's main violet → navy gradient (the buttons and the
            menu's active item), white type on it. */}
        <CssGradient colors={colors.gradientButton} locations={[0.05, 0.75]} angle={100} style={styles.takingsBrand}>
          <Text style={styles.captionOnBrand}>Takings</Text>
          <Text style={styles.heroOnBrand}>UGX {ugx(gross)}</Text>
          <View style={styles.trendRow}>
            {change != null && change !== 0 ? (
              <Icon name={change > 0 ? 'arrow-up' : 'arrow-down'} size={14} color={changeOnBrand} />
            ) : null}
            <Text style={[styles.trend, { color: changeOnBrand }]}>{compareText}</Text>
          </View>
        </CssGradient>

        {/* ── Tiles ── */}
        <View style={styles.tiles}>
          {tiles.map((t) => (
            <TouchableOpacity key={t.label} style={styles.tile} activeOpacity={0.75} onPress={() => navigation.navigate(t.go)}>
              <View style={styles.tileHead}>
                <View style={[styles.tileIcon, { backgroundColor: toneMap[t.tone].bg }]}>
                  <Icon name={t.icon} size={14} color={toneMap[t.tone].fg} />
                </View>
                <Text style={styles.tileLabel}>{t.label}</Text>
              </View>
              <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>{t.value}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isToday ? (
          <>
            {/* ── Needs attention ── */}
            <View>
              <SectionHeader title="Needs attention" />
              <View style={{ gap: spacing.sm }}>
                {attention.length === 0 ? (
                  <View style={styles.row}>
                    <View style={[styles.rowIcon, { backgroundColor: colors.successSoft }]}>
                      <Icon name="check" size={17} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>All clear</Text>
                      <Text style={styles.rowSub}>No cash to collect, no cars waiting, nothing to review</Text>
                    </View>
                  </View>
                ) : attention.map((a) => (
                  <TouchableOpacity key={a.key} style={styles.row} activeOpacity={0.75} onPress={() => navigation.navigate(a.go)}>
                    <View style={[styles.rowIcon, { backgroundColor: toneMap[a.tone].bg }]}>
                      <Icon name={a.icon} size={17} color={toneMap[a.tone].fg} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowTitle, { color: toneMap[a.tone].text }]}>{a.title}</Text>
                      {a.sub ? <Text style={styles.rowSub}>{a.sub}</Text> : null}
                    </View>
                    <Icon name="chevron-right" size={15} color={staffText.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Who's working ── */}
            <View>
              <SectionHeader title="Who's working" count={working.length} />
              {working.length === 0 ? (
                <Text style={styles.none}>Nobody yet — workers appear once they open the app for the day.</Text>
              ) : (
                <Surface elevation="sm" padded="sm" style={styles.listCard}>
                  {working.map((s: any, i: number) => {
                    const car = onCar.get(s.worker_id);
                    const held = heldBy.get(s.worker_id) || 0;
                    return (
                      <View key={s.id} style={[styles.person, i < working.length - 1 && styles.divider]}>
                        <View>
                          <Avatar name={s.worker_name} size={40} />
                          <View style={[styles.dot, { backgroundColor: car ? colors.warning : colors.success }]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personName} numberOfLines={1}>{s.worker_name}</Text>
                          <Text style={styles.personStatus} numberOfLines={1}>
                            {car ? `On a car · ${car.vehicle_class_name}` : 'Free'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.held, held === 0 && { color: staffText.muted }]}>
                            {held > 0 ? `UGX ${ugx(held)}` : '—'}
                          </Text>
                          <Text style={styles.heldLabel}>cash held</Text>
                        </View>
                      </View>
                    );
                  })}
                </Surface>
              )}
            </View>

            {/* ── Recent activity ── */}
            <View>
              <SectionHeader title="Recent activity" action="All washes" onAction={() => navigation.navigate('Daily Report')} />
              {recent.length === 0 ? (
                <Text style={styles.none}>Washes show up here as they happen.</Text>
              ) : (
                <Surface elevation="sm" padded="sm" style={styles.listCard}>
                  {recent.map((w: any, i: number) => {
                    const m = STATUS_META[w.status] || { tone: 'neutral' as Tone, label: w.status, icon: 'circle' };
                    const who = w.started_by_name === w.settled_by_name || !w.settled_by_name
                      ? w.started_by_name
                      : `${w.started_by_name} → ${w.settled_by_name}`;
                    return (
                      <View key={w.id} style={[styles.person, i < recent.length - 1 && styles.divider]}>
                        <View style={[styles.rowIcon, { backgroundColor: toneMap[m.tone].bg }]}>
                          <Icon name={m.icon} size={16} color={toneMap[m.tone].fg} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.personName} numberOfLines={1}>{w.vehicle_class_name} · {w.service_name}</Text>
                          <Text style={styles.personStatus} numberOfLines={1}>
                            {[who, timeAgo(w.started_at)].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.held}>{w.is_redemption ? 'Free' : `UGX ${ugx(w.amount_ugx || w.quoted_amount_ugx)}`}</Text>
                          <Text style={[styles.statusWord, { color: toneMap[m.tone].text }]}>{m.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </Surface>
              )}
            </View>
          </>
        ) : null}

        {updatedAt ? (
          <Text style={styles.updated}>Updated {updatedAt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · pull down to refresh</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  dateBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgCard, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight,
    padding: spacing.xs,
  },
  dateBtn: { width: 44, height: 44, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  dateBtnOff: { opacity: 0.5 },
  dateTitle: { ...staffType.label },
  dateSub: { ...staffType.meta },

  caption: { ...staffType.caption, color: staffText.secondary },
  hero: { ...staffType.hero },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  trend: { ...staffType.meta, fontWeight: weight.semibold },

  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '48%', flexGrow: 1,
    backgroundColor: colors.bgCard, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight,
    padding: spacing.md, minHeight: 76, justifyContent: 'space-between',
  },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tileIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { ...staffType.meta, color: staffText.secondary },
  takingsBrand: { borderRadius: radii.xl, padding: spacing.lg, gap: 2, overflow: 'hidden' },
  captionOnBrand: { ...staffType.caption, color: 'rgba(255,255,255,0.85)' },
  heroOnBrand: { ...staffType.hero, color: '#fff' },
  takingsOuter: {
    borderRadius: radii.xl, borderWidth: 1, borderColor: colors.promoBannerBorder, overflow: 'hidden',
  },
  takings: { padding: spacing.lg, gap: 2 },
  tileValue: { ...staffType.figure },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight,
    padding: spacing.md, minHeight: 56,
  },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { ...staffType.rowTitle, ...staffType.tabular },
  rowSub: { ...staffType.meta, marginTop: 1 },

  none: { ...staffType.secondary },
  listCard: { paddingHorizontal: spacing.md },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  dot: {
    position: 'absolute', bottom: -1, right: -1,
    width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.bgCard,
  },
  personName: { ...staffType.rowTitle, fontSize: 16 },
  personStatus: { ...staffType.meta, marginTop: 1 },
  held: { ...staffType.label, ...staffType.tabular, fontWeight: weight.bold },
  heldLabel: { ...staffType.caption, fontWeight: weight.regular },
  statusWord: { ...staffType.caption },

  updated: { ...staffType.meta, textAlign: 'center' },
});
