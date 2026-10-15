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
import PointsSheet, { pointsForAmount } from './PointsSheet';
import { isPaidWithPoints } from './paymentToast';
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
 * One real gap, not a design choice: `myPoints()` (GET /worker-points/me)
 * is the WORKER incentive-points system and has no client equivalent on
 * the backend today — there is no "client points" table. Rather than block
 * on that, this screen reads it defensively (it 403s for a client and the
 * catch below treats that exactly like "scheme off"), so the pill and
 * banner render with 0 rather than crashing the screen. The visual shell
 * is unchanged; wiring a REAL client points source is a backend task, not
 * something this file can invent on its own.
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
  const [active, setActive] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [vcs, setVcs] = useState<any[]>([]);
  // The "wash 2 cars for the price of 1" card: null until the first fetch
  // resolves (rendered as available), then whatever the server says — the
  // server is the only source of truth for whether the offer was grabbed.
  const [promo, setPromo] = useState<any>(null);
  // The nearby-branch picker behind the top-left branch row — a manual
  // alternative to scanning the wall QR, never an automatic selection.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const prevStatus = useRef<string | null>(null);
  // Wash ids whose payment prompt was closed this session, so it pops up
  // once per booking rather than on every 8s poll.
  const [dismissedPrompts, setDismissedPrompts] = useState<string[]>([]);
  const [showPaidToast, setShowPaidToast] = useState(false);
  // Tapping the pending row reopens the payment popup even after it was closed.
  const [forcePrompt, setForcePrompt] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [pts, a, h, l, prices, promoRes] = await Promise.allSettled([
        // Worker-only endpoint (see file doc comment) — 403s for a client;
        // caught below exactly like "the scheme is off", never crashes the
        // screen. Kept as the FIRST attempt rather than skipped outright:
        // if a client-facing points source is ever added at this same
        // path, this line needs no change.
        api.myPoints(),
        api.clientActive(),
        api.clientHistory(),
        api.clientLoyalty(),
        api.clientPrices(),
        api.clientPromo(),
      ]);
      if (pts.status === 'fulfilled') setPoints(pts.value);
      if (a.status === 'fulfilled') setActive(a.value);
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

  // While a wash is active, the status changes on the WORKER's phone, not
  // this one — poll so "booked" flips to "in progress" to "ready" without
  // a manual pull. Stops once nothing is active, so an idle app is not
  // hitting the API on a timer for no reason.
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [active, load]);

  // Announce the moment the car becomes ready.
  useEffect(() => {
    const status = active?.status || null;
    if (prevStatus.current === 'in_progress' && status === 'ready') {
      if (active?.is_redemption) {
        alert('Your car is ready', 'This wash was free — nothing to pay. Just collect your car.');
      } else {
        alert('Your car is ready', 'Head to the bay to collect it.');
      }
    }
    prevStatus.current = status;
  }, [active?.status, active?.is_redemption, alert]);

  // Points earned per settled wash (UI-only rule, see PointsSheet).
  const pointsEntries = React.useMemo(() => history
    .filter((w: any) => w.status === 'settled')
    .map((w: any) => ({
      id: w.id,
      title: w.service_name || 'Wash',
      subtitle: `Completed • ${dateLabel(w.settled_at || w.started_at)}`,
      points: pointsForAmount(Number(w.amount_ugx ?? w.quoted_amount_ugx ?? 0)),
    }))
    .filter((e: any) => e.points > 0), [history]);
  const pointsBalance = pointsEntries.reduce((sum: number, e: any) => sum + e.points, 0);

  const showPaymentPrompt = !!active
    && !active.is_redemption
    && !isPaidWithPoints(active.id)
    && !active.declared_payment_method
    && Number(active.quoted_amount_ugx) > 0
    && !dismissedPrompts.includes(active.id);
  const dismissPrompt = () => {
    setForcePrompt(false);
    if (active) setDismissedPrompts((ids) => [...ids, active.id]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = actor?.full_name?.split(' ')[0] || 'Customer';

  /** The four service tiles at the top — same derivation as the worker screen. */
  const TILE_ORDER = ['engine', 'interior', 'heavy', 'bike'];
  const serviceTiles = React.useMemo(() => {
    const firstClass = vcs[0];
    const list = (firstClass?.services || []).filter((s: any) => s.has_price);
    const rank = (name: string) => {
      const n = (name || '').toLowerCase();
      const i = TILE_ORDER.findIndex((k) => n.includes(k));
      return i === -1 ? TILE_ORDER.length : i;
    };
    return [...list].sort((a, b) => rank(a.name) - rank(b.name)).slice(0, 4);
  }, [vcs]);

  /** Recent washes for the list at the bottom. */
  // The current booking leads the list as "Pending"; everything else is
  // history (settled or cancelled).
  const recentWashes = React.useMemo(() => {
    const done = history.filter((w: any) => !active || w.id !== active.id);
    return (active ? [active, ...done] : done).slice(0, 4);
  }, [history, active]);

  /** The promo card's state, from the server's own record of the offer. */
  const promoState: 'available' | 'armed' | 'used' = promo?.used
    ? 'used'
    : promo && !promo.available && !promo.active_wash
      ? 'armed'
      : 'available';

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeTopBar
          branch={actor?.branch_name || `Good day, ${firstName}`}
          points={0}
          onPoints={() => navigation.navigate('Loyalty')}
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
        points={Number(points?.points_balance || 0)}
        onPoints={() => navigation.navigate('Loyalty')}
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
          headline={`Get up to ${compactUgx(Number(points?.value_ugx || 0) || 200000)} in rewards`}
          amount={compactUgx(Number(points?.value_ugx || 0) || 200000)}
          onPress={() => navigation.navigate('Loyalty')}
        />

        {active ? <WashTracker status={active.status} /> : null}

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
                const isPending = !!active && w.id === active.id;
                const label = isPending ? 'Pending' : w.status === 'cancelled' ? 'Cancelled' : 'Completed';
                const amount = Number(w.amount_ugx ?? w.quoted_amount_ugx ?? 0);
                return (
                  <RecentRow
                    key={w.id}
                    image={artFor(w.service_name || '').image}
                    title={w.service_name || w.vehicle_class_name || 'Wash'}
                    subtitle={`${label} • ${dateLabel(w.settled_at || w.started_at || w.requested_at)}`}
                    amount={`UGX ${compactUgx(amount).toLowerCase()}`}
                    tone={amount === 0 ? 'accent' : 'brand'}
                    onPress={isPending && !isPaidWithPoints(w.id) ? () => setForcePrompt(true) : undefined}
                  />
                );
              })
            )}

            <PromptRow
              icon="gift"
              title="Your loyalty"
              subtitle={
                loyalty
                  ? `${Number(loyalty.wash_count || 0)}/${Number(loyalty.washes_required || 7)} washes · tap for detail`
                  : 'Wash with us to start earning rewards'
              }
              onPress={() => navigation.navigate('Loyalty')}
            />
          </View>
        </View>

        {/* One-time offer. available → grab (booking flow with the offer
            attached); armed → the next booking IS the free one; used → the
            server has already counted this client's redemption, so the card
            renders inert no matter what the client's device thinks. */}
        <PromoCard
          state={promoState}
          onPress={() => navigation.navigate('BranchScan', {
            usePromo: promoState === 'available',
            usePromoFree: promoState === 'armed',
          })}
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
        visible={!!active && (showPaymentPrompt || forcePrompt)}
        wash={active}
        onClose={dismissPrompt}
        onDone={(method, receiptNo) => {
          const wash = { ...active, receipt_no: receiptNo || active?.receipt_no };
          dismissPrompt();
          load();
          navigation.navigate('PaymentSuccess', { wash, method });
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
        entries={pointsEntries}
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
