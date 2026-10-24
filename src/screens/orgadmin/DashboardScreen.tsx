import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, orgBg } from '../../theme';
import Icon from '../../components/Icon';
import AppTopBar from '../../components/AppTopBar';
import GradientButton from '../../components/GradientButton';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, TrendChart, RankedBars,
  HeroCard, useHeroText, NoticeRow, StatGrid, Avatar,
} from '../../components/ui';
import type { RankedItem } from '../../components/ui';

const TREND_DAYS = 14;

function today() { return new Date().toISOString().slice(0, 10); }
function weekAgo() { return new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10); }
/** Local date as YYYY-MM-DD, and the time as HH:MM, for the fair comparison. */
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

const compact = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${Math.round(n)}`;
};

/** Cash out for longer than a day is the number the owner actually worries about. */
const OVERDUE_HOURS = 24;

/** The admin screens this dashboard hands off to — all existing drawer routes. */
const MANAGE: { route: string; label: string; icon: string }[] = [
  { route: 'Branches', label: 'Branches', icon: 'building' },
  { route: 'Staff', label: 'Staff', icon: 'users' },
  { route: 'Prices', label: 'Prices', icon: 'tags' },
  { route: 'Catalogue', label: 'Catalogue', icon: 'th-large' },
  { route: 'Points Settings', label: 'Points', icon: 'star-half-alt' },
  { route: 'Customers', label: 'Customers', icon: 'address-book' },
];

/**
 * The org admin's front page, in two halves:
 *
 *  - How the business is doing: today's takings across every branch, the
 *    two things that need a decision (cash held too long, exceptions), the
 *    two-week trend, and how the branches compare.
 *  - Where to go to change something: a short grid into the management
 *    screens, so the summary is not the only way in from a long menu.
 */
export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const ht: any = useHeroText();
  const { actor } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [cash, setCash] = useState<{ holding: any[]; collected_today: any[] }>({ holding: [], collected_today: [] });
  const [lastWeek, setLastWeek] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const now = new Date();
    const [b, e, t, c, lw] = await Promise.allSettled([
      api.branches(weekAgo(), today()),
      api.exceptions(weekAgo(), today()),
      api.trend(TREND_DAYS),
      api.cashPosition(),
      // Today so far against the same weekday last week UP TO THE SAME TIME
      // (Toast "same time", DRB "period to date") — not against all of
      // yesterday, which made every morning look like a slump.
      api.daily(isoLocal(new Date(now.getTime() - 7 * 86400000)), undefined, hhmm(now)),
    ]);
    if (lw.status === 'fulfilled') setLastWeek(lw.value);
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

  const topBar = (
    <AppTopBar context={actor?.org_name || 'Your business'} onMenu={() => navigation.openDrawer?.()} />
  );

  if (!loaded) {
    return (
      <SafeAreaView style={[styles.container, orgBg()]} edges={['top']}>
        {topBar}
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} /></ScrollView>
      </SafeAreaView>
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
  const todayGross = Number(todayRow?.gross_ugx || 0);
  const lastWeekGross = Number(lastWeek?.summary?.gross_ugx || 0);
  const delta = lastWeekGross > 0 ? Math.round(((todayGross - lastWeekGross) / lastWeekGross) * 100) : null;
  const lastWeekday = new Date(Date.now() - 7 * 86400000).toLocaleDateString(undefined, { weekday: 'short' });

  const heldTotal = cash.holding.reduce((s, h) => s + Number(h.held_ugx || 0), 0);
  const overdue = cash.holding.filter(
    (h) => Number(h.hours_held || 0) >= OVERDUE_HOURS && Number(h.held_ugx || 0) > 0
  );
  const collectedToday = cash.collected_today.reduce((s, r) => s + Number(r.collected_ugx || 0), 0);

  // Only what needs a decision counts as "to review": unverified payments
  // and disputes. Cancellations and handovers are records, not to-dos.
  const unverified = exceptions.filter((x: any) => x.exception_type === 'unverified').length;
  const disputes = exceptions.filter((x: any) => x.exception_type === 'dispute').length;
  const toReview = unverified + disputes;
  const clean = toReview === 0;
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
    <SafeAreaView style={[styles.container, orgBg()]} edges={['top']}>
      {topBar}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Today, across every branch ── */}
        <HeroCard
          label="Money taken today · all branches"
          prefix="UGX"
          value={todayGross.toLocaleString()}
          caption={delta !== null ? (
            <View style={styles.deltaRow}>
              {delta !== 0 ? (
                <Icon name={delta > 0 ? 'arrow-up' : 'arrow-down'} size={13} color={delta > 0 ? (ht.up?.color ?? colors.successText) : (ht.down?.color ?? colors.errorText)} />
              ) : null}
              <Text style={[ht.strong, delta > 0 ? ht.up ?? { color: colors.successText } : delta < 0 ? ht.down ?? { color: colors.errorText } : null]}>
                {delta === 0 ? 'Same as' : `${Math.abs(delta)}% ${delta > 0 ? 'up on' : 'down on'}`}
              </Text>
              <Text style={ht.muted}>last {lastWeekday}, same time</Text>
            </View>
          ) : (
            <Text style={ht.muted}>Nothing yet last {lastWeekday} by this time</Text>
          )}
          stats={[
            { label: 'Washes', value: String(todayRow?.washes ?? 0) },
            { label: 'Free washes', value: String(todayRow?.free_washes ?? 0) },
            { label: 'Branches active', value: `${activeBranches}/${branches.length}` },
          ]}
        />

        {/* ── What needs a decision ── */}
        <View>
          <SectionHeader title="Needs attention" />
          <View style={{ gap: spacing.sm }}>
            <NoticeRow
              tone={overdue.length > 0 ? 'error' : heldTotal > 0 ? 'warning' : 'success'}
              icon={overdue.length > 0 ? 'exclamation-triangle' : heldTotal > 0 ? 'hourglass-half' : 'check'}
              title={heldTotal > 0 ? `UGX ${heldTotal.toLocaleString()} still with workers` : 'All cash collected'}
              subtitle={collectedToday > 0
                ? `UGX ${collectedToday.toLocaleString()} handed in today`
                : 'Nothing handed in yet today'}
              onPress={() => navigation.navigate('Cash Handover')}
            />

            {/* Overdue is the exception worth naming, not just counting. */}
            {overdue.length > 0 && (
              <Surface elevation="xs" padded="sm" style={styles.overdueCard}>
                <Text style={styles.overdueTitle}>
                  {overdue.length === 1 ? '1 worker has' : `${overdue.length} workers have`} held cash over 24 hours
                </Text>
                {overdue.slice(0, 3).map((h: any, i: number) => (
                  <View key={h.id} style={[styles.overdueRow, i < Math.min(overdue.length, 3) - 1 && styles.rowBorder]}>
                    <Avatar name={h.worker_name} size={30} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.overdueName} numberOfLines={1}>{h.worker_name}</Text>
                      <Text style={styles.overdueMeta} numberOfLines={1}>
                        {h.branch_code} · {Math.floor(Number(h.hours_held) / 24)} day{Math.floor(Number(h.hours_held) / 24) === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <Text style={styles.overdueAmount}>UGX {Number(h.held_ugx).toLocaleString()}</Text>
                  </View>
                ))}
                {overdue.length > 3 && (
                  <Text style={styles.overdueMore}>+{overdue.length - 3} more in Cash Handover</Text>
                )}
              </Surface>
            )}

            <NoticeRow
              tone={clean ? 'success' : 'info'}
              icon={clean ? 'check' : 'clipboard-check'}
              title={clean ? 'Nothing to review this week' : `${toReview.toLocaleString()} to review this week`}
              subtitle={clean
                ? 'No unverified payments or disputes'
                : [unverified ? `${unverified.toLocaleString()} unverified payments` : null, disputes ? `${disputes} disputes` : null].filter(Boolean).join(' · ')}
              onPress={() => navigation.navigate('Exceptions')}
            />
          </View>
        </View>

        {/* ── Direction of travel ── */}
        <View>
          <SectionHeader title={`Last ${TREND_DAYS} days`} />
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
            action={quietBranches > 0 ? `${quietBranches} quiet` : undefined}
          />
          {branches.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState
                icon="building"
                title="No branches yet"
                message="Add your first branch to start tracking washes."
                action={<GradientButton title="Add a branch" icon="plus" onPress={() => navigation.navigate('Branches')} full />}
              />
            </Surface>
          ) : (
            <Surface elevation="sm" padded="lg">
              <RankedBars items={branchItems} valuePrefix="UGX " />
            </Surface>
          )}
        </View>

        {/* ── Week roll-up, in words rather than another chart ── */}
        <View>
          <SectionHeader title="This week" />
          <Surface elevation="sm" padded="lg">
            <StatGrid
              items={[
                { label: 'Washes', value: totals.washes.toLocaleString() },
                { label: 'Taken (UGX)', value: compact(totals.gross) },
                {
                  label: 'Cash gap (UGX)',
                  value: `${totals.variance > 0 ? '+' : ''}${compact(totals.variance)}`,
                  tone: totals.variance < 0 ? 'error' : totals.variance > 0 ? 'warning' : 'success',
                },
              ]}
            />
          </Surface>
        </View>

        {/* ── Where to change things ── */}
        <View>
          <SectionHeader title="Manage" />
          <View style={styles.manageGrid}>
            {MANAGE.map((m) => (
              <TouchableOpacity
                key={m.route}
                style={styles.manageTile}
                onPress={() => navigation.navigate(m.route)}
                activeOpacity={0.75}
                accessibilityRole="button"
              >
                <View style={styles.manageIcon}><Icon name={m.icon} size={18} color={colors.primary} /></View>
                <Text style={styles.manageLabel} numberOfLines={1}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl },

  deltaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },

  overdueCard: { paddingHorizontal: spacing.md, gap: 2 },
  overdueTitle: { fontSize: font.sm, fontWeight: weight.bold, color: colors.errorText, paddingTop: spacing.xs, paddingBottom: spacing.xs },
  overdueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm + 2 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  overdueName: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  overdueMeta: { fontSize: font.sm, color: colors.textMuted },
  overdueAmount: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text },
  overdueMore: { fontSize: font.sm, color: colors.textMuted, fontWeight: weight.semibold, paddingVertical: spacing.xs },

  // Three across on any phone: the tiles size to a third of the row.
  manageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  manageTile: {
    flexGrow: 1,
    flexBasis: '30%',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  manageIcon: {
    width: 38, height: 38, borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  manageLabel: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
});
