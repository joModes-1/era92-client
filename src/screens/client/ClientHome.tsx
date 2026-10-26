import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HomeTopBar, RewardsBanner, ServiceTile, ScanBar, RecentRow, PromptRow, PromoCard, WashTracker, SuccessToast,
} from './HomeParts';
import { consumePaymentDone } from './paymentToast';
import { artFor } from './serviceArt';
import PointsSheet, { ledgerEntries, pendingPointsFor } from './PointsSheet';
import NotificationPrompt from '../../components/NotificationPrompt';
import BranchPickerSheet from '../../components/BranchPickerSheet';
import PaymentPromptSheet from './PaymentPromptSheet';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, EmptyState, SkeletonList } from '../../components/ui';

/**
 * The client's home screen — an exact copy of the worker's home
 * (WorkerHome.tsx: same top bar with its points pill, the same rewards
 * banner, the same tile grid, the same ScanBar, the same "Recent washes"
 * list) with every WORKER-ONLY action removed, because none of those
 * backend routes accept a client actor at all (settle, wash-done, accept,
 * shift, attach-customer, cancel — every one of them is staff-only and
 * would 403 for a client). This file is what is left once those calls are
 * swapped for the client's own equivalents; nothing about the layout was
 * redesigned.
 *
 * Points are the client's real balance (GET /me/washes/points) — the
 * scheme the owner configures in Settings: points per wash type and what a
 * point is worth. The points sheet lists the actual ledger behind it.
 */

const ugx = (n: any) => Number(n || 0).toLocaleString();

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

/** "May 14 at 10:20 AM", per the mockup's recent-wash rows. */
function dateLabel(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
}

export default function ClientHome({ navigation }: any) {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const [points, setPoints] = useState<any>(null);
  const [pointsLedger, setPointsLedger] = useState<any[]>([]);
  // Every car on the go, newest first. A client can have more than one: the
  // two cars of a 2-for-1 booking, or a second car booked while the first
  // is still being washed.
  const [activeList, setActiveList] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [vcs, setVcs] = useState<any[]>([]);
  // The "wash 2 cars for the price of 1" card: null until the first fetch
  // resolves (rendered as available), then whatever the server says — the
  // server is the only source of truth for whether the offer was taken.
  const [promo, setPromo] = useState<any>(null);
  // The nearby-branch picker behind the top-left branch row — a manual
  // alternative to scanning the wall QR, never an automatic selection.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  // Each live car's last seen status, so "ready" is announced once per car.
  const prevStatus = useRef<Record<string, string>>({});
  // Wash ids whose payment prompt was closed this session, so it pops up
  // once per booking rather than on every 8s poll.
  const [dismissedPrompts, setDismissedPrompts] = useState<string[]>([]);
  const [showPaidToast, setShowPaidToast] = useState(false);
  // Tapping a pending row reopens the payment popup for that car, even
  // after it was closed.
  const [forcePromptId, setForcePromptId] = useState<string | null>(null);
  const [pointsOpen, setPointsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pts, a, h, l, prices, promoRes, ledgerRes] = await Promise.allSettled([
        api.clientPoints(),
        api.clientActiveList(),
        api.clientHistory(),
        api.clientLoyalty(),
        api.clientPrices(),
        api.clientPromo(),
        api.clientPointsLedger(),
      ]);
      if (pts.status === 'fulfilled') setPoints(pts.value);
      if (ledgerRes.status === 'fulfilled') setPointsLedger(Array.isArray(ledgerRes.value) ? ledgerRes.value : []);
      if (a.status === 'fulfilled') setActiveList(Array.isArray(a.value) ? a.value : []);
      if (h.status === 'fulfilled') setHistory(Array.isArray(h.value) ? h.value : []);
      if (l.status === 'fulfilled') setLoyalty(l.value);
      if (prices.status === 'fulfilled' && prices.value) {
        setVcs(prices.value.vehicle_classes || []);
      }
      if (promoRes.status === 'fulfilled') setPromo(promoRes.value);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setInitialLoading(false); })(); }, [load]);

  // Refresh whenever the screen regains focus (e.g. returning from the
  // branch-scan flow), so a fresh booking shows up without a manual pull.
  useFocusEffect(useCallback(() => {
    load();
    if (consumePaymentDone()) setShowPaidToast(true);
  }, [load]));

  // While a car is on the go, its status changes on the WORKER's phone, not
  // this one — poll so "booked" flips to "in progress" to "ready" without
  // a manual pull. Stops once nothing is active, so an idle app is not
  // hitting the API on a timer for no reason.
  const hasActive = activeList.length > 0;
  useEffect(() => {
    if (!hasActive) return;
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [hasActive, load]);

  // Announce the moment a car becomes ready — once, even if both cars of a
  // pair finish in the same poll.
  const statusKey = activeList.map((w: any) => `${w.id}:${w.status}`).join(',');
  useEffect(() => {
    const nowReady = activeList.filter((w: any) => prevStatus.current[w.id] === 'in_progress' && w.status === 'ready');
    if (nowReady.length > 0) {
      const allFree = nowReady.every((w: any) => w.is_redemption);
      alert(
        nowReady.length > 1 ? 'Your cars are ready' : 'Your car is ready',
        allFree
          ? `${nowReady.length > 1 ? 'These washes were' : 'This wash was'} free — nothing to pay. Just collect your car.`
          : 'Head to the bay to collect it.'
      );
    }
    prevStatus.current = Object.fromEntries(activeList.map((w: any) => [w.id, w.status]));
  }, [statusKey, alert]);

  // The real points history (earned on paid washes, spent at booking,
  // refunded on a cancel, taken back on a reversal) and the points still on
  // their way — built by the same helpers as the Points page, so both show
  // one number.
  const pointsEntries = React.useMemo(() => ledgerEntries(pointsLedger), [pointsLedger]);
  const pendingPoints = React.useMemo(() => pendingPointsFor(activeList, points?.enabled), [activeList, points?.enabled]);
  const pointsBalance = Number(points?.balance || 0);

  // What the client still owes after points; a free wash owes nothing.
  const amountDue = (w: any) => Number(w?.amount_due_ugx ?? w?.quoted_amount_ugx ?? 0);
  const owesPayment = (w: any) => !!w && !w.is_redemption && amountDue(w) > 0;

  // The car the payment popup is for: one the client tapped, else the newest
  // car that still owes money and has no payment method chosen. Never the
  // free car of a 2-for-1 pair — it has nothing to pay.
  const promptWash = forcePromptId
    ? activeList.find((w: any) => w.id === forcePromptId) || null
    : activeList.find((w: any) => owesPayment(w) && !w.declared_payment_method && !dismissedPrompts.includes(w.id)) || null;
  const dismissPrompt = () => {
    setForcePromptId(null);
    if (promptWash) setDismissedPrompts((ids) => [...ids, promptWash.id]);
  };

  // Not on screen right now (see the trackers below) — kept ready for when
  // "Cancel booking" gets its place in the design. Only a booking nobody
  // has taken yet can be cancelled; any points spent on it come back, and
  // cancelling one car of a 2-for-1 pair hands the offer back (the other
  // car then carries on at its own price).
  const [cancelling, setCancelling] = useState(false);
  const cancelBooking = async (washId: string) => {
    setCancelling(true);
    try {
      const res: any = await api.cancelBookingRequest(washId);
      await load();
      alert(
        'Booking cancelled',
        Number(res?.points_refunded || 0) > 0
          ? `Your ${Number(res.points_refunded).toLocaleString()} points are back in your account.`
          : 'You can book again any time.'
      );
    } catch (e: any) {
      // A worker took the car between the screen refreshing and the tap.
      alert('Too late to cancel', e?.code === 'BAD_STATE'
        ? 'A worker has already started on your car.'
        : (e?.message || 'Try again.'));
      await load();
    }
    setCancelling(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = actor?.full_name?.split(' ')[0] || 'Customer';

  /**
   * The four service tiles at the top, in the mockup's order: Full car
   * wash, Interior detailing, Heavy vehicle, Bikes. A branch with no Full
   * car wash gets Engine wash in that first place (it shares the car-pair
   * render); with both, Engine wash ranks after the four so it never pushes
   * Bikes off the grid.
   */
  const TILE_ORDER = ['full', 'interior', 'heavy', 'bike'];
  const serviceTiles = React.useMemo(() => {
    const firstClass = vcs[0];
    const list = (firstClass?.services || []).filter((s: any) => s.has_price);
    const hasFull = list.some((s: any) => /full/i.test(s.name || ''));
    const rank = (name: string) => {
      const n = (name || '').toLowerCase();
      if (n.includes('engine') && !hasFull) return 0;
      const i = TILE_ORDER.findIndex((k) => n.includes(k));
      return i === -1 ? TILE_ORDER.length : i;
    };
    return [...list].sort((a, b) => rank(a.name) - rank(b.name)).slice(0, 4);
  }, [vcs]);

  /** Recent washes for the list at the bottom. */
  // Every car on the go leads the list, each at its own stage; everything
  // else is history (settled or cancelled).
  const recentWashes = React.useMemo(() => {
    const activeIds = new Set(activeList.map((w: any) => w.id));
    const done = history.filter((w: any) => !activeIds.has(w.id));
    return [...activeList, ...done].slice(0, Math.max(4, activeList.length));
  }, [history, activeList]);

  /** The promo card's state: taken the moment the two cars are booked. */
  const promoState: 'available' | 'used' = promo?.used ? 'used' : 'available';

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeTopBar
          branch={actor?.branch_name || `Good day, ${firstName}`}
          points={0}
          onPoints={() => navigation.navigate('Points')}
          onMenu={() => navigation.openDrawer?.()}
          onBranch={() => setPickerOpen(true)}
        />
        <ScrollView contentContainerStyle={styles.body}>
          <SkeletonList rows={4} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeTopBar
        branch={actor?.branch_name || `Good day, ${firstName}`}
        points={Number(points?.balance || 0)}
        onPoints={() => navigation.navigate('Points')}
        onMenu={() => navigation.openDrawer?.()}
        onBranch={() => setPickerOpen(true)}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <NotificationPrompt actorId={actor?.id} />

        {/* Same banner, same copy, same tap target as the worker's screen —
            it opens the client's own Loyalty screen rather than a points
            sheet, since that is the equivalent "see the detail" surface a
            client actually has. */}
        <RewardsBanner
          headline={`Get up to ${compactUgx(Number(points?.worth_ugx || 0) || 200000)} in rewards`}
          amount={compactUgx(Number(points?.worth_ugx || 0) || 200000)}
          onPress={() => navigation.navigate('Points')}
        />

        {/* One track per car. With more than one on the go, each is named
            so the client can tell which car is where. */}
        {activeList.map((w: any) => (
          <View key={w.id}>
            {activeList.length > 1 ? (
              <View style={styles.trackerHead}>
                <Text style={styles.trackerTitle} numberOfLines={1}>
                  {w.service_name} · {w.vehicle_class_name}{w.plate ? ` · ${w.plate}` : ''}
                </Text>
                {w.is_redemption ? <Text style={styles.trackerFree}>Free</Text> : null}
              </View>
            ) : null}
            <WashTracker status={w.status} />
          </View>
        ))}
        {/* "Cancel booking" was shown here under the tracker; taken off the
            home screen until its place in the design is decided. The logic
            (cancelBooking above) is kept, so it only needs a button. */}

        {/* Tapping a tile jumps straight into the same branch-scan step the
            orange bar below starts — a client still has no branch_id on
            their own token, so the QR scan cannot be skipped, but the
            service they tapped is carried through and pre-selected once
            BookWashScreen loads that branch's prices, so they land on the
            confirm step instead of picking again. */}
        <View style={styles.tileGrid}>
          {serviceTiles.map((t: any, i: number) => {
            // Quick UI-only pass matching a reference mockup — the bikes
            // tile gets a "New" badge and a short duration line, same props
            // every other tile already supports. A real "is this new / how
            // long does it take" data source is a later, deeper fix; this
            // is just the visual for now.
            const isBike = /bike/i.test(t.name || '');
            return (
              <ServiceTile
                key={t.id || i}
                name={t.name}
                pointsBadge={i === 0 ? 'With points' : undefined}
                badge={isBike ? 'New' : undefined}
                badgeTone={isBike ? 'accent' : undefined}
                meta={isBike ? '30 mins' : undefined}
                onPress={() => navigation.navigate('BranchScan', { preselectServiceName: t.name })}
              />
            );
          })}
        </View>

        <ScanBar
          onPress={() => navigation.navigate('BranchScan')}
          onManual={() => navigation.navigate('BranchScan')}
        />

        <View>
          <Text style={styles.sectionLabel}>Recent washes</Text>
          <View style={{ gap: spacing.sm }}>
            {recentWashes.length === 0 ? (
              <Surface elevation="sm" padded="lg">
                <EmptyState
                  icon="car"
                  title="No washes yet"
                  message="Scan the QR code at a branch to book your first wash."
                />
              </Surface>
            ) : (
              recentWashes.map((w: any) => {
                const isPending = activeList.some((a: any) => a.id === w.id);
                // The same words as the tracker above, so the list and the
                // progress bar never disagree about where the car is.
                const stage = w.status === 'ready' ? 'Finished'
                  : w.status === 'in_progress' ? 'In progress' : 'Booked';
                const label = isPending ? stage : w.status === 'cancelled' ? 'Cancelled' : 'Completed';
                const amount = Number(w.amount_ugx ?? w.quoted_amount_ugx ?? 0);
                return (
                  <RecentRow
                    key={w.id}
                    image={artFor(w.service_name || '').image}
                    title={w.service_name || w.vehicle_class_name || 'Wash'}
                    subtitle={`${label} • ${dateLabel(w.settled_at || w.started_at || w.requested_at)}`}
                    amount={w.is_redemption ? 'Free' : `UGX ${compactUgx(amount).toLowerCase()}`}
                    tone={w.is_redemption || amount === 0 ? 'accent' : 'brand'}
                    onPress={isPending && owesPayment(w) ? () => setForcePromptId(w.id) : undefined}
                  />
                );
              })
            )}

            <PromptRow
              icon="gift"
              title="Your points"
              subtitle={
                Number(points?.balance || 0) > 0
                  ? `${Number(points.balance).toLocaleString()} points · worth UGX ${Number(points.worth_ugx || 0).toLocaleString()}`
                  : 'Earn points on every wash'
              }
              onPress={() => navigation.navigate('Points')}
            />
          </View>
        </View>

        {/* One-time offer: two cars on one booking, the dearer one charged.
            available → book the pair; used → taken already, so the card
            renders inert no matter what the client's device thinks. */}
        <PromoCard
          state={promoState}
          onPress={() =>
            promoState === 'used'
              ? alert('Offer already used', 'You have already used the "Wash 2 cars for the price of 1" offer on this account.')
              : navigation.navigate('BranchScan', { usePromo: true })}
        />
      </ScrollView>

      {/* Same hand-off as the wall-QR scan, different door: picking a
          branch here lands on the identical BookWash screen BranchScan
          navigates to, so there is exactly one booking flow no matter how
          the branch was chosen. */}
      <BranchPickerSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPicked={(b) => navigation.navigate('BookWash', { branchId: b.id, branchName: b.name })}
      />

      <PaymentPromptSheet
        visible={!!promptWash}
        wash={promptWash}
        onClose={dismissPrompt}
        onWaiting={() => promptWash && setForcePromptId(promptWash.id)}
        onDone={(method, receiptNo, paid) => {
          const wash = { ...promptWash, receipt_no: receiptNo || promptWash?.receipt_no };
          dismissPrompt();
          load();
          navigation.navigate('PaymentSuccess', { wash, method, paid });
        }}
      />

      {showPaidToast ? (
        <SuccessToast
          points={null}
          onDismiss={() => setShowPaidToast(false)}
          onViewPoints={() => { setShowPaidToast(false); setPointsOpen(true); }}
        />
      ) : null}

      <PointsSheet
        visible={pointsOpen}
        balance={pointsBalance}
        worthUgx={Number(points?.worth_ugx || 0)}
        entries={pointsEntries}
        pending={pendingPoints}
        onClose={() => setPointsOpen(false)}
        onRedeem={() => {
          setPointsOpen(false);
          navigation.navigate('BranchScan', { payWithPoints: true });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  // Inset from the page edge, with the wide gutter the mockup leaves between
  // the two columns (each tile is 43% — see HomeParts' tile).
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginTop: -spacing.sm,
  },
  trackerHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 2 },
  trackerTitle: { flex: 1, fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  trackerFree: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.accentText },
  // The same section heading every other role now uses (SectionHeader).
  sectionLabel: {
    fontSize: font.lg,
    fontWeight: weight.heavy,
    color: colors.text,
    letterSpacing: tracking.tight,
    marginBottom: spacing.sm + 2,
  },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  // Active wash tracker
  activeTitle: { fontSize: font.lg, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  activeSub: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },

  stageRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.xl },
  stageDotWrap: { alignItems: 'center', width: 74 },
  stageDot: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.bgSunken,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  stageDotFilled: { backgroundColor: colors.primary, borderColor: colors.primary },
  stageLabel: { fontSize: font.micro, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
  stageLabelActive: { color: colors.text, fontWeight: weight.bold },
  stageBar: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: colors.border,
    marginTop: 10,
  },
  stageBarFilled: { backgroundColor: colors.primary },

  activeCarRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: spacing.xl, paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight,
  },
  carLine: { flex: 1, fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  carAmount: { fontSize: font.lg, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },

  freeReady: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.successSoft, borderRadius: radii.md,
    padding: spacing.md, marginTop: spacing.lg,
  },
  freeReadyText: { flex: 1, fontSize: font.sm, color: colors.success, fontWeight: weight.semibold, lineHeight: 18 },
});
