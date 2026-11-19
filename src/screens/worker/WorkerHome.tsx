import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Vibration, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, spacing, soft } from '../../theme';
import { HomeTopBar } from '../client/HomeParts';
import { useAppAlert } from '../../components/AppAlert';
import { SkeletonList, SlideToConfirm } from '../../components/ui';
import { OfferCard, OfferFullScreen, OfferClosed } from './WorkerOffer';
import CurrentCarCard from './WorkerCar';
import { DutyBar, StatusCard, QuickTiles, DoneToday, SectionTitle } from './WorkerHomeParts';

/**
 * The worker's home (design: "Worker home, job offer, countdown, timed out"):
 *
 *  A. No job yet — the on-duty switch, "Ready for a car",
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
  const stageMinutes = current ? minutesSince(current.stage === 'ready' ? current.wash_done_at : current.started_at) : null;
  const stale = current?.stage === 'ready' && !!current?.stale;

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeTopBar
        branch={actor?.branch_name || 'Car Wash'}
        points={Number(me?.points || 0)}
        onPoints={() => navigation.navigate('Leaderboard')}
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
            {/* ── The duty switch ── */}
            <DutyBar dutyOn={dutyOn} online={online} onToggle={() => toggleDuty(!dutyOn)} />

            {/* ── The car you're on, or where you stand ── */}
            {current ? (
              <CurrentCarCard
                car={current}
                minutes={stageMinutes}
                stale={stale}
                amountDue={amountDue}
                paidOnline={paidOnline}
                payLine={payLine}
              />
            ) : (
              <StatusCard dutyOn={dutyOn} waiting={waiting.length} onGoOnDuty={() => toggleDuty(true)} />
            )}

            {/* ── Cars waiting (only when there are some) ── */}
            {waiting.length > 0 ? (
              <View style={{ gap: 10 }}>
                <SectionTitle title="Cars waiting" meta={`${waiting.length} ${waiting.length === 1 ? 'car' : 'cars'}`} />
                {waiting.map((w: any) => (
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
                    busyWithCar={!!current}
                  />
                ))}
              </View>
            ) : null}

            {/* ── Cash to hand in · this week ── */}
            <QuickTiles
              owes={owes}
              rank={me ? Number(me.rank) : null}
              weekPoints={Number(me?.points || 0)}
              onCash={() => navigation.navigate('My Account')}
              onBoard={() => navigation.navigate('Leaderboard')}
            />

            {/* ── Done today ── */}
            {doneToday.length > 0 ? <DoneToday rows={doneToday} /> : null}
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
  // White top to bottom, as on the client home.
  container: { flex: 1, backgroundColor: soft.page },
  body: { padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl, gap: 16 },

  // Docked action bar
  dock: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
});
