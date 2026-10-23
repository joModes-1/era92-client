import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import GradientButton from '../../components/GradientButton';
import AppTopBar from '../../components/AppTopBar';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, EmptyState, SkeletonList, initials } from '../../components/ui';

/**
 * The worker's home.
 *
 * Top: the car they are responsible for right now, through its two physical
 * steps — "Finish washing", then "Payment collected" once washed.
 *
 * Below, what makes the page worth opening between cars: today's money and
 * points, cash they owe their manager, cars waiting to be taken (with the
 * countdown before the dispatcher assigns them, and a button to take one
 * now), their place on the week's leaderboard, and recent cars with what
 * each paid them.
 *
 * A shift still opens automatically in the background: wash-done and settle
 * both require one server-side.
 */

const METHOD_LABEL: Record<string, string> = { cash: 'Cash', mtn: 'MTN Mobile Money', airtel: 'Airtel Money', points: 'Points' };
const ugx = (n: any) => Number(n || 0).toLocaleString();

/** Server error codes in words a worker can act on. */
function friendlyError(e: any): string {
  switch (e?.code) {
    case 'BAD_STATE': return 'This car has moved on — pull down to refresh.';
    case 'NO_OPEN_SHIFT': return 'Your shift isn\'t open yet. Pull down to refresh and try again.';
    case 'WRONG_BRANCH': return 'This car belongs to another branch.';
    case 'HANDOVER_CONFIRM_REQUIRED': return 'Another worker washed this car. Ask your manager to confirm the payment.';
    case 'WORKER_BUSY': return 'Another worker has fewer cars right now — they get this one first.';
    case 'ALREADY_CLAIMED': return 'Someone else just took this car.';
    default: return e?.message || 'Something went wrong. Try again.';
  }
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function ago(iso?: string) {
  if (!iso) return '';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function WorkerHome({ navigation }: any) {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const [current, setCurrent] = useState<any>(null);
  const [waiting, setWaiting] = useState<any[]>([]);
  const [canAccept, setCanAccept] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [points, setPoints] = useState<any>(null);
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taking, setTaking] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const shift = await api.getCurrentShift().catch(() => null);
      if (!shift) {
        try { await api.openShift(); } catch { /* already open, no branch, or offline */ }
      } else if (shift.status === 'pending_close') {
        await api.reopenShift(shift.id).catch(() => {});
      }

      const [q, w, p, lb] = await Promise.allSettled([
        api.getQueue(), api.myWallet(), api.myPoints(), api.leaderboard('week'),
      ]);
      if (q.status === 'fulfilled') {
        const queue = q.value || {};
        const mine = (list: any[]) => (list || []).filter((x: any) => x.started_by_worker_id === actor?.id);
        // A car being washed comes first; otherwise one this worker washed
        // that is waiting for its payment to be confirmed.
        const washing = mine(queue.washing).map((x: any) => ({ ...x, stage: 'washing' }));
        const ready = mine(queue.ready).map((x: any) => ({ ...x, stage: 'ready' }));
        setCurrent(washing[0] || ready[0] || null);
        setWaiting(queue.requested || []);
        setCanAccept(queue.dispatch?.can_accept !== false);
      }
      if (w.status === 'fulfilled') setWallet(w.value);
      if (p.status === 'fulfilled') setPoints(p.value);
      if (lb.status === 'fulfilled') setBoard(Array.isArray(lb.value) ? lb.value : []);
    } catch {
      // Offline or an account with no branch — the empty states below cover it.
    }
  }, [actor?.id]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Poll: a car can be assigned or booked at any time.
  useEffect(() => {
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);
  // Tick once a second so the waiting cars' countdowns move.
  useEffect(() => {
    if (waiting.length === 0) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [waiting.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const finishWashing = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await api.washDone(current.id);
      await load();
    } catch (e: any) {
      alert('Could not finish', friendlyError(e));
    }
    setBusy(false);
  };

  const confirmPayment = async () => {
    if (!current) return;
    setBusy(true);
    try {
      // The client already declared how they intend to pay; this confirms
      // the worker actually collected it. Cash when nothing was declared.
      await api.settle(current.id, {
        unverified_reason: 'no_app',
        payment_method: current.declared_payment_method || 'cash',
      });
      await load();
      alert('Payment confirmed', 'The car is settled.');
    } catch (e: any) {
      alert('Could not confirm payment', friendlyError(e));
    }
    setBusy(false);
  };

  const takeCar = async (id: string) => {
    setTaking(id);
    try {
      await api.acceptWash(id);
      await load();
    } catch (e: any) {
      alert('Could not take this car', friendlyError(e));
      await load();
    }
    setTaking(null);
  };

  const amountDue = current
    ? (current.is_redemption ? 0 : Number(current.quoted_amount_ugx) - Number(current.points_value_ugx || 0))
    : 0;

  // Today's figures from the wallet ledger (commission rows dated today).
  const todayRows = (wallet?.ledger || []).filter((r: any) =>
    r.kind === 'commission' && new Date(r.created_at).toDateString() === new Date().toDateString());
  const recent = (wallet?.ledger || []).filter((r: any) => r.kind === 'commission').slice(0, 4);
  const me = board.find((r: any) => r.id === actor?.id);
  const top = board.filter((r: any) => Number(r.points) > 0).slice(0, 3);
  const firstName = (actor?.full_name || '').split(' ')[0] || 'there';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppTopBar context={actor?.branch_name || 'Car Wash'} onMenu={() => navigation.openDrawer?.()} />

      {loading ? (
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={3} /></ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <Text style={styles.greeting}>{greeting()}, {firstName}</Text>

          {/* ── The car you're on ── */}
          {current ? (
            <Surface elevation="sm" padded="lg">
              <View style={styles.stageRow}>
                <View style={[styles.stagePill, current.stage === 'ready' && styles.stagePillReady]}>
                  <Text style={[styles.stageText, current.stage === 'ready' && styles.stageTextReady]}>
                    {current.stage === 'washing' ? 'Being washed' : 'Washed — collect payment'}
                  </Text>
                </View>
                {Number(current.worker_points_to_award) > 0 ? (
                  <Text style={styles.pointsTag}>+{current.worker_points_to_award} pts</Text>
                ) : null}
              </View>

              <Text style={styles.carType}>{current.vehicle_class_name}</Text>
              <Text style={styles.serviceName}>{current.service_name}</Text>
              {current.plate ? <Text style={styles.plate}>{current.plate}</Text> : null}
              {current.client_name ? (
                <View style={styles.clientRow}>
                  <Icon name="user-check" size={10} color={colors.success} />
                  <Text style={styles.clientName}>{current.client_name}</Text>
                </View>
              ) : null}

              {current.stage === 'ready' ? (
                <View style={styles.payBox}>
                  <Text style={styles.payLabel}>
                    {amountDue > 0 ? `Collect UGX ${ugx(amountDue)}` : 'Nothing to collect'}
                  </Text>
                  <Text style={styles.payMethod}>
                    {amountDue > 0
                      ? `Client chose: ${METHOD_LABEL[current.declared_payment_method] || 'Cash (not chosen yet)'}`
                      : current.is_redemption ? 'Free wash' : 'Paid with points'}
                  </Text>
                </View>
              ) : null}

              {current.stage === 'washing' ? (
                <GradientButton title="Finish washing" variant="dark" size="lg" icon="check" full
                  loading={busy} onPress={finishWashing} style={{ marginTop: spacing.lg }} />
              ) : (
                <GradientButton title="Payment collected" variant="success" size="lg" icon="credit-card" full
                  loading={busy} onPress={confirmPayment} style={{ marginTop: spacing.lg }} />
              )}
            </Surface>
          ) : null}

          {/* ── Today: the one gradient card on the page ── */}
          <LinearGradient
            colors={colors.gradientAction}
            locations={colors.gradientActionLocations}
            start={colors.gradientActionStart}
            end={colors.gradientActionEnd}
            style={styles.hero}
          >
            <View style={styles.heroBloom} pointerEvents="none" />
            <Text style={styles.heroLabel}>EARNED TODAY</Text>
            <View style={styles.heroAmountRow}>
              <Text style={styles.heroCurrency}>UGX</Text>
              <Text style={styles.heroAmount} numberOfLines={1}>{ugx(wallet?.commission?.today_ugx)}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStats}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{todayRows.length}</Text>
                <Text style={styles.heroStatLabel}>CARS TODAY</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{ugx(wallet?.commission?.week_ugx)}</Text>
                <Text style={styles.heroStatLabel}>THIS WEEK</Text>
              </View>
              <View style={styles.heroStatDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{ugx(points?.lifetime_earned)}</Text>
                <Text style={styles.heroStatLabel}>POINTS</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── Cash to hand in ── */}
          {Number(wallet?.owes_ugx) > 0 ? (
            <Surface elevation="sm" tone={colors.warningSoft} borderless style={styles.alert}>
              <View style={[styles.alertIcon, { backgroundColor: colors.warning }]}>
                <Icon name="hand-holding-usd" size={13} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.warning }]}>UGX {ugx(wallet.owes_ugx)} to hand in</Text>
                <Text style={styles.alertSub}>Cash you collected, after your commission. Give it to your manager.</Text>
              </View>
            </Surface>
          ) : null}

          {/* ── Cars waiting for a worker ── */}
          <View>
            <SectionHeader title="Cars waiting" count={waiting.length} icon="car" />
            {waiting.length === 0 ? (
              <Surface elevation="sm" padded="lg">
                <EmptyState
                  icon="car"
                  title={current ? 'No other cars waiting' : 'No cars waiting'}
                  message="New bookings appear here. Take one, or it's given to the next worker in line."
                />
              </Surface>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {waiting.map((w: any) => {
                  const left = Math.max(0, Math.ceil((new Date(w.auto_assign_at).getTime() - Date.now()) / 1000));
                  return (
                    <Surface key={w.id} elevation="sm" style={styles.waitCard}>
                      <View style={styles.waitHead}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.waitCar}>{w.vehicle_class_name} · {w.service_name}</Text>
                          <Text style={styles.waitMeta}>
                            {[w.plate, w.client_name, `UGX ${ugx(w.quoted_amount_ugx)}`].filter(Boolean).join(' · ')}
                          </Text>
                        </View>
                        <View style={styles.countdown}>
                          <Text style={styles.countdownText}>{left > 0 ? `${left}s` : 'assigning…'}</Text>
                        </View>
                      </View>
                      {Number(w.worker_points_to_award) > 0 ? (
                        <Text style={styles.waitPoints}>Earns you +{w.worker_points_to_award} pts</Text>
                      ) : null}
                      {canAccept ? (
                        <GradientButton title="Take this car" icon="hand-paper" full
                          loading={taking === w.id} onPress={() => takeCar(w.id)} />
                      ) : (
                        <Text style={styles.waitNote}>A worker with fewer cars gets this one first.</Text>
                      )}
                    </Surface>
                  );
                })}
              </View>
            )}
          </View>

          {/* ── This week's leaderboard ── */}
          <View>
            <SectionHeader title="This week" icon="trophy" />
            <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
              {me ? (
                <Text style={styles.rankLine}>
                  You're <Text style={styles.rankStrong}>#{me.rank}</Text> with <Text style={styles.rankStrong}>{ugx(me.points)} pts</Text> this week
                </Text>
              ) : (
                <Text style={styles.rankLine}>Wash a car to get on this week's board.</Text>
              )}
              {top.map((r: any) => (
                <View key={r.id} style={styles.boardRow}>
                  <Text style={styles.boardRank}>{r.rank}</Text>
                  <View style={[styles.boardAvatar, r.id === actor?.id && styles.boardAvatarMe]}>
                    <Text style={[styles.boardInitials, r.id === actor?.id && { color: '#fff' }]}>{initials(r.full_name)}</Text>
                  </View>
                  <Text style={styles.boardName} numberOfLines={1}>{r.id === actor?.id ? 'You' : r.full_name}</Text>
                  <Text style={styles.boardPts}>{ugx(r.points)} pts</Text>
                </View>
              ))}
            </Surface>
          </View>

          {/* ── Recent cars ── */}
          {recent.length > 0 ? (
            <View>
              <SectionHeader title="Recent cars" icon="history" />
              <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
                {recent.map((r: any) => (
                  <View key={r.id} style={styles.recentRow}>
                    <View style={styles.recentIcon}><Icon name="car" size={11} color={colors.primary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentTitle}>{r.job_no || 'Wash'}</Text>
                      <Text style={styles.recentMeta}>{METHOD_LABEL[r.payment_method] || 'Paid'} · {ago(r.created_at)}</Text>
                    </View>
                    <Text style={styles.recentAmount}>+UGX {ugx(r.amount_ugx)}</Text>
                  </View>
                ))}
              </Surface>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  greeting: { fontSize: font.xl, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },

  stageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  stagePill: { backgroundColor: colors.bgSunken, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  stagePillReady: { backgroundColor: '#E7F8EF' },
  stageText: { fontSize: font.xs, fontWeight: weight.bold, color: colors.textSecondary },
  stageTextReady: { color: colors.success },
  pointsTag: { fontSize: font.sm, fontWeight: weight.bold, color: colors.primary },

  carType: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  serviceName: { fontSize: font.regular, color: colors.textSecondary, fontWeight: weight.semibold, marginTop: 2 },
  plate: {
    fontSize: font.sm, color: colors.textSecondary, fontWeight: weight.bold,
    backgroundColor: colors.bgSunken, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm, marginTop: spacing.sm,
  },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  clientName: { fontSize: font.sm, fontWeight: weight.bold, color: colors.success },
  payBox: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.bgSunken },
  payLabel: { fontSize: font.lg, fontWeight: weight.black, color: colors.text },
  payMethod: { fontSize: font.sm, color: colors.textSecondary, fontWeight: weight.semibold, marginTop: 2 },

  hero: { borderRadius: radii.xl, padding: spacing.xl, overflow: 'hidden', ...shadow.md },
  heroBloom: {
    position: 'absolute', top: -70, right: -50, width: 190, height: 190, borderRadius: 95,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.8)', letterSpacing: tracking.capsWide },
  heroAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 4 },
  heroCurrency: { fontSize: font.regular, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.75)' },
  heroAmount: { fontSize: font.hero, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  heroDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.28)', marginVertical: spacing.lg },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, gap: 2 },
  heroStatDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.28)', marginHorizontal: spacing.sm },
  heroStatValue: { fontSize: font.lg, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.tight },
  heroStatLabel: { fontSize: 9, fontWeight: weight.bold, color: 'rgba(255,255,255,0.7)', letterSpacing: tracking.caps },

  alert: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  alertIcon: { width: 30, height: 30, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontSize: font.regular, fontWeight: weight.heavy, letterSpacing: tracking.tight },
  alertSub: { fontSize: font.xs, color: colors.textSecondary, marginTop: 1 },

  waitCard: { gap: spacing.sm },
  waitHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waitCar: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text },
  waitMeta: { fontSize: font.xs, color: colors.textMuted, marginTop: 2 },
  waitPoints: { fontSize: font.xs, fontWeight: weight.bold, color: colors.primary },
  waitNote: { fontSize: font.xs, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xs },
  countdown: { backgroundColor: '#F4ECFF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  countdownText: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.primary },

  rankLine: { fontSize: font.sm, color: colors.textSecondary },
  rankStrong: { fontWeight: weight.heavy, color: colors.text },
  boardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  boardRank: { width: 16, fontSize: font.sm, fontWeight: weight.heavy, color: colors.textMuted },
  boardAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F4ECFF', alignItems: 'center', justifyContent: 'center' },
  boardAvatarMe: { backgroundColor: colors.primary },
  boardInitials: { fontSize: font.micro, fontWeight: weight.black, color: colors.primary },
  boardName: { flex: 1, fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  boardPts: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.text },

  recentRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  recentIcon: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#F4ECFF', alignItems: 'center', justifyContent: 'center' },
  recentTitle: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  recentMeta: { fontSize: font.xs, color: colors.textMuted, marginTop: 1 },
  recentAmount: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.success },
});
