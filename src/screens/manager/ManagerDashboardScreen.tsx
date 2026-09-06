import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader from '../../components/ScreenHeader';
import Badge from '../../components/Badge';
import { Surface, SectionHeader, EmptyState, SkeletonList, ListRow, initials } from '../../components/ui';

const ugx = (n: any) => Number(n || 0).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);
const weekAgo = () => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * The manager's front page. Cash Handover is a single-purpose action screen —
 * good once you know something needs collecting, but the wrong first thing a
 * manager sees on opening the app. This is the "how is today going" summary:
 * a real hero number, what needs attention, who is working, and what just
 * happened on the forecourt — not a flat list of report links.
 */
export default function ManagerDashboardScreen() {
  const navigation = useNavigation<any>();
  const { actor } = useAuth();
  const [daily, setDaily] = useState<any>(null);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [recent, setRecent] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [d, e, sh, r] = await Promise.allSettled([
      api.daily(today()),
      api.exceptions(weekAgo(), today()),
      api.listShifts({ from: today(), to: today() }),
      api.listWashes(),
    ]);
    if (d.status === 'fulfilled') setDaily(d.value);
    if (e.status === 'fulfilled' && Array.isArray(e.value)) setExceptions(e.value);
    if (sh.status === 'fulfilled' && Array.isArray(sh.value)) setShifts(sh.value);
    if (r.status === 'fulfilled' && Array.isArray(r.value)) setRecent(r.value.slice(0, 6));
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
        <ScreenHeader title="Home" subtitle="Today" compact />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} /></ScrollView>
      </View>
    );
  }

  const summary = daily?.summary;
  const gross = Number(summary?.gross_ugx || 0);
  const washCount = Number(summary?.settled_washes || 0);
  const clean = exceptions.length === 0;

  // 'open' is currently working; 'pending_close' has finished for the day and
  // is waiting on this manager to record the handover. Both still owe cash.
  const working = shifts.filter((s: any) => s.status === 'open');
  const pendingCash = shifts.filter((s: any) => s.status !== 'closed');
  const owed = pendingCash.reduce((sum: number, s: any) => sum + Number(s.live_expected_cash_ugx || 0), 0);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`${greeting()}, ${actor?.full_name?.split(' ')[0] || 'manager'}`}
        subtitle={actor?.branch_name || 'Your branch'}
        compact
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* Hero — the branch's headline number, given real weight instead of
            sitting flat in a header pill. */}
        <LinearGradient
          colors={[colors.pink[600], colors.primary, colors.accent]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroBloom} pointerEvents="none" />
          <Text style={styles.heroLabel}>TODAY'S GROSS</Text>
          <View style={styles.heroAmountRow}>
            <Text style={styles.heroCurrency}>UGX</Text>
            <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {ugx(gross)}
            </Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{washCount}</Text>
              <Text style={styles.heroStatLabel}>WASHES</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{Number(summary?.redemption_count || 0)}</Text>
              <Text style={styles.heroStatLabel}>FREE</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{Number(summary?.handover_count || 0)}</Text>
              <Text style={styles.heroStatLabel}>HANDOVERS</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Exceptions — the thing most worth a manager's attention */}
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
              {clean ? 'Everything looks clean' : 'Disputes, unverified, handovers and cancellations'}
            </Text>
          </View>
          <Icon name="chevron-right" size={11} color={clean ? colors.success : colors.error} />
        </Surface>

        {/* Cash still with workers — pulls straight into Cash Handover */}
        {owed > 0 && (
          <Surface
            elevation="sm"
            tone={colors.warningSoft}
            borderless
            onPress={() => navigation.navigate('Cash Handover')}
            style={styles.alert}
          >
            <View style={[styles.alertIcon, { backgroundColor: colors.warning }]}>
              <Icon name="hand-holding-usd" size={13} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: colors.warning }]}>
                UGX {ugx(owed)} still with workers
              </Text>
              <Text style={styles.alertSub}>
                {pendingCash.length} worker{pendingCash.length === 1 ? '' : 's'} yet to hand in
              </Text>
            </View>
            <Icon name="chevron-right" size={11} color={colors.warning} />
          </Surface>
        )}

        {/* Who is working right now */}
        <View>
          <SectionHeader title="Working now" count={working.length} icon="users" />
          {working.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="user-clock" title="Nobody is working right now" message="Workers appear here once they open the app for the day." />
            </Surface>
          ) : (
            <View style={styles.workerRow}>
              {working.map((s: any) => (
                <View key={s.id} style={styles.workerChip}>
                  <LinearGradient
                    colors={colors.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.workerAvatar}
                  >
                    <Text style={styles.workerAvatarText}>{initials(s.worker_name)}</Text>
                  </LinearGradient>
                  <View style={styles.workerLiveDot} />
                  <Text style={styles.workerName} numberOfLines={1}>{s.worker_name.split(' ')[0]}</Text>
                  <Text style={styles.workerHolding}>{ugx(s.live_expected_cash_ugx)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Recent activity — the pulse of the forecourt */}
        <View>
          <SectionHeader title="Recent activity" icon="stream" />
          {recent.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="car" title="No activity yet" message="Washes will show up here as they happen." />
            </Surface>
          ) : (
            <Surface elevation="sm" padded="sm">
              {recent.map((w: any, i: number) => {
                const statusMeta: Record<string, { tone: any; label: string; icon: string }> = {
                  in_progress: { tone: 'warning', label: 'Washing', icon: 'soap' },
                  ready: { tone: 'info', label: 'Ready', icon: 'check-circle' },
                  settled: { tone: 'success', label: 'Paid', icon: 'check-double' },
                  cancelled: { tone: 'error', label: 'Cancelled', icon: 'times-circle' },
                  reversed: { tone: 'error', label: 'Reversed', icon: 'undo' },
                  disputed: { tone: 'error', label: 'Disputed', icon: 'gavel' },
                };
                const m = statusMeta[w.status] || { tone: 'neutral', label: w.status, icon: 'circle' };
                return (
                  <ListRow
                    key={w.id}
                    leading={m.icon}
                    leadingTone={m.tone}
                    title={`${w.vehicle_class_name} · ${w.service_name}`}
                    subtitle={
                      w.started_by_name === w.settled_by_name || !w.settled_by_name
                        ? w.started_by_name
                        : `${w.started_by_name} → ${w.settled_by_name}`
                    }
                    meta={`#${w.job_no} · ${timeAgo(w.started_at)}`}
                    value={w.is_redemption ? 'FREE' : `${ugx(w.amount_ugx || w.quoted_amount_ugx)}`}
                    valueSub={w.is_redemption ? undefined : 'UGX'}
                    valueTone={w.is_redemption ? 'accent' : undefined}
                    last={i === recent.length - 1}
                    trailing={<Badge label={m.label} tone={m.tone} small />}
                  />
                );
              })}
            </Surface>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadow.brand,
  },
  heroBloom: {
    position: 'absolute', top: -90, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.8)', letterSpacing: tracking.capsWide },
  heroAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 4 },
  heroCurrency: { fontSize: font.regular, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.75)' },
  heroAmount: { fontSize: font.hero, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  heroDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.28)', marginVertical: spacing.lg },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, gap: 2 },
  heroStatValue: { fontSize: font.xl, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.tight },
  heroStatLabel: { fontSize: 9, fontWeight: weight.bold, color: 'rgba(255,255,255,0.7)', letterSpacing: tracking.caps },
  heroStatDivider: { width: StyleSheet.hairlineWidth, height: 26, backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: spacing.md },

  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  alertIcon: {
    width: 32, height: 32, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  alertTitle: { fontSize: font.regular, fontWeight: weight.heavy, letterSpacing: tracking.tight },
  alertSub: { fontSize: font.xs, color: colors.textSecondary, marginTop: 1 },

  workerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  workerChip: {
    alignItems: 'center', gap: 4,
    backgroundColor: colors.bgCard, borderRadius: radii.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    minWidth: 84,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderLight,
    ...shadow.xs,
  },
  workerAvatar: {
    width: 40, height: 40, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  workerAvatarText: { fontSize: font.sm, fontWeight: weight.heavy, color: '#fff' },
  workerLiveDot: {
    position: 'absolute', top: spacing.md, right: spacing.md,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success,
    borderWidth: 1.5, borderColor: colors.bgCard,
  },
  workerName: { fontSize: font.xs, fontWeight: weight.bold, color: colors.text, marginTop: 2 },
  workerHolding: { fontSize: 10, fontWeight: weight.semibold, color: colors.textMuted },
});
