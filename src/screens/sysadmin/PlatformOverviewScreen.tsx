import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';
import ScreenHeader from '../../components/ScreenHeader';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, TrendChart, RankedBars, ListRow,
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

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Platform Overview" subtitle="System-wide" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={5} /></ScrollView>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Platform Overview" subtitle="System-wide" />
        <ScrollView contentContainerStyle={styles.body}>
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="chart-pie" title="No platform data" message="Statistics appear once organisations are active." />
          </Surface>
        </ScrollView>
      </View>
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
  const maxOnboard = Math.max(...onboarding.map((o: any) => Number(o.onboarded || 0)), 1);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Platform Overview" subtitle="System-wide" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── What the platform itself earns ─────────────────── */}
        <LinearGradient
          colors={[colors.ink[800], colors.ink[950]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.bloom} pointerEvents="none" />
          <View style={styles.heroHead}>
            <Text style={styles.heroKicker}>YOUR MONTHLY RECURRING REVENUE</Text>
            <Icon name="chart-line" size={14} color="rgba(255,255,255,0.6)" />
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>UGX</Text>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {ugx(bs.mrr_ugx)}
            </Text>
          </View>
          <View style={styles.heroStats}>
            <HeroStat label="Paying" value={String(bs.paying_orgs ?? 0)} />
            <View style={styles.heroDivide} />
            <HeroStat label="On trial" value={String(bs.trial_orgs ?? 0)} />
            <View style={styles.heroDivide} />
            <HeroStat label="Overdue" value={String(bs.past_due_orgs ?? 0)} alert={Number(bs.past_due_orgs) > 0} />
          </View>
        </LinearGradient>

        {/* ── Anything wanting a decision, before the numbers ── */}
        {(attention.length > 0 || openIssues > 0) && (
          <View>
            <SectionHeader title="Needs you" icon="bell" />
            <View style={{ gap: spacing.sm }}>
              {attention.length > 0 && (
                <Surface
                  elevation="sm"
                  tone={colors.errorSoft}
                  borderless
                  onPress={() => navigation.navigate('Billing')}
                  style={styles.alertRow}
                >
                  <Icon name="exclamation-triangle" size={13} color={colors.error} />
                  <Text style={styles.alertText}>
                    {attention.length} organisation{attention.length === 1 ? '' : 's'} overdue or due within 7 days
                  </Text>
                  <Icon name="chevron-right" size={11} color={colors.error} />
                </Surface>
              )}
              {openIssues > 0 && (
                <Surface
                  elevation="sm"
                  tone={colors.warningSoft}
                  borderless
                  onPress={() => navigation.navigate('Report a problem')}
                  style={styles.alertRow}
                >
                  <Icon name="life-ring" size={13} color={colors.warning} />
                  <Text style={[styles.alertText, { color: colors.warning }]}>
                    {openIssues} open problem report{openIssues === 1 ? '' : 's'}
                  </Text>
                  <Icon name="chevron-right" size={11} color={colors.warning} />
                </Surface>
              )}
            </View>
          </View>
        )}

        {/* ── Live activity across every tenant ──────────────── */}
        <View>
          <SectionHeader title="Today, everywhere" icon="bolt" />
          <Surface elevation="sm" padded="lg">
            <View style={styles.statGrid}>
              <Stat label="Washes today" value={String(stats.washes_today ?? 0)} />
              <Stat label="Taken today" value={compact(Number(stats.gross_today || 0))} />
              <Stat
                label="Cars open now"
                value={String(stats.open_jobs ?? 0)}
                tone={Number(stats.open_jobs) > 0 ? colors.info : undefined}
              />
            </View>
            {cashOut > 0 && (
              <View style={styles.cashNote}>
                <Icon name="wallet" size={11} color={colors.warning} />
                <Text style={styles.cashNoteText}>
                  UGX {ugx(cashOut)} is with workers across all branches, not yet handed in.
                </Text>
              </View>
            )}
          </Surface>
        </View>

        {/* ── Direction of travel ────────────────────────────── */}
        <View>
          <SectionHeader title="Last 14 days" icon="chart-line" />
          <Surface elevation="sm" padded="lg">
            <TrendChart
              points={trendPoints}
              valuePrefix="UGX "
              emptyLabel="No washes anywhere in the last two weeks."
            />
          </Surface>
        </View>

        {/* ── Month so far ───────────────────────────────────── */}
        <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
          <View style={styles.monthHead}>
            <Text style={styles.sectionLabel}>THIS MONTH, ALL ORGANISATIONS</Text>
            {delta !== null && (
              <View style={styles.deltaPill}>
                <Icon name={delta >= 0 ? 'arrow-up' : 'arrow-down'} size={8} color={delta >= 0 ? colors.success : colors.error} />
                <Text style={[styles.deltaText, { color: delta >= 0 ? colors.success : colors.error }]}>
                  {Math.abs(delta)}%
                </Text>
              </View>
            )}
          </View>
          <View style={styles.statGrid}>
            <Stat label="Washes" value={String(stats.washes_this_month ?? 0)} />
            <Stat label="Gross UGX" value={compact(grossMonth)} />
            <Stat label="Last month" value={compact(grossLast)} muted />
          </View>
          {delta !== null && (
            <Text style={styles.deltaNote}>
              Compared with the same {dayOfMonth} day{dayOfMonth === 1 ? '' : 's'} of last month.
            </Text>
          )}
        </Surface>

        {/* ── Who is carrying the platform ───────────────────── */}
        <View>
          <SectionHeader title="Busiest organisations" count={orgItems.length} icon="building" />
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

        {/* ── Churn signal ───────────────────────────────────── */}
        {quiet.length > 0 && (
          <View>
            <SectionHeader title="Gone quiet" count={quiet.length} icon="moon" />
            <Surface elevation="sm" padded="sm">
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
            <View style={styles.hint}>
              <Icon name="info-circle" size={11} color={colors.textMuted} />
              <Text style={styles.hintText}>
                Active organisations with no washes in the last 7 days — usually the first sign of churn.
              </Text>
            </View>
          </View>
        )}

        {/* ── Growth ─────────────────────────────────────────── */}
        {onboarding.length > 0 && (
          <View>
            <SectionHeader title="New organisations" icon="chart-bar" />
            <Surface elevation="sm" padded="lg">
              {onboarding.every((o: any) => Number(o.onboarded || 0) === 0) ? (
                <EmptyState icon="chart-bar" title="No sign-ups in six months" message="New tenants chart here as you onboard them." />
              ) : (
                <View style={styles.months}>
                  {onboarding.map((o: any, i: number) => {
                    const c = Number(o.onboarded || 0);
                    const h = Math.max(3, (c / maxOnboard) * 60);
                    const isLast = i === onboarding.length - 1;
                    return (
                      <View key={o.month} style={styles.monthCol}>
                        <Text style={styles.monthValue}>{c}</Text>
                        <View
                          style={[
                            styles.monthBar,
                            { height: h, backgroundColor: isLast ? colors.primary : colors.primaryTint },
                          ]}
                        />
                        <Text style={[styles.monthLabel, isLast && styles.monthLabelOn]}>{monthLabel(o.month)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </Surface>
          </View>
        )}

        {/* ── Scale of the whole thing ───────────────────────── */}
        <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
          <Text style={styles.sectionLabel}>PLATFORM SIZE</Text>
          <View style={styles.statGrid}>
            <Stat label="Organisations" value={String(stats.total_orgs ?? 0)} />
            <Stat label="Branches" value={String(stats.active_branches ?? 0)} />
            <Stat label="Staff" value={String(stats.active_staff ?? 0)} />
            <Stat label="Customers" value={String(stats.total_clients ?? 0)} />
          </View>
          {Number(stats.suspended_orgs) > 0 && (
            <View style={styles.suspendNote}>
              <Badge label={`${stats.suspended_orgs} suspended`} tone="error" small />
            </View>
          )}
        </Surface>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, tone, muted }: { label: string; value: string; tone?: string; muted?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text
        style={[styles.statValue, tone ? { color: tone } : null, muted && styles.statMuted]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function HeroStat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <View style={styles.heroStat}>
      <Text style={[styles.heroStatValue, alert && { color: '#FF8A9B' }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.heroStatLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  hero: { borderRadius: radii.xl, padding: spacing.xl, overflow: 'hidden', ...shadow.md },
  bloom: {
    position: 'absolute', top: -80, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(233,30,99,0.18)',
  },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  heroKicker: { fontSize: font.micro, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.55)', letterSpacing: tracking.capsWide },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  currency: { fontSize: font.regular, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.55)' },
  amount: { flexShrink: 1, fontSize: font.hero, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)',
  },
  heroStat: { flex: 1, gap: 1 },
  heroStatValue: { fontSize: font.regular, fontWeight: weight.black, color: '#fff' },
  heroStatLabel: { fontSize: font.micro, color: 'rgba(255,255,255,0.6)' },
  heroDivide: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: 'rgba(255,255,255,0.18)' },

  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertText: { flex: 1, fontSize: font.sm, fontWeight: weight.heavy, color: colors.error },

  sectionLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  statGrid: { flexDirection: 'row', gap: spacing.md },
  stat: { flex: 1, gap: 1 },
  statValue: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  statMuted: { color: colors.textMuted },
  statLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: weight.semibold },

  cashNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: colors.warningSoft, borderRadius: radii.sm,
    paddingVertical: 9, paddingHorizontal: spacing.md, marginTop: spacing.md,
  },
  cashNoteText: { flex: 1, fontSize: font.xs, color: colors.warning, fontWeight: weight.semibold, lineHeight: 16 },

  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deltaPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  deltaText: { fontSize: font.xs, fontWeight: weight.black },
  deltaNote: { fontSize: font.micro, color: colors.textMuted },

  months: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm, minHeight: 96 },
  monthCol: { flex: 1, alignItems: 'center', gap: 3 },
  monthValue: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textSecondary },
  monthBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  monthLabel: { fontSize: font.micro, color: colors.textMuted, fontWeight: weight.semibold },
  monthLabelOn: { color: colors.primary, fontWeight: weight.heavy },

  suspendNote: { flexDirection: 'row' },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs, marginTop: spacing.sm },
  hintText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },
});
