import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import GradientButton from '../../components/GradientButton';
import Badge from '../../components/Badge';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HomeTopBar, RewardsBanner, ServiceTile, ScanBar, RecentRow, PromptRow, PromoCard,
  SuccessToast,
} from './HomeParts';
import PointsSheet from './PointsSheet';
import StartWashFlow from './StartWashFlow';
import PaymentSheet from './PaymentSheet';
import PaymentReceipt from './PaymentReceipt';
import Icon from '../../components/Icon';
import { useAppAlert, AlertHost } from '../../components/AppAlert';
import ScannerSheet from '../../components/ScannerSheet';
import NotificationPrompt from '../../components/NotificationPrompt';
import { Surface, SectionHeader, EmptyState, SkeletonList, FormSheet, PillPicker, Field } from '../../components/ui';

const ugx = (n: any) => Number(n || 0).toLocaleString();

/**
 * Short form for headline figures: 200000 → "200K", 1500000 → "1.5M".
 * Only for display where space is tight and the exact shillings do not
 * matter — never for an amount someone is paying or reconciling.
 */
const compactUgx = (n: number) => {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${m % 1 === 0 ? m : m.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    return `${k % 1 === 0 ? k : k.toFixed(1)}K`;
  }
  return String(n);
};

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
  const insets = useSafeAreaInsets();
  const alert = useAppAlert();
  const [shift, setShift] = useState<any>(null);
  const [points, setPoints] = useState<any>(null);
  const [queue, setQueue] = useState<any>({ washing: [], ready: [], requested: [] });
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
  /** The pay token just scanned, kept for a handover retry. */
  const pendingScanTokenRef = useRef<string | null>(null);

  // Taking payment: which job is being paid for, and the receipt shown
  // afterwards as its own page.
  const [payTarget, setPayTarget] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  /** Shown over the home screen after the receipt is dismissed. */
  const [toast, setToast] = useState<{ points?: number | null } | null>(null);
  const [pointsOpen, setPointsOpen] = useState(false);

  // Cancelling a job. The backend has always accepted this (and the org admin
  // has a Cancellations report reading the results) but nothing in the app
  // ever called it — so a car started by mistake had no way out, and that
  // report could only ever be empty.
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelNote, setCancelNote] = useState('');
  const [cancelBusy, setCancelBusy] = useState(false);

  // Mirrors the backend's cancelSchema enum exactly — a value it does not
  // recognise is rejected outright.
  const CANCEL_REASONS = [
    { value: 'started_by_mistake', label: 'Started by mistake' },
    { value: 'client_left', label: 'Customer left' },
    { value: 'wrong_car_type_restart', label: 'Wrong car type — redoing it' },
    { value: 'client_refused_price', label: 'Customer refused the price' },
    { value: 'other', label: 'Other' },
  ];

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
      const [s, q, t, prices, pts] = await Promise.allSettled([
        api.getCurrentShift(),
        api.getQueue(),
        api.getMyToday(),
        actor?.branch_id ? api.getEffectivePrices(actor.branch_id) : Promise.resolve(null),
        api.myPoints(),
      ]);
      // Points are a nice-to-have on this screen: if the scheme is off or
      // the call fails, the rest of the day's work still has to load.
      if (pts.status === 'fulfilled') setPoints(pts.value);
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

  const startWash = async (draft: {
    vehicle_class_id: string;
    service_id: string;
    plate?: string;
    vehicle_color?: string;
  }) => {
    if (!draft.vehicle_class_id) { alert('Select', 'Choose a car type'); return; }
    setLoading(true);
    try {
      // Sending start_token links the wash to the customer and marks it
      // verified. Without one the job is anonymous and earns no loyalty.
      // Whether this customer has a saved credit is not knowable until this
      // call returns — the token is a one-shot opaque code — so the choice to
      // redeem is offered afterward, not guessed at beforehand.
      const res = await api.startWash({
        vehicle_class_id: draft.vehicle_class_id,
        service_id: draft.service_id || undefined,
        plate: draft.plate,
        vehicle_color: draft.vehicle_color,
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
    } catch (e: any) {
      // A start token is single-use and short-lived. Keeping it in state
      // after a failure meant every retry resent the same dead token and
      // failed identically — the worker was stuck on "Invalid or expired
      // start token" until they restarted the app. Dropping it here lets
      // the next attempt go through as an ordinary walk-in.
      if (/BAD_TOKEN|expired start token/i.test(String(e?.message || ''))) {
        setPendingStartToken(null);
        alert(
          'That code has expired',
          'The customer\'s code is no longer valid — they can show a fresh one, or you can book this car without it.'
        );
      } else {
        alert('Error', e.message);
      }
    }
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

  const requestCancel = (w: any) => {
    setCancelTarget(w);
    setCancelReason('');
    setCancelNote('');
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    if (!cancelReason) {
      alert('Pick a reason', 'Choose why this car is being cancelled.');
      return;
    }
    // 'Other' with no explanation tells the manager nothing at all.
    if (cancelReason === 'other' && cancelNote.trim().length < 3) {
      alert('Say what happened', 'You picked Other — add a short note so your manager knows why.');
      return;
    }
    setCancelBusy(true);
    const w = cancelTarget;
    try {
      await api.cancelWash(w.id, cancelReason, cancelNote.trim() || undefined);
      setCancelTarget(null);
      await load();
      alert('Car cancelled', `#${w.job_no} has been cancelled. No payment is due.`);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (e?.code === 'BAD_STATE' || /BAD_STATE|Cannot cancel/i.test(msg)) {
        // Almost always because it was paid for on another device while this
        // card was still on screen.
        alert('Too late to cancel', 'This car has already been paid for. Ask a manager to reverse it instead.');
        await load();
      } else {
        alert('Could not cancel', msg);
      }
    }
    setCancelBusy(false);
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
      pendingHandoverReasonRef.current = reason;

      // If this handover was discovered BY scanning, the customer's code is
      // already in hand — replay it rather than making them present the same
      // QR a second time just to answer a question the worker was asked.
      const scanned = pendingScanTokenRef.current;
      if (scanned) {
        await onPayScan(scanned);
        return;
      }

      // Otherwise the worker tapped "Take payment" on a card, so the scanner
      // still has to run to get a code at all.
      setScanTarget(w);
      setScanMode('pay');
    }
  };

  /** Customer is paying — the pay token settles the job as verified. */
  const onPayScan = async (value: string) => {
    setScanBusy(true);
    // Held so that, if the server comes back asking for a handover reason,
    // the same token can be replayed once the reason is chosen. A pay token
    // is one-shot but is only consumed on a SUCCESSFUL settle, so replaying
    // a rejected one is safe.
    pendingScanTokenRef.current = value;
    try {
      const handover_reason = pendingHandoverReasonRef.current || undefined;
      pendingHandoverReasonRef.current = null;
      await api.settleByToken({ pay_token: value, handover_reason });
      pendingScanTokenRef.current = null;
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
      } else if (e?.code === 'HANDOVER_CONFIRM_REQUIRED' || /HANDOVER_CONFIRM_REQUIRED/i.test(msg)) {
        // This is the normal way a handover begins: the customer presents
        // their code and it turns out a different worker started the car.
        // The job is deliberately absent from this worker's list, so there
        // is no card to fall back on — the server tells us who started it
        // and which job it is, and that is enough to ask for a reason.
        // (Previously this branch required scanTarget, which is only set
        // when tapping a card you can already see, so scanning a colleague's
        // job fell through to a generic "did not go through" error.)
        const d = e?.details || {};
        setScanMode(null);
        requestHandoverReason(
          scanTarget || {
            id: d.wash_id,
            job_no: d.job_no,
            worker_name: d.starter_name,
            _scannedToken: pendingScanTokenRef.current,
          },
          'pay'
        );
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
  const runCashSettle = async (w: any, handoverReason?: string, payment?: { method: string; phone?: string }) => {
    setBusyId(w.id);
    try {
      const res = await api.settle(w.id, {
        unverified_reason: 'no_app',
        handover_reason: handoverReason,
        payment_method: payment?.method,
        payer_phone: payment?.phone,
      });
      // Close the payment sheet and show the receipt as its own page — it
      // is what the worker holds up to the customer, so it should not be a
      // panel inside the sheet they just used.
      if (payment) {
        setPayTarget(null);
        setReceipt({
          reference: res?.receipt_no || 'Recorded',
          item: `${w.vehicle_class_name || 'Car'} · ${w.service_name || 'Wash'}`,
          paymentType: payment.method === 'mtn' ? 'MTN MoMo'
            : payment.method === 'airtel' ? 'Airtel Money' : 'Cash',
          recipient: actor?.org_name || actor?.branch_name || '92 CarWash',
          amountUgx: Number(res?.amount_ugx ?? w.quoted_amount_ugx ?? 0),
          pointsEarned: res?.worker_points?.earned ?? null,
        });
      }
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

  /**
   * Claims a client's self-service booking. Visible to every worker at the
   * branch regardless of their own busy state — only the tap itself is
   * gated, by the backend's own open-shift + zero-in-progress check, so a
   * busy worker gets a clear WORKER_BUSY error rather than the section
   * disappearing unpredictably under them.
   */
  const acceptRequest = async (id: string) => {
    setBusyId(id);
    try {
      await api.acceptWash(id);
      await load();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/WORKER_BUSY/i.test(msg)) {
        alert('Finish your current car first', 'You can only have one wash in progress at a time.');
      } else if (/ALREADY_CLAIMED/i.test(msg)) {
        alert('Already taken', 'Another worker just accepted this request.');
        await load();
      } else {
        alert('Could not accept this request', msg);
      }
    }
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

  /**
   * The four service tiles at the top of the home screen.
   *
   * Built from the first vehicle class's services purely to have real names
   * and prices to show; the actual car type is chosen on the next screen.
   *
   * These memos must stay ABOVE the `initialLoading` early return: a hook
   * that only runs on some renders breaks React's hook ordering, which is
   * what rendered this screen blank.
   */
  const serviceTiles = React.useMemo(() => {
    const firstClass = vcs[0];
    const list = (firstClass?.services || []).filter((s: any) => s.has_price);
    return list.slice(0, 4);
  }, [vcs]);

  /** Today's finished jobs, newest first, for the "Recent washes" list. */
  const recentWashes = React.useMemo(() => {
    const done = (today?.recent || today?.settled || []) as any[];
    return Array.isArray(done) ? done.slice(0, 4) : [];
  }, [today]);

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeTopBar
          branch={actor?.branch_name || 'Car Wash'}
          points={0}
          onPoints={() => {}}
          onMenu={() => navigation.openDrawer?.()}
        />
        <ScrollView contentContainerStyle={styles.body}>
          <SkeletonList rows={4} />
        </ScrollView>
      </SafeAreaView>
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

  // The queue is branch-wide on purpose — that is what lets one worker settle
  // a car another started when the starter goes off shift. But showing every
  // colleague's car in the same undifferentiated list made a brand-new worker
  // open the app to six jobs that were not theirs, reading as work they were
  // expected to collect on. Their own cars come first, and everyone else's sit
  // in a clearly separate section they can still reach when a genuine handover
  // is needed.
  const myWashing = washingJobs.filter((w: any) => !startedBySomeoneElse(w));
  const myReady = readyJobs.filter((w: any) => !startedBySomeoneElse(w));

  // Client bookings nobody has accepted yet. Shown to every worker at the
  // branch regardless of their own busy state — unlike myWashing/myReady,
  // there is no "started by someone else" filter to apply, since nobody has
  // started these at all. Oldest-first, matching the server's own ordering.
  const requestedJobs = (queue.requested || []).slice().sort(
    (a: any, b: any) => Number(b.elapsed_minutes || 0) - Number(a.elapsed_minutes || 0)
  );

  /** Tapping a tile pre-picks the service, then opens the car-details sheet. */
  const startWithService = (svc: any) => {
    if (vcs[0]?.id) setSelectedVc(vcs[0].id);
    setSelectedSvc(svc.id);
    setPendingStartToken(null);
    setWashModalVisible(true);
  };

  const whenLabel = (iso?: string) => {
    if (!iso) return 'Today';
    const d = new Date(iso);
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

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
                onPress={() => setPayTarget(w)}
                activeOpacity={0.6}
              >
                <Icon name="money-bill-wave" size={10} color={colors.textMuted} />
                <Text style={styles.linkText}>Take payment here</Text>
              </TouchableOpacity>
            )}
            {/* Only the worker who started a car can cancel it. Cancelling
                someone else's is indistinguishable from destroying their
                work, and unlike a handover there is no payment moment that
                makes it legitimate. */}
            {!notMine && (
              <TouchableOpacity
                style={styles.linkBtn}
                disabled={busyId === w.id}
                onPress={() => requestCancel(w)}
                activeOpacity={0.6}
              >
                <Icon name="times-circle" size={10} color={colors.error} />
                <Text style={[styles.linkText, { color: colors.error }]}>Cancel car</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Surface>
    );
  };

  /** A client's self-service booking, waiting for any free worker to accept. */
  const renderRequest = (w: any) => (
    <Surface key={w.id} elevation="sm" padded="sm" style={styles.job}>
      <View style={[styles.jobAccent, { backgroundColor: colors.info }]} />

      <View style={styles.jobBody}>
        <View style={styles.jobTop}>
          <Text style={styles.carType} numberOfLines={1}>{w.vehicle_class_name}</Text>
          <View style={{ flex: 1 }} />
          {w.is_redemption ? (
            <Text style={[styles.jobAmount, { color: colors.accent }]}>FREE</Text>
          ) : (
            <Text style={styles.jobAmount}>UGX {ugx(w.quoted_amount_ugx)}</Text>
          )}
        </View>

        <View style={styles.jobMetaRow}>
          <Text style={styles.serviceName} numberOfLines={1}>{w.service_name}</Text>
          <Text style={styles.jobNoSmall}>#{w.job_no}</Text>
          {w.is_redemption ? <Badge label="Free wash" tone="accent" small /> : null}
        </View>

        {w.client_name ? (
          <View style={styles.clientRow}>
            <Icon name="user-check" size={9} color={colors.success} />
            <Text style={styles.clientName} numberOfLines={1}>{w.client_name}</Text>
          </View>
        ) : null}

        <View style={styles.jobFooter}>
          <View style={styles.timeRow}>
            <Icon name="clock" size={10} color={colors.textMuted} />
            <Text style={styles.jobTime}>{minutesLabel(w.elapsed_minutes)}</Text>
            {w.plate ? <Text style={styles.plate}>{w.plate}</Text> : null}
          </View>

          <GradientButton
            title="Accept"
            variant="dark"
            size="sm"
            icon="check"
            loading={busyId === w.id}
            onPress={() => acceptRequest(w.id)}
          />
        </View>
      </View>
    </Surface>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeTopBar
        branch={actor?.branch_name || 'Car Wash'}
        points={Number(points?.points_balance || 0)}
        onPoints={() => setPointsOpen(true)}
        onMenu={() => navigation.openDrawer?.()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <NotificationPrompt actorId={actor?.id} />

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
        ) : null}

        {/* The amount is passed separately so the banner can pick it out in
            colour, and is compacted ("200K", not "200,000") — at this size
            the design's line only fits on one row in the short form. */}
        <RewardsBanner
          headline={`Get up to ${compactUgx(Number(points?.value_ugx || 0) || 200000)} in rewards`}
          amount={compactUgx(Number(points?.value_ugx || 0) || 200000)}
          onPress={() => setPointsOpen(true)}
        />

        {/* Picking a service here pre-selects it, then opens the car-details
            sheet — the same sheet the manual path uses, so there is one
            place that starts a job rather than two. */}
        <View style={styles.tileGrid}>
          {serviceTiles.map((t: any, i: number) => (
            <ServiceTile
              key={t.id || i}
              name={t.name}
              price={t.price_ugx ? `UGX ${ugx(t.price_ugx)}` : undefined}
              pointsBadge={i === 0 ? 'With points' : undefined}
              badge={t.is_new ? 'New' : undefined}
              badgeTone="accent"
              meta={t.meta}
              selected={selectedSvc === t.id}
              onPress={() => startWithService(t)}
            />
          ))}
        </View>

        <ScanBar
          onPress={() => setScanMode('start')}
          onManual={() => { setPendingStartToken(null); setWashModalVisible(true); }}
        />

        {/* Self-service bookings waiting for a worker — shown to everyone at
            the branch, busy or not; only the Accept tap itself is gated. */}
        {requestedJobs.length > 0 && (
          <View>
            <SectionHeader title="New requests" count={requestedJobs.length} icon="qrcode" />
            <View style={{ gap: spacing.sm }}>{requestedJobs.map(renderRequest)}</View>
          </View>
        )}

        {/* Live work comes before history — a car on the ramp matters more
            than one finished an hour ago. */}
        {myWashing.length > 0 && (
          <View>
            <SectionHeader title="Cars being washed" count={myWashing.length} icon="soap" />
            <View style={{ gap: spacing.sm }}>{myWashing.map(renderJob)}</View>
          </View>
        )}

        {myReady.length > 0 && (
          <View>
            <SectionHeader title="Waiting to be paid" count={myReady.length} icon="hand-holding-usd" />
            <View style={{ gap: spacing.sm }}>{myReady.map(renderJob)}</View>
          </View>
        )}

        <View>
          <Text style={styles.sectionLabel}>Recent washes</Text>
          <View style={{ gap: spacing.sm }}>
            {recentWashes.length === 0 ? (
              <Surface elevation="sm" padded="lg">
                <EmptyState
                  icon="car"
                  title="Nothing yet today"
                  message="Scan a customer code when the next car arrives."
                />
              </Surface>
            ) : (
              recentWashes.map((w: any) => (
                <RecentRow
                  key={w.id}
                  title={w.service_name || 'Wash'}
                  subtitle={`Completed · ${whenLabel(w.settled_at || w.started_at)}`}
                  amount={`UGX ${ugx(w.amount_ugx || 0)}`}
                  tone={Number(w.amount_ugx) === 0 ? 'accent' : 'brand'}
                />
              ))
            )}

            <PromptRow
              icon="shield-alt"
              title="Your points"
              subtitle={`${Number(points?.lifetime_earned || 0)} earned all time · tap to see history`}
              onPress={() => setPointsOpen(true)}
            />
          </View>
        </View>

        <PromoCard onPress={() => setScanMode('start')} />

        {/* A colleague's cars are deliberately NOT listed here. A handover
            starts from the customer: they present their code, you scan it,
            and if you did not start that job the app asks why before it
            settles. Browsing other people's work is not part of the flow. */}
      </ScrollView>

      {/* ── Cancel a car ── */}
      <FormSheet
        visible={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel this car"
        subtitle={cancelTarget ? `#${cancelTarget.job_no} · ${cancelTarget.vehicle_class_name}` : undefined}
        submitLabel="Cancel the car"
        onSubmit={confirmCancel}
        submitting={cancelBusy}
      >
        <Text style={styles.cancelWarn}>
          The car is dropped from your list and no payment is taken. Your manager sees every
          cancellation and the reason given.
        </Text>

        <PillPicker
          label="Why is it being cancelled?"
          value={cancelReason}
          onChange={(v: any) => setCancelReason(v)}
          options={CANCEL_REASONS as unknown as { value: string; label: string }[]}
        />

        <Field
          label={cancelReason === 'other' ? 'What happened?' : 'Note'}
          required={cancelReason === 'other'}
          value={cancelNote}
          onChangeText={setCancelNote}
          placeholder="e.g. Customer changed their mind about the wash type"
          multiline
          style={{ marginBottom: 0 }}
        />
      </FormSheet>

      {toast && (
        <SuccessToast
          points={toast.points}
          onDismiss={() => setToast(null)}
          onViewPoints={() => { setToast(null); setPointsOpen(true); }}
        />
      )}

      {/* ── Points balance and history ── */}
      <PointsSheet
        visible={pointsOpen}
        onClose={() => setPointsOpen(false)}
        balance={Number(points?.points_balance || 0)}
        history={points?.history || []}
        canRedeem={!!points?.can_redeem}
        minRedeem={points?.min_redeem_points}
      />

      {/* ── The receipt, once payment has gone through ── */}
      <PaymentReceipt
        visible={!!receipt}
        onClose={() => {
          // Hand over to the toast so the worker still sees what they
          // earned once they are back on the home screen.
          setToast({ points: receipt?.pointsEarned });
          setReceipt(null);
        }}
        reference={receipt?.reference || ''}
        item={receipt?.item || ''}
        paymentType={receipt?.paymentType || 'Cash'}
        recipient={receipt?.recipient || '92 CarWash'}
        amountUgx={receipt?.amountUgx || 0}
        pointsEarned={receipt?.pointsEarned}
      />

      {/* ── Take payment: amount, then confirm ── */}
      <PaymentSheet
        visible={!!payTarget}
        onClose={() => setPayTarget(null)}
        amountUgx={Number(payTarget?.quoted_amount_ugx || payTarget?.amount_ugx || 0)}
        jobLabel={payTarget ? `${payTarget.vehicle_class_name || 'Car'} · ${payTarget.service_name || 'Wash'}` : undefined}
        submitting={busyId === payTarget?.id}
        onConfirm={(p) => runCashSettle(payTarget, undefined, p)}
      />

      {/* ── Start a wash: car details, then confirm ── */}
      <StartWashFlow
        visible={washModalVisible}
        onClose={() => { setWashModalVisible(false); setSelectedSvc(''); }}
        onConfirm={startWash}
        vehicleClasses={vcs}
        initialVehicleClassId={selectedVc}
        initialServiceId={selectedSvc}
        submitting={loading}
        linkedToCustomer={!!pendingStartToken}
        pointsPerWash={points?.scheme_active ? points?.points_per_wash ?? null : null}
      />

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cancelWarn: {
    fontSize: font.xs, color: colors.textSecondary, lineHeight: 18,
    marginBottom: spacing.lg,
  },
  container: { flex: 1, backgroundColor: colors.bg },

  // Two-up service grid, as in the mockup.
  // rowGap as well as column gap, or the wrapped second row sits flush
  // against the first.
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  sectionLabel: {
    fontSize: font.regular,
    fontWeight: weight.heavy,
    color: colors.text,
    letterSpacing: tracking.tight,
    marginBottom: spacing.sm,
  },
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
