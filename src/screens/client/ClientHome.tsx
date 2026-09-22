import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HomeTopBar, RewardsBanner, ServiceTile, ScanBar, RecentRow, PromptRow, PromoCard,
} from '../worker/HomeParts';
import Icon from '../../components/Icon';
import GradientButton from '../../components/GradientButton';
import NotificationPrompt from '../../components/NotificationPrompt';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, EmptyState, SkeletonList } from '../../components/ui';
import { STATUS_META } from './washStatusMeta';

const STAGES = [
  { key: 'requested', label: 'Booked' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'ready', label: 'Finished' },
];

function stageIndex(status: string): number {
  if (status === 'requested') return 0;
  if (status === 'in_progress') return 1;
  if (status === 'ready' || status === 'settled') return 2;
  return 0;
}

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

function whenLabel(iso?: string) {
  if (!iso) return 'Today';
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ClientHome({ navigation }: any) {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const [points, setPoints] = useState<any>(null);
  const [active, setActive] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [vcs, setVcs] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const prevStatus = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [pts, a, h, l, prices] = await Promise.allSettled([
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
      ]);
      if (pts.status === 'fulfilled') setPoints(pts.value);
      if (a.status === 'fulfilled') setActive(a.value);
      if (h.status === 'fulfilled') setHistory(Array.isArray(h.value) ? h.value : []);
      if (l.status === 'fulfilled') setLoyalty(l.value);
      if (prices.status === 'fulfilled' && prices.value) {
        setVcs(prices.value.vehicle_classes || []);
      }
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setInitialLoading(false); })(); }, [load]);

  // Refresh whenever the screen regains focus (e.g. returning from the
  // branch-scan flow), so a fresh booking shows up without a manual pull.
  useFocusEffect(useCallback(() => { load(); }, [load]));

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
        alert('Your car is ready', 'Tap "Pay now" below to collect it.');
      }
    }
    prevStatus.current = status;
  }, [active?.status, active?.is_redemption, alert]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = actor?.full_name?.split(' ')[0] || 'Customer';

  /** The four service tiles at the top — same derivation as the worker screen. */
  const serviceTiles = React.useMemo(() => {
    const firstClass = vcs[0];
    const list = (firstClass?.services || []).filter((s: any) => s.has_price);
    return list.slice(0, 4);
  }, [vcs]);

  /** Recent washes for the list at the bottom. */
  const recentWashes = React.useMemo(() => {
    const done = history.filter((w: any) => !active || w.id !== active.id);
    return done.slice(0, 4);
  }, [history, active]);

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeTopBar
          branch={actor?.branch_name || `Good day, ${firstName}`}
          points={0}
          onPoints={() => navigation.navigate('Loyalty')}
          onMenu={() => navigation.openDrawer?.()}
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

        {/* Tapping a tile does nothing here — a client starts a wash by
            scanning the branch's QR, not by picking a service on this
            screen first (the worker's screen pre-fills a car-details sheet
            here; a client has no such sheet, since booking always starts
            with the branch scan). */}
        <View style={styles.tileGrid}>
          {serviceTiles.map((t: any, i: number) => (
            <ServiceTile
              key={t.id || i}
              name={t.name}
              price={t.price_ugx ? `UGX ${ugx(t.price_ugx)}` : undefined}
              pointsBadge={i === 0 ? 'With points' : undefined}
              onPress={() => {}}
            />
          ))}
        </View>

        <ScanBar
          onPress={() => navigation.navigate('BranchScan')}
          onManual={() => navigation.navigate('BranchScan')}
        />

        {/* ── Active wash, tracked right here ──
            Not part of the original worker layout (a worker's own washes
            live in the branch queue) — this is the one addition a client
            genuinely needs. Stays on this one screen rather than opening a
            separate page: the same 3-stage bar (Booked / In Progress /
            Finished) shown right after booking, updating in place as the
            status changes. */}
        {active && (() => {
          const meta = STATUS_META[active.status];
          const idx = stageIndex(active.status);
          const isFreeWash = !!active.is_redemption;
          return (
            <Surface elevation="sm" padded="lg">
              {meta ? (
                <>
                  <Text style={styles.activeTitle}>{meta.title}</Text>
                  <Text style={styles.activeSub}>{meta.sub}</Text>
                </>
              ) : null}

              <View style={styles.stageRow}>
                {STAGES.map((stage, i) => (
                  <React.Fragment key={stage.key}>
                    <View style={styles.stageDotWrap}>
                      <View style={[styles.stageDot, i <= idx && styles.stageDotFilled]}>
                        {i < idx ? <Icon name="check" size={9} color="#fff" /> : null}
                      </View>
                      <Text style={[styles.stageLabel, i <= idx && styles.stageLabelActive]}>{stage.label}</Text>
                    </View>
                    {i < STAGES.length - 1 ? (
                      <View style={[styles.stageBar, i < idx && styles.stageBarFilled]} />
                    ) : null}
                  </React.Fragment>
                ))}
              </View>

              <View style={styles.activeCarRow}>
                <Text style={styles.carLine} numberOfLines={1}>
                  {active.vehicle_class_name} · {active.service_name}
                </Text>
                {isFreeWash ? (
                  <Text style={[styles.carAmount, { color: colors.accent }]}>FREE</Text>
                ) : (
                  <Text style={styles.carAmount}>UGX {ugx(active.quoted_amount_ugx)}</Text>
                )}
              </View>

              {active.status === 'ready' && isFreeWash ? (
                <View style={styles.freeReady}>
                  <Icon name="check-circle" size={13} color={colors.success} />
                  <Text style={styles.freeReadyText}>
                    Nothing to pay — this wash used your free credit. Just collect your car.
                  </Text>
                </View>
              ) : active.status === 'ready' ? (
                <GradientButton
                  title="Pay now"
                  variant="success"
                  size="lg"
                  icon="credit-card"
                  full
                  onPress={() => navigation.navigate('PaymentMethod', { wash: active })}
                  style={{ marginTop: spacing.lg }}
                />
              ) : null}
            </Surface>
          );
        })()}

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
              recentWashes.map((w: any) => (
                <RecentRow
                  key={w.id}
                  title={w.service_name || w.vehicle_class_name || 'Wash'}
                  subtitle={`Completed · ${whenLabel(w.settled_at || w.started_at)}`}
                  amount={`UGX ${ugx(w.amount_ugx ?? w.quoted_amount_ugx ?? 0)}`}
                  tone={Number(w.amount_ugx ?? w.quoted_amount_ugx) === 0 ? 'accent' : 'brand'}
                />
              ))
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

        <PromoCard onPress={() => navigation.navigate('BranchScan')} />
      </ScrollView>
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
