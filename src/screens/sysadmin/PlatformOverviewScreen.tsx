import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight } from '../../theme';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';
import AppTopBar from '../../components/AppTopBar';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, TrendChart, RankedBars, ListRow,
  HeroCard, NoticeRow, StatGrid, MonthBars, Hint,
} from '../../components/ui';
import type { RankedItem } from '../../components/ui';

const ugx = (n: any) => Number(n || 0).toLocaleString();

const compact = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${Math.round(n)}`;
};

const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  return new Date(Number(y), Number(mm) - 1, 1).toLocaleDateString(undefined, { month: 'short' });
};

function daysSince(iso: string | null) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

/**
 * The platform admin's front page, top to bottom by how often each part
 * changes what they do next:
 *
 *  1. What the platform earns (MRR) and its paying / trial / overdue split.
 *  2. Anything wanting a decision — billing to chase, problem reports.
 *  3. Live activity across every tenant, and the two-week trend.
 *  4. Which tenants carry the platform, and which have gone quiet.
 *  5. Growth and overall size — the slow-moving context.
 */
export default function PlatformOverviewScreen() {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    // Two sources: how the platform is being used, and what it earns. Neither
    // alone answers "how are we doing".
    const [s, b] = await Promise.allSettled([api.platformStats(), api.billingSummary()]);
    if (s.status === 'fulfilled' && s.value) setStats(s.value);
    if (b.status === 'fulfilled' && b.value) setBilling(b.value);
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const topBar = <AppTopBar context="Platform · all organisations" onMenu={() => navigation.openDrawer?.()} />;

  if (!loaded) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {topBar}
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={5} /></ScrollView>
      </SafeAreaView>
    );
  }

  if (!stats) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {topBar}
        <ScrollView contentContainerStyle={styles.body}>
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="chart-pie" title="No platform data" message="Statistics appear once organisations are active." />
          </Surface>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const bs = billing?.summary || {};
  const grossMonth = Number(stats.gross_this_month || 0);
  const grossLast = Number(stats.gross_last_month || 0);
  // Compare like with like: this month is partial, so measure it against the
  // same number of days last month rather than a full month it cannot match.
  const dayOfMonth = new Date().getDate();
  const daysLastMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate();
  const lastMonthToDate = grossLast * Math.min(1, dayOfMonth / daysLastMonth);
  const delta = lastMonthToDate > 0 ? Math.round(((grossMonth - lastMonthToDate) / lastMonthToDate) * 100) : null;

  const trendPoints = (stats.trend || []).map((r: any) => ({ day: r.day, value: Number(r.gross_ugx || 0) }));

  const orgItems: RankedItem[] = (stats.top_orgs || []).map((o: any) => ({
    key: o.id,
    label: o.name,
    value: Number(o.gross_ugx || 0),
    meta:
      Number(o.washes || 0) > 0
        ? `${o.washes} washes · ${o.branch_count} branch${Number(o.branch_count) === 1 ? '' : 'es'}`
        : `No washes this month · ${o.branch_count} branch${Number(o.branch_count) === 1 ? '' : 'es'}`,
  }));

  const attention = billing?.needs_attention || [];
  const quiet = stats.quiet_orgs || [];
  const openIssues = Number(stats.open_issues || 0);
  const cashOut = Number(stats.cash_with_workers || 0);
  const onboarding = billing?.onboarding || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {topBar}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── 1. What the platform itself earns ── */}
        <HeroCard
          label="Monthly recurring revenue"
          prefix="UGX"
          value={ugx(bs.mrr_ugx)}
          stats={[
            { label: 'Paying', value: String(bs.paying_orgs ?? 0) },
            { label: 'On trial', value: String(bs.trial_orgs ?? 0) },
            { label: 'Overdue', value: String(bs.past_due_orgs ?? 0), alert: Number(bs.past_due_orgs) > 0 },
          ]}
        />

        {/* ── 2. Anything wanting a decision, before the numbers ── */}
        {(attention.length > 0 || openIssues > 0) && (
          <View>
            <SectionHeader title="Needs you" />
            <View style={{ gap: spacing.sm }}>
              {attention.length > 0 && (
                <NoticeRow
                  tone="error"
                  icon="file-invoice-dollar"
                  title={`${attention.length} organisation${attention.length === 1 ? '' : 's'} to chase`}
                  subtitle="Overdue, or due within 7 days"
                  onPress={() => navigation.navigate('Billing')}
                />
              )}
              {openIssues > 0 && (
                <NoticeRow
                  tone="warning"
                  icon="life-ring"
                  title={`${openIssues} open problem report${openIssues === 1 ? '' : 's'}`}
                  subtitle="Reported from inside the app"
                  onPress={() => navigation.navigate('Report a problem')}
                />
              )}
            </View>
          </View>
        )}

        {/* ── 3. Live activity across every tenant ── */}
        <View>
          <SectionHeader title="Today, everywhere" />
          <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
            <StatGrid
              items={[
                { label: 'Washes today', value: String(stats.washes_today ?? 0) },
                { label: 'Taken (UGX)', value: compact(Number(stats.gross_today || 0)) },
                { label: 'Cars open now', value: String(stats.open_jobs ?? 0), tone: Number(stats.open_jobs) > 0 ? 'info' : undefined },
              ]}
            />
            {cashOut > 0 && (
              <View style={styles.cashNote}>
                <Icon name="wallet" size={12} color={colors.warning} />
                <Text style={styles.cashNoteText}>
                  UGX {ugx(cashOut)} is with workers across all branches, not yet handed in.
                </Text>
              </View>
            )}
          </Surface>
        </View>

        <View>
          <SectionHeader title="Last 14 days" />
          <Surface elevation="sm" padded="lg">
            <TrendChart
              points={trendPoints}
              valuePrefix="UGX "
              emptyLabel="No washes anywhere in the last two weeks."
            />
          </Surface>
        </View>

        <View>
          <SectionHeader
            title="This month"
            action={delta !== null ? `${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}% vs last month` : undefined}
          />
          <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
            <StatGrid
              items={[
                { label: 'Washes', value: String(stats.washes_this_month ?? 0) },
                { label: 'Gross (UGX)', value: compact(grossMonth) },
                { label: 'Last month', value: compact(grossLast), muted: true },
              ]}
            />
            {delta !== null && (
              <Text style={styles.deltaNote}>
                Compared with the same {dayOfMonth} day{dayOfMonth === 1 ? '' : 's'} of last month, across all organisations.
              </Text>
            )}
          </Surface>
        </View>

        {/* ── 4. Who is carrying the platform ── */}
        <View>
          <SectionHeader title="Busiest organisations" count={orgItems.length} />
          {orgItems.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="building" title="No organisations yet" message="Onboard your first tenant to see activity here." />
            </Surface>
          ) : (
            <Surface elevation="sm" padded="lg">
              <RankedBars
                items={orgItems}
                valuePrefix="UGX "
                onPress={(item) => navigation.navigate('Org Detail', { orgId: item.key })}
              />
            </Surface>
          )}
        </View>

        {/* ── Churn signal ── */}
        {quiet.length > 0 && (
          <View style={{ gap: spacing.sm }}>
            <View>
              <SectionHeader title="Gone quiet" count={quiet.length} />
              <Surface elevation="sm" padded="sm" style={styles.listCard}>
                {quiet.map((o: any, i: number) => {
                  const d = daysSince(o.last_activity_at);
                  return (
                    <ListRow
                      key={o.id}
                      onPress={() => navigation.navigate('Org Detail', { orgId: o.id })}
                      leading="moon"
                      leadingTone="warning"
                      title={o.name}
                      subtitle={d == null ? 'Never processed a wash' : `Last wash ${d} days ago`}
                      last={i === quiet.length - 1}
                    />
                  );
                })}
              </Surface>
            </View>
            <Hint>Active organisations with no washes in the last 7 days — usually the first sign of churn.</Hint>
          </View>
        )}

        {/* ── 5. Growth ── */}
        {onboarding.length > 0 && (
          <View>
            <SectionHeader title="New organisations" />
            <Surface elevation="sm" padded="lg">
              {onboarding.every((o: any) => Number(o.onboarded || 0) === 0) ? (
                <EmptyState icon="chart-bar" title="No sign-ups in six months" message="New tenants chart here as you onboard them." />
              ) : (
                <MonthBars
                  height={60}
                  items={onboarding.map((o: any) => ({
                    key: o.month,
                    label: monthLabel(o.month),
                    value: Number(o.onboarded || 0),
                  }))}
                />
              )}
            </Surface>
          </View>
        )}

        {/* ── Scale of the whole thing ── */}
        <View>
          <SectionHeader title="Platform size" />
          <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
            <StatGrid
              items={[
                { label: 'Orgs', value: String(stats.total_orgs ?? 0) },
                { label: 'Branches', value: String(stats.active_branches ?? 0) },
                { label: 'Staff', value: String(stats.active_staff ?? 0) },
                { label: 'Customers', value: String(stats.total_clients ?? 0) },
              ]}
            />
            {Number(stats.suspended_orgs) > 0 && (
              <Badge label={`${stats.suspended_orgs} suspended`} tone="error" small />
            )}
          </Surface>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl },

  listCard: { paddingHorizontal: spacing.md },

  cashNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.warningSoft, borderRadius: radii.sm,
    paddingVertical: 10, paddingHorizontal: spacing.md,
  },
  cashNoteText: { flex: 1, fontSize: font.sm, color: colors.warningText, fontWeight: weight.semibold, lineHeight: 18 },

  deltaNote: { fontSize: font.xs, color: colors.textMuted, lineHeight: 16 },
});
