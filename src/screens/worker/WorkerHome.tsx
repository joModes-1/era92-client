import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Vibration, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, spacing, weight, staffType, staffText, orgBg, orgTheme } from '../../theme';
import GradientButton from '../../components/GradientButton';
import AppTopBar from '../../components/AppTopBar';
import Icon from '../../components/Icon';
import GradientIcon from '../../components/GradientIcon';
import { useAppAlert } from '../../components/AppAlert';
import { artFor } from '../client/serviceArt';
import {
  Surface, SectionHeader, SkeletonList, SlideToConfirm, CountdownBar, StageStepper,
} from '../../components/ui';

/**
 * The worker's home — one car, one stage, one action (STAFF-UI-SPEC.md §3,
 * from Uber Driver, DoorDash, ServiceTitan and Jobber):
 *
 *  1. Today's money in a thin strip at the top (Uber's earnings tracker).
 *  2. The car they're on: its stage on a stepper, the plate as the biggest
 *     text, and — once it's washed — the amount to collect bigger still.
 *  3. The one action for that stage, docked at the bottom as "Slide to …"
 *     (Uber Base), with press-and-hold as the no-drag alternative.
 *  4. Cars waiting: compact cards, lighter than the current car, each with
 *     Take and the time left before the dispatcher hands it on.
 *  5. Cash to hand in, and their place on the week's board — one line each.
 *
 * A shift still opens automatically in the background: wash-done and settle
 * both require one server-side.
 */

const METHOD_LABEL: Record<string, string> = { cash: 'Cash', mtn: 'MTN Mobile Money', airtel: 'Airtel Money', points: 'Points' };
const METHOD_SHORT: Record<string, string> = { cash: 'Cash', mtn: 'MTN', airtel: 'Airtel' };
const ugx = (n: any) => Number(n || 0).toLocaleString();
const STEPS = ['Washing', 'Ready', 'Paid'];

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

/** Whole minutes since a time, for the stage timer. */
function minutesSince(iso?: string) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

export default function WorkerHome({ navigation }: any) {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<any>(null);
  const [waiting, setWaiting] = useState<any[]>([]);
  const [canAccept, setCanAccept] = useState(true);
  const [wallet, setWallet] = useState<any>(null);
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taking, setTaking] = useState<string | null>(null);
  const [, setTick] = useState(0);
  // Cars already seen, so only a newly takeable one buzzes the phone.
  const seen = useRef<Set<string> | null>(null);
  const refreshingAtZero = useRef(false);

  const load = useCallback(async () => {
    try {
      const shift = await api.getCurrentShift().catch(() => null);
      if (!shift) {
        try { await api.openShift(); } catch { /* already open, no branch, or offline */ }
      } else if (shift.status === 'pending_close') {
        await api.reopenShift(shift.id).catch(() => {});
      }

      const [q, w, lb] = await Promise.allSettled([
        api.getQueue(), api.myWallet(), api.leaderboard('week'),
      ]);
      if (q.status === 'fulfilled') {
        const queue = q.value || {};
        const mine = (list: any[]) => (list || []).filter((x: any) => x.started_by_worker_id === actor?.id);
        // A car being washed comes first; otherwise one this worker washed
        // that is waiting for its payment to be confirmed.
        const washing = mine(queue.washing).map((x: any) => ({ ...x, stage: 'washing' }));
        const ready = mine(queue.ready).map((x: any) => ({ ...x, stage: 'ready' }));
        const now = Date.now();
        // Count down on the server's clock, not the phone's (phone clocks
        // drift): seconds_left was worked out by the server just now.
        const requested = (queue.requested || []).map((x: any) => {
          const total = x.requested_at && x.auto_assign_at
            ? Math.max(1, (new Date(x.auto_assign_at).getTime() - new Date(x.requested_at).getTime()) / 1000)
            : 45;
          const endsAt = x.seconds_left != null ? now + Number(x.seconds_left) * 1000 : new Date(x.auto_assign_at).getTime();
          return { ...x, _endsAt: endsAt, _total: total };
        });
        const free = !(washing[0] || ready[0]);
        const takeable = queue.dispatch?.can_accept !== false;
        // One buzz when a car a free worker can take appears — nothing during
        // the countdown (Android haptics: strong buzzing only for attention).
        if (seen.current && free && takeable && requested.some((x: any) => !seen.current!.has(x.id))) {
          Vibration.vibrate(400);
        }
        seen.current = new Set(requested.map((x: any) => x.id));
        setCurrent(washing[0] || ready[0] || null);
        setWaiting(requested);
        setCanAccept(takeable);
      }
      if (w.status === 'fulfilled') setWallet(w.value);
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
  // Tick once a second so the countdowns and the stage timer move — and
  // refresh as soon as a countdown reaches zero, rather than leaving
  // "Assigning…" up until the next poll.
  useEffect(() => {
    if (waiting.length === 0 && !current) return;
    const t = setInterval(() => {
      setTick((n) => n + 1);
      if (!refreshingAtZero.current && waiting.some((w: any) => w._endsAt <= Date.now())) {
        refreshingAtZero.current = true;
        load().finally(() => { refreshingAtZero.current = false; });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [waiting, current, load]);

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
      Vibration.vibrate(30); // a short pulse confirms the take
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
  const stageIndex = current?.stage === 'ready' ? 1 : 0;
  const stageMinutes = current ? minutesSince(current.stage === 'ready' ? current.wash_done_at : current.started_at) : null;
  const stale = current?.stage === 'ready' && !!current?.stale;

  const carsToday = (wallet?.ledger || []).filter((r: any) =>
    r.kind === 'commission' && new Date(r.created_at).toDateString() === new Date().toDateString()).length;
  const me = board.find((r: any) => r.id === actor?.id);
  const owes = Number(wallet?.owes_ugx || 0);
  // "N waiting · oldest 18 min" — the queue header Oracle OPERA and the
  // valet apps use, so the worker sees how long people have been waiting.
  const oldestMin = waiting.length
    ? Math.max(...waiting.map((w: any) => minutesSince(w.requested_at) ?? 0))
    : null;

  const payLine = !current ? '' : amountDue > 0
    ? (METHOD_LABEL[current.declared_payment_method]
      ? `Client chose ${METHOD_LABEL[current.declared_payment_method]}`
      : "Client hasn't chosen how to pay yet")
    : current.is_redemption ? (current.promo_key ? 'Free · 2-for-1 offer' : 'Free wash') : 'Paid with points';

  return (
    <SafeAreaView style={[styles.container, orgBg()]} edges={['top']}>
      <AppTopBar
        context={actor?.branch_name || 'Car Wash'}
        onMenu={() => navigation.openDrawer?.()}
      />

      {loading ? (
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={3} /></ScrollView>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.body, current && { paddingBottom: 150 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
          >
            {/* ── Today's money — on the client home's rewards-banner wash
                (soft violet → peach, violet border), so the worker app
                carries the same brand moment. ── */}
            <TouchableOpacity
              style={styles.stripOuter}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('My Account')}
              accessibilityRole="button"
              accessibilityLabel={`Today: ${carsToday} cars, UGX ${ugx(wallet?.commission?.today_ugx)} earned. Open My Account`}
            >
              <LinearGradient colors={orgTheme.strip} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.strip}>
                <View style={styles.stripIcon}><Icon name="coins" size={19} color="#fff" /></View>
                <Text style={styles.stripLabel}>Today</Text>
                <Text style={styles.stripValue} numberOfLines={1}>
                  {carsToday} {carsToday === 1 ? 'car' : 'cars'} · UGX {ugx(wallet?.commission?.today_ugx)}
                </Text>
                <Icon name="chevron-right" size={15} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>

            {/* ── The car you're on ── */}
            {current ? (
              <Surface elevation="md" padded="lg" style={styles.carCard}>
                <View style={styles.carHead}>
                  <View style={[styles.chip, current.stage === 'ready' ? styles.chipReady : styles.chipWashing]}>
                    <Text style={[styles.chipText, { color: current.stage === 'ready' ? colors.successText : colors.warningText }]}>
                      {current.stage === 'ready' ? 'Ready · collect payment' : 'Being washed'}
                    </Text>
                  </View>
                  {stageMinutes != null ? (
                    <View style={styles.timer} accessibilityLabel={`${stageMinutes} minutes in this stage${stale ? ', waiting too long' : ''}`}>
                      <Icon name="clock" size={15} color={stale ? colors.error : staffText.muted} />
                      <Text style={[styles.timerText, stale && styles.timerLate]}>{stageMinutes} min</Text>
                    </View>
                  ) : null}
                </View>

                <StageStepper steps={STEPS} current={stageIndex} />

                <View style={styles.carId}>
                  {current.plate ? <Text style={styles.plate}>{current.plate}</Text> : null}
                  <Text style={current.plate ? styles.carLine : styles.carLineBig}>
                    {current.vehicle_class_name} · {current.service_name}
                  </Text>
                  {current.client_name ? (
                    <View style={styles.clientRow}>
                      <Icon name="user-check" size={15} color={colors.success} />
                      <Text style={styles.clientName} numberOfLines={1}>{current.client_name}</Text>
                    </View>
                  ) : null}
                </View>

                {current.stage === 'ready' ? (
                  <View style={styles.payBox}>
                    <Text style={styles.payLabel}>{amountDue > 0 ? 'Collect' : 'Nothing to collect'}</Text>
                    {amountDue > 0 ? <Text style={styles.payAmount}>UGX {ugx(amountDue)}</Text> : null}
                    <Text style={styles.payMethod}>{payLine}</Text>
                  </View>
                ) : null}

                {Number(current.worker_points_to_award) > 0 ? (
                  <Text style={styles.pointsLine}>+{current.worker_points_to_award} points for you when it's paid</Text>
                ) : null}
              </Surface>
            ) : (
              <LinearGradient colors={orgTheme.freeWash} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.freeCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.freeTitle}>Ready for a car</Text>
                  <Text style={styles.freeMsg}>Take one below, or the next booking comes to you.</Text>
                </View>
                {/* The client home's car artwork, facing the same way. */}
                <Image
                  source={artFor('Full car wash').image}
                  style={[styles.freeArt, artFor('Full car wash').flip && { transform: [{ scaleX: -1 }] }]}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
              </LinearGradient>
            )}

            {/* ── Cars waiting ── */}
            <View>
              <SectionHeader
                title="Cars waiting"
                count={waiting.length}
                action={oldestMin != null && oldestMin >= 1 ? `Oldest ${oldestMin} min` : undefined}
              />
              {waiting.length === 0 ? (
                <Text style={styles.noneWaiting}>No cars waiting. New bookings show up here.</Text>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {waiting.map((w: any) => {
                    const total = w._total;
                    const left = Math.max(0, Math.ceil((w._endsAt - Date.now()) / 1000));
                    // One step at 15 s: colour and text change together.
                    const urgent = left <= 15;
                    const price = w.is_redemption ? (w.promo_key ? 'Free · 2-for-1' : 'Free') : `UGX ${ugx(w.quoted_amount_ugx)}`;
                    const method = METHOD_SHORT[w.declared_payment_method];
                    return (
                      <View key={w.id} style={styles.waitCard}>
                        <View style={styles.waitBody}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.waitCar} numberOfLines={1}>{w.vehicle_class_name} · {w.service_name}</Text>
                            <View style={styles.waitMetaRow}>
                              <Text style={[styles.waitMeta, { flexShrink: 1 }]} numberOfLines={1}>
                                {[w.plate, w.client_name, price].filter(Boolean).join(' · ')}
                              </Text>
                              {method && !w.is_redemption ? (
                                <View style={styles.methodChip}><Text style={styles.methodText}>{method}</Text></View>
                              ) : null}
                            </View>
                            <Text
                              style={[styles.waitTime, urgent && styles.waitTimeUrgent]}
                              accessibilityRole="timer"
                              accessibilityLabel={left > 0 ? `Goes to the next worker in ${left} seconds` : 'Assigning now'}
                            >
                              {left > 0 ? (
                                <>Goes to next worker in <Text style={styles.waitSeconds}>{left}s</Text></>
                              ) : 'Assigning…'}
                              {Number(w.worker_points_to_award) > 0 ? <Text style={styles.waitPts}>  ·  +{w.worker_points_to_award} pts</Text> : null}
                            </Text>
                          </View>
                          {/* Disabled with its reason rather than hidden, so a
                              busy worker still sees the queue and why they
                              can't take from it (ALICE restricted boards,
                              Uber Trip Radar). */}
                          <GradientButton
                            title="Take"
                            variant={current || !canAccept ? 'tonal' : 'primary'}
                            loading={taking === w.id}
                            onPress={() => (canAccept
                              ? takeCar(w.id)
                              : alert('Not your turn yet', current
                                ? `Finish ${current.plate || 'your current car'} first. Workers with fewer cars get new ones before you.`
                                : 'A worker with fewer cars gets this one first. It opens to you when the cars are shared evenly.'))}
                            style={canAccept ? styles.takeBtn : { ...styles.takeBtn, ...styles.takeMuted }}
                          />
                        </View>
                        {!canAccept ? (
                          <Text style={styles.waitNote}>
                            {current?.plate ? `Finish ${current.plate} first` : current ? 'Finish your current car first' : 'A worker with fewer cars gets it first'}
                          </Text>
                        ) : null}
                        <CountdownBar fraction={left / total} urgent={urgent} />
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── Cash to hand in · this week's board ── */}
            {/* Neutral, not alarm-coloured: cash in hand is the shift's net
                position, not a penalty (Toast shift review). */}
            {owes > 0 ? (
              <TouchableOpacity style={[styles.line, { backgroundColor: orgTheme.cashTint }]} activeOpacity={0.75} onPress={() => navigation.navigate('My Account')}>
                <View style={[styles.lineIcon, { backgroundColor: '#FFD9B8' }]}>
                  <Icon name="hand-holding-usd" size={18} color="#A84B0A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineTitle}>Cash to hand in: UGX {ugx(owes)}</Text>
                  <Text style={styles.lineSub}>Give it to your manager</Text>
                </View>
                <Icon name="chevron-right" size={15} color={staffText.muted} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={[styles.line, { backgroundColor: orgTheme.rankTint }]} activeOpacity={0.75} onPress={() => navigation.navigate('Leaderboard')}>
              <View style={[styles.lineIcon, { backgroundColor: '#fff' }]}>
                <GradientIcon name="trophy" size={18} colorsArr={colors.rewardIconGradient} start={colors.rewardIconGradientStart} end={colors.rewardIconGradientEnd} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineTitle}>{me ? `#${me.rank} this week` : 'This week'}</Text>
                <Text style={styles.lineSub}>{me ? `${ugx(me.points)} points · see the leaderboard` : 'Wash a car to get on the board'}</Text>
              </View>
              <Icon name="chevron-right" size={15} color={staffText.muted} />
            </TouchableOpacity>
          </ScrollView>

          {/* ── The one action for the current stage, near the thumb ── */}
          {current ? (
            <View style={[styles.dock, { paddingBottom: spacing.md + insets.bottom }]}>
              {current.stage === 'washing' ? (
                <SlideToConfirm label="Slide to finish washing" loading={busy} onConfirm={finishWashing} />
              ) : (
                <SlideToConfirm
                  tone="success"
                  label={amountDue > 0 ? 'Slide when payment is collected' : 'Slide to close this car'}
                  loading={busy}
                  onConfirm={confirmPayment}
                />
              )}
            </View>
          ) : null}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  // Today strip
  stripOuter: {
    borderRadius: radii.lg,
    shadowColor: orgTheme.shadowColor, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5,
    // Clips the gradient's square corners to the rounded border.
    overflow: 'hidden',
  },
  strip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, minHeight: 56,
  },
  stripIcon: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#FF7A1A',
    alignItems: 'center', justifyContent: 'center',
  },
  // The top line of the page, so a step above the cards under it
  // ("Ready for a car" is 16).
  stripLabel: { fontSize: 18, lineHeight: 24, fontWeight: weight.semibold, color: 'rgba(255,255,255,0.85)' },
  stripValue: { fontSize: 18, lineHeight: 24, fontWeight: weight.bold, color: '#fff', ...staffType.tabular, flex: 1, textAlign: 'right' },

  // Current car — the one card that asks for action: highest, heaviest shadow
  carCard: { gap: spacing.lg },
  carHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chip: { borderRadius: radii.full, paddingHorizontal: 10, paddingVertical: 4 },
  chipWashing: { backgroundColor: colors.warningSoft },
  chipReady: { backgroundColor: colors.successSoft },
  chipText: { ...staffType.caption },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timerText: { ...staffType.label, ...staffType.tabular, color: staffText.secondary },
  timerLate: { color: colors.error },
  carId: { gap: 6, alignItems: 'flex-start' },
  // Drawn like a number plate — boxed, bold, tracked — because that is what
  // the worker matches it against in the bay. The biggest text on the card.
  plate: {
    fontSize: 28, lineHeight: 34, fontWeight: weight.bold, color: colors.text, letterSpacing: 2,
    borderWidth: 2, borderColor: colors.ink[800], borderRadius: radii.sm,
    paddingHorizontal: 12, paddingVertical: 2, backgroundColor: '#FFF8D6', overflow: 'hidden',
  },
  carLine: { ...staffType.rowTitle },
  carLineBig: { fontSize: 24, lineHeight: 30, fontWeight: weight.bold, color: colors.text },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clientName: { ...staffType.secondary, fontWeight: weight.semibold, color: colors.successText },
  payBox: { padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.bg, gap: 2 },
  payLabel: { ...staffType.caption, color: staffText.secondary },
  payAmount: { ...staffType.hero },
  payMethod: { ...staffType.secondary },
  pointsLine: { ...staffType.meta, color: colors.primaryText, fontWeight: weight.semibold },

  freeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: orgTheme.freeBorder },
  freeArt: { width: 96, height: 74 },
  freeTitle: { ...staffType.rowTitle },
  freeMsg: { ...staffType.secondary, marginTop: 2 },

  // Waiting cars — lighter than the current car: flat, bordered
  noneWaiting: { ...staffType.secondary },
  waitCard: {
    backgroundColor: colors.bgCard, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight,
    overflow: 'hidden',
  },
  waitBody: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  waitCar: { ...staffType.rowTitle },
  waitMeta: { ...staffType.meta },
  waitMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  methodChip: { borderRadius: radii.full, paddingHorizontal: 8, paddingVertical: 1, backgroundColor: colors.bgSunken },
  methodText: { ...staffType.caption, color: staffText.secondary },
  waitTime: { ...staffType.meta, ...staffType.tabular, color: colors.primaryText, fontWeight: weight.semibold, marginTop: 6 },
  waitTimeUrgent: { color: colors.warningText },
  waitSeconds: { fontSize: 15, fontWeight: weight.bold },
  takeMuted: { opacity: 0.55 },
  waitPts: { color: staffText.muted, fontWeight: weight.regular },
  waitNote: { ...staffType.meta, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  takeBtn: { minWidth: 88, minHeight: 48 },

  // One-line rows: cash to hand in, leaderboard
  line: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bgCard, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderLight,
    padding: spacing.md, minHeight: 56,
  },
  lineIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  lineTitle: { ...staffType.rowTitle, ...staffType.tabular },
  lineSub: { ...staffType.meta, marginTop: 1 },

  // Docked action bar
  dock: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
});
