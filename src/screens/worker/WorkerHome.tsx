import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import GradientButton from '../../components/GradientButton';
import Badge from '../../components/Badge';
import ScreenHeader, { HeaderStat } from '../../components/ScreenHeader';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import ScannerSheet from '../../components/ScannerSheet';
import { Surface, SectionHeader, EmptyState, SkeletonList, FormSheet, PillPicker } from '../../components/ui';

const ugx = (n: any) => Number(n || 0).toLocaleString();

/** "9300m" means nothing on a busy forecourt — say it in hours and days. */
function minutesLabel(mins: any): string {
  const m = Math.max(0, Math.round(Number(mins) || 0));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) {
    const rem = m % 60;
    return rem ? `${h}h ${rem}m` : `${h} hr${h === 1 ? '' : 's'}`;
  }
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'}`;
}

export default function WorkerHome({ navigation }: any) {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const [shift, setShift] = useState<any>(null);
  const [queue, setQueue] = useState<any>({ washing: [], ready: [] });
  const [today, setToday] = useState<any>(null);
  const [vcs, setVcs] = useState<any[]>([]);
  const [selectedVc, setSelectedVc] = useState('');
  const [selectedSvc, setSelectedSvc] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [washModalVisible, setWashModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Scanning: the customer's QR carries a start token (new wash) or a pay
  // token (settle). `scanMode` says which flow the sheet is serving.
  const [scanMode, setScanMode] = useState<null | 'start' | 'pay' | 'attach'>(null);
  const [scanTarget, setScanTarget] = useState<any>(null);
  const [scanBusy, setScanBusy] = useState(false);
  // Token captured when a customer scans in before the service is chosen.
  const [pendingStartToken, setPendingStartToken] = useState<string | null>(null);
  // Worker's choice to spend a saved credit, offered when attaching a
  // customer to a car that was started without one.
  const [attachFree, setAttachFree] = useState(false);

  // Handover: settling a car a DIFFERENT worker started. The backend refuses
  // this without a reason (HANDOVER_CONFIRM_REQUIRED) — this state drives a
  // reason picker shown before whichever settle action was actually chosen,
  // and holds the chosen reason for that one action to read once and clear.
  const [handoverTarget, setHandoverTarget] = useState<any>(null);
  const [handoverAction, setHandoverAction] = useState<null | 'pay' | 'cash' | 'free'>(null);
  const [handoverReason, setHandoverReason] = useState<string>('');
  const [handoverBusy, setHandoverBusy] = useState(false);
  const pendingHandoverReasonRef = useRef<string | null>(null);

  const HANDOVER_REASONS = [
    { value: 'starter_off_shift', label: 'They went off shift' },
    { value: 'starter_on_break', label: 'They are on break' },
    { value: 'starter_phone_unusable', label: "Their phone isn't working" },
    { value: 'starter_left_for_day', label: 'They left for the day' },
    { value: 'other', label: 'Other reason' },
  ] as const;

  const selectedVehicleClass = vcs.find((v) => v.id === selectedVc);
  const availableServices = selectedVehicleClass?.services || [];
  const selectedService = availableServices.find((s: any) => s.id === selectedSvc);

  const load = useCallback(async () => {
    try {
      const [s, q, t, prices] = await Promise.allSettled([
        api.getCurrentShift(),
        api.getQueue(),
        api.getMyToday(),
        actor?.branch_id ? api.getEffectivePrices(actor.branch_id) : Promise.resolve(null),
      ]);
      // A rejected /current means "no open shift" (404), not a failure.
      if (s.status === 'fulfilled') setShift(s.value);
      else setShift(null);
      if (q.status === 'fulfilled') setQueue(q.value);
      if (t.status === 'fulfilled') setToday(t.value);
      if (prices.status === 'fulfilled' && prices.value) {
        setVcs(prices.value.vehicle_classes || []);
      }
      return s.status === 'fulfilled' ? s.value : null;
    } catch {}
    return null;
  }, [actor?.branch_id]);

  /**
   * The worker's day starts by itself. Cash still has to be attributable to a
   * person, so a shift is still opened — but the worker never sees or manages
   * it. Closing is the manager's job on their Cash Handover screen.
   */
  useEffect(() => {
    (async () => {
      const current = await load();
      // Only a shift with status 'open' can take washes. A leftover
      // 'pending_close' day still comes back from /current but is unusable,
      // and /shifts/open refuses while it exists — so it has to be cleared
      // first, otherwise the worker is stuck with "no open shift" forever.
      if (!current || current.status !== 'open') {
        try {
          if (current?.id && current.status === 'pending_close') {
            await api.reopenShift(current.id);
          } else {
            await api.openShift();
          }
          await load();
        } catch {
          // No branch assigned, or the server is unreachable — the retry card
          // below covers it, so nothing to report here.
        }
      }
      setInitialLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /** Manual retry for when the automatic day-start could not reach the server. */
  const retryStartDay = async () => {
    setLoading(true);
    try {
      await api.openShift();
      await load();
    } catch (e: any) {
      alert('Still could not start', e.message);
    }
    setLoading(false);
  };

  const startWash = async () => {
    if (!selectedVc) { alert('Select', 'Choose a car type'); return; }
    setLoading(true);
    try {
      // Sending start_token links the wash to the customer and marks it
      // verified. Without one the job is anonymous and earns no loyalty.
      // Whether this customer has a saved credit is not knowable until this
      // call returns — the token is a one-shot opaque code — so the choice to
      // redeem is offered afterward, not guessed at beforehand.
      const res = await api.startWash({
        vehicle_class_id: selectedVc,
        service_id: selectedSvc || undefined,
        start_token: pendingStartToken || undefined,
      });
      const washId = res?.wash_id;
      setWashModalVisible(false);
      setSelectedVc('');
      setSelectedSvc('');
      setPendingStartToken(null);
      await load();

      // The backend silently flags a likely double-scan (same car type and
      // service already sitting in the queue) but never blocks it — this was
      // returned and never shown, so a mis-scan looked like it "just worked"
      // with no way for the worker to know something needed a second look.
      if (res?.duplicate_warning) {
        alert(
          'Check this is not a repeat',
          'There is already a car of this same type and wash in the queue. If you scanned the wrong car, cancel this one from the queue.'
        );
      }

      // Only now do we know the customer's balance. Offer a one-tap way to
      // apply it to this exact car instead of telling the worker to redo it.
      const credits = Number(res?.loyalty?.free_wash_credits || 0);
      if (!res?.is_redemption && credits > 0 && washId) {
        alert(
          'This customer has a free wash saved',
          `They have ${credits} free wash${credits === 1 ? '' : 'es'} saved. Use one on this car now, or keep it for their next visit.`,
          [
            { text: 'Keep it saved', style: 'cancel' },
            {
              text: 'Use it now',
              onPress: async () => {
                try {
                  await api.applyFreeWash(washId);
                  await load();
                  alert('Free wash applied', 'This car is now free. Nothing to collect when it is finished.');
                } catch (e: any) {
                  alert('Could not apply', e.message);
                }
              },
            },
          ]
        );
      }
    } catch (e: any) { alert('Error', e.message); }
    setLoading(false);
  };

  /** Customer scanned in to begin — capture the token, then pick the service. */
  const onStartScan = (value: string) => {
    setPendingStartToken(value);
    setScanMode(null);
    setWashModalVisible(true);
  };

  /**
   * A car started by a different worker needs a handover reason before it can
   * be settled — the backend rejects it otherwise (HANDOVER_CONFIRM_REQUIRED).
   * This decides whether to ask for one, before the actual settle attempt.
   */
  const startedBySomeoneElse = (w: any) => !!actor?.id && !!w?.started_by_worker_id && w.started_by_worker_id !== actor.id;

  const requestHandoverReason = (w: any, action: 'pay' | 'cash' | 'free') => {
    setHandoverTarget(w);
    setHandoverAction(action);
    setHandoverReason('');
  };

  /** Reason chosen — dispatch to whichever settle action was actually requested. */
  const confirmHandover = async () => {
    if (!handoverTarget || !handoverAction) return;
    if (!handoverReason) { alert('Pick a reason', 'Choose why you are settling this car before continuing.'); return; }
    setHandoverBusy(true);
    const w = handoverTarget;
    const action = handoverAction;
    const reason = handoverReason;
    setHandoverTarget(null);
    setHandoverAction(null);
    setHandoverBusy(false);

    if (action === 'cash') {
      await runCashSettle(w, reason);
    } else if (action === 'free') {
      await runFreeSettle(w, reason);
    } else {
      // 'pay': the scanner needs to run next, with this reason attached to
      // the settle call it eventually makes.
      pendingHandoverReasonRef.current = reason;
      setScanTarget(w);
      setScanMode('pay');
    }
  };

  /** Customer is paying — the pay token settles the job as verified. */
  const onPayScan = async (value: string) => {
    setScanBusy(true);
    try {
      const handover_reason = pendingHandoverReasonRef.current || undefined;
      pendingHandoverReasonRef.current = null;
      await api.settleByToken({ pay_token: value, handover_reason });
      setScanMode(null);
      setScanTarget(null);
      await load();
      alert('Payment received', 'The car is paid for and the customer got their loyalty stamp.');
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/CLIENT_MISMATCH|belongs to a different/i.test(msg)) {
        alert(
          'This code is for a different car',
          'That customer\'s code belongs to another job. Check you scanned the code for the right car.'
        );
      } else if (/HANDOVER_CONFIRM_REQUIRED/i.test(msg) && scanTarget) {
        // Fallback in case a job's started_by_worker_id was stale client-side
        // — the backend is always the source of truth for who started it.
        const target = scanTarget;
        setScanMode(null);
        requestHandoverReason(target, 'pay');
        setScanBusy(false);
        return;
      } else {
        alert('Payment did not go through', msg);
      }
    }
    setScanBusy(false);
  };

  /** Attach a customer to a job that was started before they showed their code. */
  const onAttachScan = async (value: string, viaManual: boolean) => {
    if (!scanTarget) return;
    setScanBusy(true);
    try {
      // A typed value is a member code; a scanned one is a start token.
      const res = await api.attachClient(scanTarget.id, {
        ...(viaManual ? { member_code: value } : { start_token: value }),
        use_free_wash: attachFree || undefined,
      });
      setScanMode(null);
      setScanTarget(null);
      setAttachFree(false);
      await load();

      // Say exactly what happened. Attaching normally makes the wash EARN a
      // stamp — it does not make it free, which the old message implied.
      const credits = Number(res?.loyalty?.free_wash_credits || 0);
      if (res?.is_redemption) {
        alert('Free wash applied', 'This car is now free. Nothing to collect when it is finished.');
      } else if (credits > 0) {
        alert(
          'Customer added',
          `This car earns a stamp toward their next free wash.\n\nThey also have ${credits} free wash${credits === 1 ? '' : 'es'} saved. To use one on this car instead, add them again with "Use a free wash" ticked.`
        );
      } else {
        alert('Customer added', 'This car earns a stamp toward their free wash. Payment is still due.');
      }
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/NO_CREDITS|no free wash saved/i.test(msg)) {
        alert('No free wash saved', 'This customer has no free wash to use yet.');
      } else if (/CLIENT_NOT_FOUND|not found with this member code/i.test(msg)) {
        alert('Code not recognised', 'Check the code on the customer\'s phone and try again.');
      } else {
        alert('Could not add customer', msg);
      }
    }
    setScanBusy(false);
  };

/** Runs the actual cash/free settle call, with a handover reason if needed. */
  const runCashSettle = async (w: any, handoverReason?: string) => {
    setBusyId(w.id);
    try {
      await api.settle(w.id, { unverified_reason: 'no_app', handover_reason: handoverReason });
      await load();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/HANDOVER_CONFIRM_REQUIRED/i.test(msg)) {
        requestHandoverReason(w, 'cash');
      } else {
        alert('Error', msg);
      }
    }
    setBusyId(null);
  };

  /** Manual settle — no customer app involved, so it is flagged unverified. */
  const settleUnverified = (w: any) => {
    if (startedBySomeoneElse(w)) {
      requestHandoverReason(w, 'cash');
      return;
    }
    alert(
      'Take cash without a code?',
      `Mark #${w.job_no} as paid without scanning the customer's phone.\n\nYour manager will see this car on their report, and the customer gets no stamp toward a free wash.`,
      [
        { text: 'Go back', style: 'cancel' },
        { text: 'Yes, cash paid', onPress: () => runCashSettle(w) },
      ]
    );
  };

  /** Runs the free-wash close-out call, with a handover reason if needed. */
  const runFreeSettle = async (w: any, handoverReason?: string) => {
    setBusyId(w.id);
    try {
      await api.settle(w.id, { unverified_reason: 'no_app', handover_reason: handoverReason });
      await load();
      alert('Done', 'The free wash is closed and the credit has been used.');
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/HANDOVER_CONFIRM_REQUIRED/i.test(msg)) {
        requestHandoverReason(w, 'free');
      } else {
        alert('Error', msg);
      }
    }
    setBusyId(null);
  };

  /**
   * Close out a redeemed wash. There is no money to collect, so no pay token
   * is involved — the backend settles it at 0 and consumes the credit.
   */
  const finishFreeWash = (w: any) => {
    if (startedBySomeoneElse(w)) {
      requestHandoverReason(w, 'free');
      return;
    }
    alert(
      'Hand over the car?',
      `#${w.job_no} was paid with a free wash. Nothing to collect — this closes the job.`,
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Hand over', onPress: () => runFreeSettle(w) },
      ]
    );
  };

  const markDone = async (id: string) => {
    setBusyId(id);
    try {
      await api.washDone(id);
      await load();
    } catch (e: any) { alert('Error', e.message); }
    setBusyId(null);
  };

  const firstName = actor?.full_name?.split(' ')[0] || 'Worker';
  // Total finished today (paid + free) — used for the header tally.
  const settledCount = Number(today?.started_and_settled_by_me?.count || 0);
  // Paid only. Kept separate from freeGiven so the two figures on the card do
  // not count the same car twice.
  const paidCount = Number(
    today?.started_and_settled_by_me?.paid_count ??
      Math.max(0, Number(today?.started_and_settled_by_me?.count || 0) - Number(today?.started_and_settled_by_me?.free_count || 0))
  );
  const cashTaken = Number(today?.started_and_settled_by_me?.total_amount_ugx || 0);
  const handovers = Number(today?.started_by_me_settled_by_others?.length || 0);
  const freeGiven = Number(today?.started_and_settled_by_me?.free_count || 0);

  const expected = Number(shift?.expected_cash_ugx || 0);

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={firstName} subtitle={actor?.branch_name || 'Car Wash'} />
        <ScrollView contentContainerStyle={styles.body}>
          <SkeletonList rows={4} />
        </ScrollView>
      </View>
    );
  }

  // Longest-waiting car first in both lists. A worker deals with whatever has
  // been sitting longest, so newly added cars belong at the bottom — otherwise
  // the urgent ones get pushed off-screen and have to be scrolled to.
  const byLongestWait = (a: any, b: any) =>
    Number(b.elapsed_minutes || 0) - Number(a.elapsed_minutes || 0);

  const washingJobs = (queue.washing || [])
    .map((w: any) => ({ ...w, _type: 'washing' }))
    .sort(byLongestWait);
  const readyJobs = (queue.ready || [])
    .map((w: any) => ({ ...w, _type: 'ready' }))
    .sort(byLongestWait);
  const jobs = [...washingJobs, ...readyJobs];

  const renderJob = (w: any) => {
    const isReady = w._type === 'ready';
    const waitingTooLong = isReady && w.stale;
    const isFree = !!w.is_redemption;
    const notMine = startedBySomeoneElse(w);
    const accent = waitingTooLong ? colors.error : isReady ? colors.ready : colors.washing;

    return (
      <Surface key={w.id} elevation="sm" padded="sm" style={styles.job}>
        <View style={[styles.jobAccent, { backgroundColor: accent }]} />

        <View style={styles.jobBody}>
          {/* The car is what a worker recognises on the forecourt, so it
              leads. The job number is a reference, not an identity. */}
          <View style={styles.jobTop}>
            <Text style={styles.carType} numberOfLines={1}>{w.vehicle_class_name}</Text>
            <View style={{ flex: 1 }} />
            {isFree ? (
              <Text style={[styles.jobAmount, { color: colors.accent }]}>FREE</Text>
            ) : (
              <Text style={styles.jobAmount}>UGX {ugx(w.quoted_amount_ugx)}</Text>
            )}
          </View>

          <View style={styles.jobMetaRow}>
            <Text style={styles.serviceName} numberOfLines={1}>{w.service_name}</Text>
            <Text style={styles.jobNoSmall}>#{w.job_no}</Text>
            {isFree ? <Badge label="Free wash" tone="accent" small /> : null}
            {waitingTooLong ? <Badge label="Waiting too long" tone="error" dot small /> : null}
          </View>

          {notMine ? (
            <View style={styles.handoverNote}>
              <Icon name="exchange-alt" size={9} color={colors.info} />
              <Text style={styles.handoverNoteText}>Started by {w.worker_name}</Text>
            </View>
          ) : null}

          {w.client_name ? (
            <View style={styles.clientRow}>
              <Icon name="user-check" size={9} color={colors.success} />
              <Text style={styles.clientName} numberOfLines={1}>{w.client_name}</Text>
            </View>
          ) : null}

          <View style={styles.jobFooter}>
            <View style={styles.timeRow}>
              <Icon name="clock" size={10} color={waitingTooLong ? colors.error : colors.textMuted} />
              <Text style={[styles.jobTime, waitingTooLong && styles.jobTimeStale]}>
                {minutesLabel(w.elapsed_minutes)}
              </Text>
              {w.plate ? <Text style={styles.plate}>{w.plate}</Text> : null}
            </View>

            {isReady && isFree ? (
              // Nothing to collect — just close the job and release the car.
              <GradientButton
                title="Hand over car"
                variant="success"
                size="sm"
                icon="check"
                loading={busyId === w.id}
                onPress={() => finishFreeWash(w)}
              />
            ) : isReady ? (
              <GradientButton
                title="Take payment"
                variant="success"
                size="sm"
                icon="qrcode"
                onPress={() => {
                  // Ask up front, not after a failed scan — the worker
                  // already knows whose car this is at this point.
                  if (startedBySomeoneElse(w)) { requestHandoverReason(w, 'pay'); return; }
                  setScanTarget(w);
                  setScanMode('pay');
                }}
              />
            ) : (
              <GradientButton
                title="Finish washing"
                variant="dark"
                size="sm"
                icon="check"
                loading={busyId === w.id}
                onPress={() => markDone(w.id)}
              />
            )}
          </View>

          {/* Fallback row — an unlinked job can still be tied to a customer,
              and cash can still be taken without a code. */}
          <View style={styles.jobFallbacks}>
            {!w.client_name && (
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => { setScanTarget(w); setScanMode('attach'); }}
                activeOpacity={0.6}
              >
                <Icon name="user-plus" size={10} color={colors.info} />
                <Text style={[styles.linkText, { color: colors.info }]}>Add customer</Text>
              </TouchableOpacity>
            )}
            {isReady && !isFree && (
              <TouchableOpacity
                style={styles.linkBtn}
                disabled={busyId === w.id}
                onPress={() => settleUnverified(w)}
                activeOpacity={0.6}
              >
                <Icon name="money-bill-wave" size={10} color={colors.textMuted} />
                <Text style={styles.linkText}>Paid cash, no phone</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={`Hi, ${firstName}`} subtitle={actor?.branch_name || 'Car Wash'}>
        {shift ? (
          <>
            <HeaderStat label="Cash on you" value={ugx(expected)} icon="wallet" />
            <HeaderStat label="Cars finished" value={settledCount} icon="check-circle" />
          </>
        ) : null}
      </ScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* The day opens automatically, so this only appears if that failed —
            usually a connection problem or an account with no branch. */}
        {!shift ? (
          <Surface elevation="md" padded="lg" style={styles.closedCard}>
            <View style={styles.closedIcon}>
              <Icon name="exclamation-triangle" size={20} color={colors.warning} />
            </View>
            <Text style={styles.closedTitle}>Could not start your day</Text>
            <Text style={styles.closedSub}>
              Check your connection and try again. If it keeps failing, tell your manager.
            </Text>
            <GradientButton title="Try again" onPress={retryStartDay} loading={loading} icon="redo" size="lg" full style={{ marginTop: spacing.md }} />
          </Surface>
        ) : (
          <>
            {/* Scanning is the intended path — it verifies the customer and
                earns their loyalty. Starting manually stays available for
                walk-ins with no app. */}
            <GradientButton
              title="Scan customer code"
              onPress={() => setScanMode('start')}
              icon="qrcode"
              size="lg"
              full
            />
            <GradientButton
              title="No customer code"
              onPress={() => { setPendingStartToken(null); setWashModalVisible(true); }}
              variant="secondary"
              icon="plus"
              full
              style={{ marginTop: -spacing.sm }}
            />

            {/* ── Your day so far ── the cash figure is what a worker is
                actually accountable for, so it leads. */}
            <View>
              <SectionHeader title="Your day so far" icon="sun" />
              <Surface elevation="sm" style={{ gap: spacing.lg }}>
                <View style={styles.earnRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.earnLabel}>MONEY YOU TOOK TODAY</Text>
                    <View style={styles.earnAmountRow}>
                      <Text style={styles.earnCurrency}>UGX</Text>
                      <Text style={styles.earnAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                        {ugx(cashTaken)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.earnIcon}>
                    <Icon name="coins" size={15} color={colors.primary} />
                  </View>
                </View>

                <View style={styles.earnDivider} />

                <View style={styles.dayRow}>
                  <View style={styles.dayItem}>
                    <Text style={styles.dayValue}>{paidCount}</Text>
                    <Text style={styles.dayLabel}>Cars you finished{'\n'}and got paid for</Text>
                  </View>
                  <View style={styles.dayDivider} />
                  {/* Free washes explain why cash can be lower than car count */}
                  <View style={styles.dayItem}>
                    <Text style={[styles.dayValue, freeGiven > 0 && { color: colors.accent }]}>
                      {freeGiven}
                    </Text>
                    <Text style={styles.dayLabel}>Free washes{'\n'}you gave out</Text>
                  </View>
                  <View style={styles.dayDivider} />
                  <View style={styles.dayItem}>
                    <Text style={styles.dayValue}>{handovers}</Text>
                    <Text style={styles.dayLabel}>Cars you started{'\n'}someone else finished</Text>
                  </View>
                </View>
              </Surface>
            </View>
          </>
        )}

        {/* ── Cars being washed ── follows the real workflow: a car is washed
            first, then paid for. ── */}
        <View>
          <SectionHeader title="Cars being washed" count={washingJobs.length} icon="soap" />
          {washingJobs.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState
                icon="car"
                title="No cars being washed"
                message={shift ? 'Scan a customer code when the next car arrives.' : 'Tap "Start work" to begin.'}
              />
            </Surface>
          ) : (
            <View style={{ gap: spacing.sm }}>{washingJobs.map(renderJob)}</View>
          )}
        </View>

        {/* ── Waiting to be paid ── */}
        {readyJobs.length > 0 && (
          <View>
            <SectionHeader title="Waiting to be paid" count={readyJobs.length} icon="hand-holding-usd" />
            <View style={{ gap: spacing.sm }}>{readyJobs.map(renderJob)}</View>
          </View>
        )}

        {/* No end-of-day controls here by design. Handing in cash is the
            manager's job on their Cash Handover screen — the worker just
            works, and their day rolls over automatically. */}
      </ScrollView>

      {/* ── Start wash sheet ── */}
      <Modal visible={washModalVisible} animationType="slide" transparent onRequestClose={() => setWashModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setWashModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>New car</Text>

            {/* Make it obvious whether this job will be linked to a customer */}
            <View style={[styles.linkState, pendingStartToken ? styles.linkStateOn : styles.linkStateOff]}>
              <Icon
                name={pendingStartToken ? 'check-circle' : 'exclamation-circle'}
                size={12}
                color={pendingStartToken ? colors.success : colors.warning}
              />
              <Text style={[styles.linkStateText, { color: pendingStartToken ? colors.success : colors.warning }]}>
                {pendingStartToken
                  ? 'Customer scanned — they will get a stamp for this wash'
                  : 'No customer scanned — no stamp toward a free wash'}
              </Text>
            </View>

            {/* No "use a free wash" checkbox here: a scanned start-token is a
                one-shot opaque code — the backend only learns which customer
                it belongs to (and whether they have credits) once the wash is
                actually created. Offering the choice before that would let a
                worker tick it for a customer who has nothing saved, which is
                exactly the confusing failure this used to produce. The choice
                is offered right after starting instead, once it is known. */}

            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetLabel}>CAR TYPE</Text>
              <View style={styles.optionWrap}>
                {vcs.map((v) => {
                  const on = selectedVc === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => { setSelectedVc(v.id); setSelectedSvc(''); }}
                      style={[styles.chip, on && styles.chipOn]}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{v.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {selectedVc ? (
                <>
                  <Text style={[styles.sheetLabel, { marginTop: spacing.lg }]}>SERVICE</Text>
                  {availableServices.filter((s: any) => s.has_price).map((s: any) => {
                    const on = selectedSvc === s.id;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setSelectedSvc(s.id)}
                        style={[styles.svcRow, on && styles.svcRowOn]}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.radio, on && styles.radioOn]}>
                          {on ? <View style={styles.radioDot} /> : null}
                        </View>
                        <Text style={[styles.svcName, on && styles.svcNameOn]}>{s.name}</Text>
                        <Text style={[styles.svcPrice, on && styles.svcPriceOn]}>
                          UGX {ugx(s.price_ugx)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </>
              ) : null}
            </ScrollView>

            {/* Live quote so the worker confirms the price before committing */}
            {selectedService ? (
              <View style={styles.quote}>
                <Text style={styles.quoteLabel}>TOTAL</Text>
                <Text style={styles.quoteValue}>UGX {ugx(selectedService.price_ugx)}</Text>
              </View>
            ) : null}

            <View style={styles.sheetActions}>
              <GradientButton title="Cancel" variant="ghost" onPress={() => setWashModalVisible(false)} />
              <GradientButton title="Start washing" onPress={startWash} loading={loading} icon="play" style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── QR scanner ── one sheet serving all three scan flows ── */}
      <ScannerSheet
        visible={scanMode !== null}
        onClose={() => { setScanMode(null); setScanTarget(null); setAttachFree(false); }}
        busy={scanBusy}
        title={
          scanMode === 'pay' ? 'Take payment'
            : scanMode === 'attach' ? 'Add customer'
            : 'Scan customer code'
        }
        hint={
          scanMode === 'pay'
            ? `Ask the customer to tap "Pay now" on their phone for car #${scanTarget?.job_no}.`
            : scanMode === 'attach'
            ? 'Scan the code on their phone, or type their member code.'
            : 'Ask the customer to show the code on their phone before you start washing.'
        }
        manualLabel={scanMode === 'attach' ? 'Member code' : 'Code from their phone'}
        manualPlaceholder={scanMode === 'attach' ? 'MC-XXXXXX' : 'Type or paste the code'}
        extra={
          // Attaching late is the other moment a free wash can be applied,
          // so the choice is offered here rather than only at start.
          scanMode === 'attach' ? (
            <TouchableOpacity
              style={[styles.freeToggle, attachFree && styles.freeToggleOn, { marginTop: spacing.lg, marginBottom: 0 }]}
              onPress={() => setAttachFree((v) => !v)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, attachFree && styles.checkboxOn]}>
                {attachFree ? <Icon name="check" size={10} color="#fff" /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.freeToggleTitle, attachFree && { color: colors.accent }]}>
                  Use a free wash
                </Text>
                <Text style={styles.freeToggleSub}>
                  Leave this off and the car is paid for as normal — it just earns a stamp.
                </Text>
              </View>
            </TouchableOpacity>
          ) : null
        }
        onScanned={(value, viaManual) => {
          if (scanMode === 'pay') onPayScan(value);
          else if (scanMode === 'attach') onAttachScan(value, viaManual);
          else onStartScan(value);
        }}
      />

      {/* Handover reason — required whenever a worker settles a car someone
          else started. This is the piece that was entirely missing before:
          the backend has always required a reason here, but nothing in the
          app ever asked for one, so settling a colleague's job failed with a
          raw error and no way to proceed. */}
      <FormSheet
        visible={!!handoverTarget}
        onClose={() => { setHandoverTarget(null); setHandoverAction(null); }}
        title="Why are you settling this?"
        subtitle={
          handoverTarget
            ? `#${handoverTarget.job_no} was started by ${handoverTarget.worker_name}`
            : undefined
        }
        submitLabel="Continue"
        onSubmit={confirmHandover}
        submitting={handoverBusy}
      >
        <Text style={styles.handoverHint}>
          This car was started by a different worker. Pick why you are the one collecting payment — your manager sees this on the Handovers report.
        </Text>
        <PillPicker
          value={handoverReason}
          onChange={(v) => setHandoverReason(v)}
          options={HANDOVER_REASONS as unknown as { value: string; label: string }[]}
        />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  // Closed shift
  closedCard: { alignItems: 'center', gap: 6 },
  closedIcon: {
    width: 54, height: 54, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  closedTitle: { fontSize: font.lg, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  closedSub: { fontSize: font.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },

  // Job card
  job: { flexDirection: 'row', gap: spacing.md, overflow: 'hidden' },
  jobAccent: { width: 3, alignSelf: 'stretch', borderRadius: radii.full },
  jobBody: { flex: 1, gap: 5 },
  jobTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  carType: { fontSize: font.lg, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  jobAmount: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  jobMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  serviceName: { fontSize: font.sm, color: colors.textSecondary, fontWeight: weight.semibold },
  jobNoSmall: {
    fontSize: font.micro, fontWeight: weight.bold, color: colors.textMuted,
    backgroundColor: colors.bgSunken, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  jobDetail: { fontSize: font.sm, color: colors.textSecondary },
  jobFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  jobTime: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.semibold },
  jobTimeStale: { color: colors.error, fontWeight: weight.heavy },
  plate: {
    fontSize: font.micro, color: colors.textSecondary, fontWeight: weight.bold,
    backgroundColor: colors.bgSunken, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, marginLeft: 4, letterSpacing: 0.5,
  },

  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  clientName: { fontSize: font.xs, fontWeight: weight.bold, color: colors.success },

  // "Your day so far"
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  earnLabel: {
    fontSize: font.micro, fontWeight: weight.heavy,
    color: colors.textMuted, letterSpacing: tracking.capsWide, marginBottom: 4,
  },
  earnAmountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  earnCurrency: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.textMuted },
  earnAmount: { fontSize: font.display, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  earnIcon: {
    width: 38, height: 38, borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  earnDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight },
  dayRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dayItem: { flex: 1, gap: 3, paddingRight: spacing.sm },
  dayDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border, marginRight: spacing.md },
  dayValue: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  dayLabel: { fontSize: font.xs, color: colors.textSecondary, lineHeight: 15 },

  // Job fallback actions
  jobFallbacks: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  linkText: { fontSize: font.xs, fontWeight: weight.bold, color: colors.textMuted },

  // Link-state banner in the start sheet
  linkState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  linkStateOn: { backgroundColor: colors.successSoft },
  linkStateOff: { backgroundColor: colors.warningSoft },

  freeToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.bgSunken,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  freeToggleOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  checkbox: {
    width: 20, height: 20, borderRadius: 6,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  freeToggleTitle: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  freeToggleSub: { fontSize: font.xs, color: colors.textSecondary, lineHeight: 16, marginTop: 2 },
  handoverHint: { fontSize: font.sm, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.lg },
  handoverNote: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  handoverNoteText: { fontSize: font.xs, fontWeight: weight.semibold, color: colors.info },
  linkStateText: { flex: 1, fontSize: font.xs, fontWeight: weight.bold, lineHeight: 16 },

  // Shift footer
  shiftRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shiftInfo: { gap: 2 },
  shiftLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  shiftExpected: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text },
  shiftHint: { fontSize: font.xs, color: colors.textSecondary, lineHeight: 16, marginTop: 2 },

  // Sheets
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,14,28,0.55)' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '86%',
    ...shadow.lg,
  },
  grabber: {
    width: 38, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: font.xxl, fontWeight: weight.black, color: colors.text,
    letterSpacing: tracking.display, marginBottom: spacing.lg,
  },
  sheetScroll: { flexGrow: 0 },
  sheetLabel: {
    fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted,
    letterSpacing: tracking.capsWide, marginBottom: spacing.sm,
  },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: radii.full, backgroundColor: colors.bgSunken,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.ink[900], borderColor: colors.ink[900] },
  chipText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
  chipTextOn: { color: '#fff' },

  svcRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: 13, paddingHorizontal: spacing.md,
    borderRadius: radii.md, marginBottom: 6,
    backgroundColor: colors.bgSunken,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  svcRowOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  radio: {
    width: 19, height: 19, borderRadius: radii.full,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: radii.full, backgroundColor: colors.primary },
  svcName: { flex: 1, fontSize: font.regular, fontWeight: weight.semibold, color: colors.text },
  svcNameOn: { fontWeight: weight.bold },
  svcPrice: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
  svcPriceOn: { color: colors.primary },

  quote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.ink[900], borderRadius: radii.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  quoteLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.6)', letterSpacing: tracking.capsWide },
  quoteValue: { fontSize: font.xl, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },

  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },

  expectedBox: {
    backgroundColor: colors.bgSunken, borderRadius: radii.md,
    padding: spacing.lg, gap: 3,
  },
  expectedLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  expectedValue: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bgSunken, borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5, borderColor: colors.border,
  },
  inputPrefix: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.textMuted },
  input: {
    flex: 1, paddingVertical: 15, fontSize: font.xl,
    fontWeight: weight.heavy, color: colors.text,
  },
  diffBox: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  diffText: { fontSize: font.sm, fontWeight: weight.heavy },
});
