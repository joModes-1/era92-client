import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Vibration, Image, Switch, BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, spacing, weight, staffType, staffText, brandTheme, soft, tint, jk, offer as O } from '../../theme';
import AppTopBar from '../../components/AppTopBar';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import { artFor } from '../client/serviceArt';
import { Surface, SkeletonList, SlideToConfirm, StageStepper } from '../../components/ui';
import { IconChip, Pill } from '../../components/admin/kit';
import LineIcon from '../../components/admin/LineIcon';
import { OfferCard, OfferFullScreen, OfferClosed } from './WorkerOffer';

/**
 * The worker's home (design: "Worker home, job offer, countdown, timed out"):
 *
 *  A. No job yet — today's takings, the on-duty switch, "Ready for a car",
 *     cars waiting (none), cash to hand in, the week's rank, and what was
 *     done today.
 *  B. A job is offered — the offer inline, with a swipe to take it and a
 *     countdown to when it goes to the next worker.
 *  C. The same offer full screen, the moment it arrives for a free worker.
 *  D. The offer timed out (or someone else took it first).
 *
 * The car the worker is on keeps its own card — its stage on a stepper, the
 * plate, the amount to collect — with the one action docked at the bottom as
 * "Slide to …". A shift still opens automatically in the background: wash-done
 * and settle both require one server-side.
 */

const METHOD_LABEL: Record<string, string> = { cash: 'Cash', mtn: 'MTN Mobile Money', airtel: 'Airtel Money', points: 'Points' };
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
    case 'OFF_DUTY': return 'You are off duty. Switch duty back on to take cars.';
    case 'ALREADY_CLAIMED': return 'Someone else just took this car.';
    default: return e?.message || 'Something went wrong. Try again.';
  }
}

/** Whole minutes since a time, for the stage timer. */
function minutesSince(iso?: string) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

const hhmm = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** A number in a round badge: "Cars waiting 0" (dark), "Done today 3" (green). */
function CountBadge({ n, color }: { n: number; color: string }) {
  return (
    <View style={[styles.countBadge, { backgroundColor: color }]}>
      <Text style={styles.countText}>{n}</Text>
    </View>
  );
}

export default function WorkerHome({ navigation }: any) {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<any>(null);
  const [waiting, setWaiting] = useState<any[]>([]);
  const [canAccept, setCanAccept] = useState(true);
  const [dutyOn, setDutyOn] = useState(true);
  const [online, setOnline] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [doneToday, setDoneToday] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [board, setBoard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taking, setTaking] = useState<string | null>(null);
  // The offer showing full screen, and the one that has just closed.
  const [fullId, setFullId] = useState<string | null>(null);
  const [closed, setClosed] = useState<{ wash: any; taken: boolean } | null>(null);
  const [, setTick] = useState(0);
  // Cars already seen, so only a newly takeable one buzzes the phone.
  const seen = useRef<Set<string> | null>(null);
  // Offers already put full screen once — Pass must not bring one back.
  const opened = useRef<Set<string>>(new Set());
  // Offers this worker could take, as last seen: what to show if one ends.
  const lastSeen = useRef<Map<string, any>>(new Map());
  const fullRef = useRef<string | null>(null);
  const refreshingAtZero = useRef(false);

  const showFull = (id: string | null) => { fullRef.current = id; setFullId(id); };

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
        const dispatch = queue.dispatch || {};
        const on = dispatch.on_duty !== false;
        const free = !(washing[0] || ready[0]);
        const takeable = dispatch.can_accept !== false;
        const ids = new Set<string>(requested.map((x: any) => x.id));

        // An offer this worker was looking at has gone. If it is now their
        // own car, nothing to say; if it was open full screen, say what
        // happened to it.
        const mineNow = new Set<string>([...washing, ...ready].map((x: any) => x.id));
        lastSeen.current.forEach((o, id) => {
          if (ids.has(id)) return;
          if (fullRef.current === id) {
            showFull(null);
            if (!mineNow.has(id)) setClosed({ wash: o, taken: o._endsAt - Date.now() > 3000 });
          }
        });
        lastSeen.current = new Map(requested.filter(() => on && takeable).map((x: any) => [x.id, x]));

        // A new job for a free worker takes over the screen, once.
        const buzz = seen.current && free && takeable && on && requested.some((x: any) => !seen.current!.has(x.id));
        if (free && takeable && on && !fullRef.current) {
          const fresh = requested.find((x: any) => !opened.current.has(x.id));
          if (fresh) {
            opened.current.add(fresh.id);
            showFull(fresh.id);
          }
        }
        // One buzz when a car a free worker can take appears — nothing during
        // the countdown (Android haptics: strong buzzing only for attention).
        if (buzz) Vibration.vibrate(400);
        seen.current = new Set(ids);

        setCurrent(washing[0] || ready[0] || null);
        setWaiting(requested);
        setCanAccept(takeable);
        setDutyOn(on);
        setOnline(Number(dispatch.workers_online || 0));
        setStats(dispatch.stats || null);
        setDoneToday(Array.isArray(queue.done_today) ? queue.done_today : []);
        if (!on) showFull(null);
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

  // The phone's back button closes a full-screen offer or the closed screen
  // rather than leaving the app.
  useEffect(() => {
    if (!fullId && !closed) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (closed) setClosed(null); else showFull(null);
      return true;
    });
    return () => sub.remove();
  }, [fullId, closed]);

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
      showFull(null);
      await load();
    } catch (e: any) {
      alert('Could not take this car', friendlyError(e));
      showFull(null);
      await load();
    }
    setTaking(null);
  };

  const toggleDuty = async (on: boolean) => {
    setDutyOn(on);
    if (!on) showFull(null);
    try {
      await api.setDuty(on);
      await load();
    } catch (e: any) {
      setDutyOn(!on);
      alert('Could not change duty', friendlyError(e));
    }
  };

  // Paid through PesaPal already: the money is in, there is nothing to collect.
  const paidOnline = !!current?.paid_online_at;
  const amountDue = current
    ? (current.is_redemption || paidOnline ? 0 : Number(current.quoted_amount_ugx) - Number(current.points_value_ugx || 0))
    : 0;
  const stageIndex = current?.stage === 'ready' ? 1 : 0;
  const stageMinutes = current ? minutesSince(current.stage === 'ready' ? current.wash_done_at : current.started_at) : null;
  const stale = current?.stage === 'ready' && !!current?.stale;

  const carsToday = doneToday.length;
  const takingsToday = doneToday.reduce((t: number, r: any) => t + Number(r.amount_ugx || 0), 0);
  const me = board.find((r: any) => r.id === actor?.id);
  const owes = Number(wallet?.owes_ugx || 0);

  const payLine = !current ? '' : paidOnline ? `Paid online by the client${current.online_payment_ref ? ` · ref ${current.online_payment_ref}` : ''}` : amountDue > 0
    ? (METHOD_LABEL[current.declared_payment_method]
      ? `Client chose ${METHOD_LABEL[current.declared_payment_method]}`
      : "Client hasn't chosen how to pay yet")
    : current.is_redemption ? (current.promo_key ? 'Free · 2-for-1 offer' : 'Free wash') : 'Paid with points';

  /** Why a worker who can see an offer can't swipe to take it. */
  const whyNot = !dutyOn
    ? "You're off duty — switch duty on to take cars"
    : current?.plate ? `Finish ${current.plate} first`
    : current ? 'Finish your current car first'
    : 'A worker with fewer cars gets it first';

  const full = waiting.find((w: any) => w.id === fullId) || null;
  const leftOf = (w: any) => Math.max(0, Math.ceil((w._endsAt - Date.now()) / 1000));
  // Design B leaves the duty row out while an offer is up — unless the worker
  // is off duty, when it is the one way back on.
  const showDuty = !dutyOn || waiting.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            {/* ── Today ── */}
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('My Account')}
              accessibilityRole="button"
              accessibilityLabel={`Today: ${carsToday} cars, UGX ${ugx(takingsToday)}. Open My Account`}
            >
              <View style={styles.line}>
                <IconChip icon="coins" tone="warning" square />
                <Text style={styles.cardTitle}>Today</Text>
                <Text style={styles.cardRight} numberOfLines={1}>
                  {carsToday} {carsToday === 1 ? 'car' : 'cars'} · UGX {ugx(takingsToday)}
                </Text>
                <LineIcon name="chevron-right" size={13} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* ── On duty ── */}
            {showDuty ? (
              <View style={styles.card}>
                <View style={styles.line}>
                  <IconChip icon="bolt" tone={dutyOn ? 'success' : 'neutral'} square />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{dutyOn ? "You're on duty" : "You're off duty"}</Text>
                    <Text style={styles.cardSub}>
                      {dutyOn
                        ? `New jobs reach you first. ${online} ${online === 1 ? 'worker' : 'workers'} online.`
                        : `You won't be offered new cars. ${online} ${online === 1 ? 'worker' : 'workers'} online.`}
                    </Text>
                  </View>
                  <Switch
                    value={dutyOn}
                    onValueChange={toggleDuty}
                    trackColor={{ false: colors.border, true: O.duty }}
                    thumbColor="#fff"
                    ios_backgroundColor={colors.border}
                    {...({ activeThumbColor: '#fff', activeTrackColor: O.duty } as any)}
                    accessibilityLabel="On duty"
                  />
                </View>
              </View>
            ) : null}

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
                    <Text style={styles.payLabel}>{amountDue > 0 ? 'Collect' : paidOnline ? 'Paid online' : 'Nothing to collect'}</Text>
                    {amountDue > 0 ? <Text style={styles.payAmount}>UGX {ugx(amountDue)}</Text> : null}
                    <Text style={styles.payMethod}>{payLine}</Text>
                  </View>
                ) : null}

                {Number(current.worker_points_to_award) > 0 ? (
                  <Text style={styles.pointsLine}>+{current.worker_points_to_award} points for you when it's paid</Text>
                ) : null}
              </Surface>
            ) : (
              <LinearGradient colors={['#EEF1FF', '#F4F0FF']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.freeCard}>
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
            <View style={{ gap: 12 }}>
              <View style={styles.sectionRow}>
                <Text style={styles.section}>Cars waiting</Text>
                <CountBadge n={waiting.length} color={colors.text} />
              </View>
              {waiting.length === 0 ? (
                <Text style={styles.noneWaiting}>No cars waiting. New bookings show up here.</Text>
              ) : (
                waiting.map((w: any) => (
                  <OfferCard
                    key={w.id}
                    wash={w}
                    left={leftOf(w)}
                    total={w._total}
                    canTake={canAccept && dutyOn}
                    why={whyNot}
                    taking={taking === w.id}
                    onTake={() => takeCar(w.id)}
                    onOpen={() => showFull(w.id)}
                  />
                ))
              )}
            </View>

            {/* ── Cash to hand in ── */}
            {owes > 0 ? (
              <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => navigation.navigate('My Account')} accessibilityRole="button">
                <View style={styles.line}>
                  <IconChip icon="money-bill-wave" tone="warning" square />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Cash to hand in: UGX {ugx(owes)}</Text>
                    <Text style={styles.cardSub}>Give it to your manager</Text>
                  </View>
                  <Pill tone="warn" label="Hand over" />
                </View>
              </TouchableOpacity>
            ) : null}

            {/* ── This week's board ── */}
            <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => navigation.navigate('Leaderboard')} accessibilityRole="button">
              <View style={styles.line}>
                <IconChip icon="trophy" tone="warning" square />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{me ? `#${me.rank} this week` : 'This week'}</Text>
                  <Text style={styles.cardSub}>
                    {me ? `${ugx(me.points)} points · see the leaderboard` : 'Wash a car to get on the board'}
                  </Text>
                </View>
                <LineIcon name="chevron-right" size={13} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* ── Done today ── */}
            {doneToday.length > 0 ? (
              <View style={{ gap: 12 }}>
                <View style={styles.sectionRow}>
                  <Text style={styles.section}>Done today</Text>
                  <CountBadge n={doneToday.length} color={O.duty} />
                </View>
                <View style={[styles.card, { paddingVertical: 4 }]}>
                  {doneToday.map((r: any, i: number) => (
                    <View key={r.id} style={[styles.doneRow, i === doneToday.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.donePlate} numberOfLines={1}>{r.plate || r.job_no}</Text>
                        <Text style={styles.doneSub} numberOfLines={1}>
                          {[r.vehicle_class_name, r.service_name, hhmm(r.settled_at)].filter(Boolean).join(' · ')}
                        </Text>
                      </View>
                      {Number(r.worker_points_to_award) > 0 ? (
                        <View style={styles.ptsPill}><Text style={styles.ptsText}>+{r.worker_points_to_award} pts</Text></View>
                      ) : null}
                      <Text style={styles.doneAmount}>{ugx(r.amount_ugx)}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
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

      {/* ── C: a new job takes over the screen ── */}
      {full && dutyOn ? (
        <OfferFullScreen
          branch={actor?.branch_name}
          wash={full}
          left={leftOf(full)}
          total={full._total}
          taking={taking === full.id}
          onTake={() => takeCar(full.id)}
          onPass={() => showFull(null)}
        />
      ) : null}

      {/* ── D: it went to someone else ── */}
      {closed ? (
        <OfferClosed
          branch={actor?.branch_name}
          wash={closed.wash}
          taken={closed.taken}
          stats={stats}
          onBack={() => setClosed(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: 14 },

  // White cards on the page, as on the admin pages.
  card: { backgroundColor: colors.bgCard, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 14, ...soft.cardShadow },
  line: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 15, ...jk.bold, color: colors.text },
  cardSub: { fontSize: 12, lineHeight: 17, ...jk.medium, color: colors.textSecondary, marginTop: 2 },
  cardRight: { flex: 1, fontSize: 15, ...jk.bold, color: colors.text, textAlign: 'right', ...staffType.tabular },

  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { fontSize: 18, ...jk.heavy, color: colors.text },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, ...jk.bold, color: '#fff' },
  noneWaiting: { fontSize: 13, ...jk.medium, color: colors.textSecondary, marginTop: -4 },

  freeCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: 20, borderWidth: 1, borderColor: '#E3E6F7' },
  freeArt: { width: 96, height: 74 },
  freeTitle: { fontSize: 17, ...jk.heavy, color: colors.text },
  freeMsg: { fontSize: 13, lineHeight: 18, ...jk.medium, color: colors.textSecondary, marginTop: 4 },

  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: soft.line },
  donePlate: { fontSize: 15, ...jk.bold, color: colors.text },
  doneSub: { fontSize: 12, ...jk.medium, color: colors.textSecondary, marginTop: 2 },
  ptsPill: { backgroundColor: tint.success.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ptsText: { fontSize: 11, ...jk.bold, color: tint.success.text },
  doneAmount: { minWidth: 54, textAlign: 'right', fontSize: 15, ...jk.bold, color: colors.text, ...staffType.tabular },

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
    paddingHorizontal: 12, paddingVertical: 2, backgroundColor: colors.warningSoft, overflow: 'hidden',
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

  // Docked action bar
  dock: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
});
