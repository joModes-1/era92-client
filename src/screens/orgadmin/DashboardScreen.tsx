import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader from '../../components/ScreenHeader';
import {
  Surface, SectionHeader, EmptyState, SkeletonList,
  TrendChart, RankedBars, initials,
} from '../../components/ui';
import type { RankedItem } from '../../components/ui';

const TREND_DAYS = 14;

function today() { return new Date().toISOString().slice(0, 10); }
function weekAgo() { return new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10); }

const compact = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${Math.round(n)}`;
};

/** Cash out for longer than a day is the number the owner actually worries about. */
const OVERDUE_HOURS = 24;

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [branches, setBranches] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [cash, setCash] = useState<{ holding: any[]; collected_today: any[] }>({ holding: [], collected_today: [] });
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [b, e, t, c] = await Promise.allSettled([
      api.branches(weekAgo(), today()),
      api.exceptions(weekAgo(), today()),
      api.trend(TREND_DAYS),
      api.cashPosition(),
    ]);
    if (b.status === 'fulfilled' && Array.isArray(b.value)) setBranches(b.value);
    if (e.status === 'fulfilled' && Array.isArray(e.value)) setExceptions(e.value);
    if (t.status === 'fulfilled' && Array.isArray(t.value)) setTrend(t.value);
    if (c.status === 'fulfilled' && c.value) {
      setCash({ holding: c.value.holding || [], collected_today: c.value.collected_today || [] });
    }
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Home" subtitle="Your whole business" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} /></ScrollView>
      </View>
    );
  }

  // ── Roll-ups ────────────────────────────────────────────────
  const totals = branches.reduce(
    (acc, b) => ({
      washes: acc.washes + Number(b.washes || 0),
      gross: acc.gross + Number(b.gross_ugx || 0),
      variance: acc.variance + Number(b.total_variance || 0),
    }),
    { washes: 0, gross: 0, variance: 0 }
  );

  const todayRow = trend[trend.length - 1];
  const yesterdayRow = trend[trend.length - 2];
  const todayGross = Number(todayRow?.gross_ugx || 0);
  const yesterdayGross = Number(yesterdayRow?.gross_ugx || 0);
  const delta = yesterdayGross > 0 ? Math.round(((todayGross - yesterdayGross) / yesterdayGross) * 100) : null;

  const heldTotal = cash.holding.reduce((s, h) => s + Number(h.held_ugx || 0), 0);
  const overdue = cash.holding.filter(
    (h) => Number(h.hours_held || 0) >= OVERDUE_HOURS && Number(h.held_ugx || 0) > 0
  );
  const collectedToday = cash.collected_today.reduce((s, r) => s + Number(r.collected_ugx || 0), 0);

  const clean = exceptions.length === 0;
  const activeBranches = branches.filter((b: any) => Number(b.washes || 0) > 0).length;
  const quietBranches = branches.length - activeBranches;

  const trendPoints = trend.map((r: any) => ({ day: r.day, value: Number(r.gross_ugx || 0) }));

  const branchItems: RankedItem[] = branches.map((b: any) => ({
    key: b.branch_id || b.code,
    label: b.branch_name,
    value: Number(b.gross_ugx || 0),
    meta:
      Number(b.washes || 0) > 0
        ? `${b.washes} washes · avg ${Number(b.avg_ticket || 0).toLocaleString()} · ${b.staff_count} staff`
        : `No washes this week · ${b.staff_count} staff`,
  }));

  return (
    <View style={styles.container}>
      <ScreenHeader title="Home" subtitle="Your whole business" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Today, across every branch ─────────────────────────
            Same pink-to-orange brand gradient as the manager's Home hero and
            the header bar — gradientBrandDeep (a flat dark pink, closer to
            the sysadmin's near-black treatment) read as a different color
            entirely rather than "the app's pink". */}
        <LinearGradient
          colors={[colors.pink[600], colors.primary, colors.accent]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBloom} pointerEvents="none" />
          <Text style={styles.heroLabel}>MONEY TAKEN TODAY</Text>
          <View style={styles.heroFigureRow}>
            <Text style={styles.heroFigure} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {todayGross.toLocaleString()}
            </Text>
            <Text style={styles.heroCurrency}>UGX</Text>
          </View>

          {delta !== null && (
            <View style={styles.deltaRow}>
              <Icon name={delta >= 0 ? 'arrow-up' : 'arrow-down'} size={9} color="rgba(255,255,255,0.95)" />
              <Text style={styles.deltaText}>
                {Math.abs(delta)}% {delta >= 0 ? 'up on' : 'down on'} yesterday
              </Text>
            </View>
          )}

          <View style={styles.heroStats}>
            <HeroStat label="Washes" value={String(todayRow?.washes ?? 0)} />
            <View style={styles.heroDivide} />
            <HeroStat label="Free washes" value={String(todayRow?.free_washes ?? 0)} />
            <View style={styles.heroDivide} />
            <HeroStat label="Branches" value={`${activeBranches}/${branches.length}`} />
          </View>
        </LinearGradient>

        {/* ── Money still out there ──────────────────────────── */}
        <Surface
          elevation="sm"
          onPress={() => navigation.navigate('Cash Handover')}
          style={styles.cashCard}
        >
          <View style={styles.cashHead}>
            <View
              style={[
                styles.cashIcon,
                { backgroundColor: overdue.length > 0 ? colors.errorSoft : heldTotal > 0 ? colors.warningSoft : colors.successSoft },
              ]}
            >
              <Icon
                name={overdue.length > 0 ? 'exclamation-triangle' : heldTotal > 0 ? 'hourglass-half' : 'check'}
                size={13}
                color={overdue.length > 0 ? colors.error : heldTotal > 0 ? colors.warning : colors.success}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cashTitle}>
                {heldTotal > 0 ? `UGX ${heldTotal.toLocaleString()} still with workers` : 'All cash collected'}
              </Text>
              <Text style={styles.cashSub}>
                {collectedToday > 0
                  ? `UGX ${collectedToday.toLocaleString()} handed in today`
                  : 'Nothing handed in yet today'}
              </Text>
            </View>
            <Icon name="chevron-right" size={11} color={colors.ink[300]} />
          </View>

          {/* Overdue is the exception worth naming, not just counting. */}
          {overdue.length > 0 && (
            <View style={styles.overdueBox}>
              <Text style={styles.overdueTitle}>
                {overdue.length === 1 ? '1 worker has' : `${overdue.length} workers have`} held cash over 24 hours
              </Text>
              {overdue.slice(0, 3).map((h: any) => (
                <View key={h.id} style={styles.overdueRow}>
                  <View style={styles.overdueAvatar}>
                    <Text style={styles.overdueAvatarText}>{initials(h.worker_name)}</Text>
                  </View>
                  <Text style={styles.overdueName} numberOfLines={1}>{h.worker_name}</Text>
                  <Text style={styles.overdueBranch} numberOfLines={1}>{h.branch_code}</Text>
                  <Text style={styles.overdueDays}>
                    {Math.floor(Number(h.hours_held) / 24)}d
                  </Text>
                  <Text style={styles.overdueAmount}>{Number(h.held_ugx).toLocaleString()}</Text>
                </View>
              ))}
              {overdue.length > 3 && (
                <Text style={styles.overdueMore}>+{overdue.length - 3} more</Text>
              )}
            </View>
          )}
        </Surface>

        {/* ── Direction of travel ────────────────────────────── */}
        <View>
          <SectionHeader title={`Last ${TREND_DAYS} days`} icon="chart-line" />
          <Surface elevation="sm" padded="lg">
            <TrendChart
              points={trendPoints}
              valuePrefix="UGX "
              emptyLabel="No money taken in the last two weeks."
            />
          </Surface>
        </View>

        {/* ── Branch comparison — every branch, including the quiet ones ── */}
        <View>
          <SectionHeader
            title="Branches this week"
            count={branches.length}
            icon="building"
            action={quietBranches > 0 ? `${quietBranches} quiet` : undefined}
          />
          {branches.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState
                icon="building"
                title="No branches yet"
                message="Add your first branch to start tracking washes."
                action={
                  <TouchableOpacity onPress={() => navigation.navigate('Branches')} style={styles.emptyBtn} activeOpacity={0.8}>
                    <Icon name="plus" size={10} color="#fff" />
                    <Text style={styles.emptyBtnText}>Add a branch</Text>
                  </TouchableOpacity>
                }
              />
            </Surface>
          ) : (
            <Surface elevation="sm" padded="lg">
              <RankedBars items={branchItems} valuePrefix="UGX " />
            </Surface>
          )}
        </View>

        {/* ── What needs a decision ──────────────────────────── */}
        <Surface
          elevation="sm"
          tone={clean ? colors.successSoft : colors.errorSoft}
          borderless
          onPress={() => navigation.navigate('Exceptions')}
          style={styles.alert}
        >
          <View style={[styles.alertIcon, { backgroundColor: clean ? colors.success : colors.error }]}>
            <Icon name={clean ? 'check' : 'exclamation'} size={13} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.alertTitle, { color: clean ? colors.success : colors.error }]}>
              {clean
                ? 'No exceptions this week'
                : `${exceptions.length} exception${exceptions.length === 1 ? '' : 's'} need attention`}
            </Text>
            <Text style={styles.alertSub}>
              {clean ? 'Everything looks clean' : 'Disputes, unverified takings and cancellations'}
            </Text>
          </View>
          <Icon name="chevron-right" size={11} color={clean ? colors.success : colors.error} />
        </Surface>

        {/* ── Week roll-up, in words rather than another chart ── */}
        <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
          <Text style={styles.weekTitle}>This week</Text>
          <View style={styles.weekGrid}>
            <WeekStat label="Washes" value={String(totals.washes)} />
            <WeekStat label="Taken" value={`${compact(totals.gross)}`} />
            <WeekStat
              label="Cash gap"
              value={`${totals.variance > 0 ? '+' : ''}${compact(totals.variance)}`}
              tone={totals.variance < 0 ? colors.error : totals.variance > 0 ? colors.warning : colors.success}
            />
          </View>
        </Surface>
      </ScrollView>
    </View>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.heroStatLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function WeekStat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.weekStat}>
      <Text style={[styles.weekValue, tone ? { color: tone } : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={styles.weekLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  hero: { borderRadius: radii.lg, padding: spacing.lg, gap: 2, overflow: 'hidden' },
  heroBloom: {
    position: 'absolute', top: -90, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroLabel: {
    fontSize: font.micro, fontWeight: weight.heavy,
    color: 'rgba(255,255,255,0.72)', letterSpacing: tracking.capsWide,
  },
  heroFigureRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroFigure: {
    flexShrink: 1, fontSize: font.display, fontWeight: weight.black,
    color: '#fff', letterSpacing: tracking.display,
  },
  heroCurrency: { fontSize: font.sm, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.7)' },
  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  deltaText: { fontSize: font.xs, fontWeight: weight.bold, color: 'rgba(255,255,255,0.95)' },

  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.22)',
  },
  heroStat: { flex: 1, gap: 1 },
  heroStatValue: { fontSize: font.regular, fontWeight: weight.black, color: '#fff' },
  heroStatLabel: { fontSize: font.micro, color: 'rgba(255,255,255,0.7)', fontWeight: weight.semibold },
  heroDivide: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: 'rgba(255,255,255,0.22)' },

  cashCard: { gap: spacing.md },
  cashHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cashIcon: {
    width: 34, height: 34, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  cashTitle: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  cashSub: { fontSize: font.xs, color: colors.textMuted, marginTop: 1 },

  overdueBox: {
    backgroundColor: colors.errorSoft, borderRadius: radii.md,
    padding: spacing.md, gap: 7,
  },
  overdueTitle: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.error },
  overdueRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  overdueAvatar: {
    width: 22, height: 22, borderRadius: radii.full, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  overdueAvatarText: { fontSize: 9, fontWeight: weight.black, color: colors.error },
  overdueName: { flex: 1, fontSize: font.xs, fontWeight: weight.bold, color: colors.text },
  overdueBranch: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted },
  overdueDays: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.error, width: 24, textAlign: 'right' },
  overdueAmount: { fontSize: font.xs, fontWeight: weight.black, color: colors.text, minWidth: 54, textAlign: 'right' },
  overdueMore: { fontSize: font.micro, color: colors.error, fontWeight: weight.semibold },

  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  alertIcon: {
    width: 32, height: 32, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  alertTitle: { fontSize: font.regular, fontWeight: weight.heavy, letterSpacing: tracking.tight },
  alertSub: { fontSize: font.xs, color: colors.textSecondary, marginTop: 1 },

  weekTitle: {
    fontSize: font.micro, fontWeight: weight.heavy,
    color: colors.textMuted, letterSpacing: tracking.capsWide,
  },
  weekGrid: { flexDirection: 'row', gap: spacing.md },
  weekStat: { flex: 1, gap: 1 },
  weekValue: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  weekLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: weight.semibold },

  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary, borderRadius: radii.full,
    paddingVertical: 9, paddingHorizontal: 16,
  },
  emptyBtnText: { fontSize: font.sm, fontWeight: weight.heavy, color: '#fff' },
});
