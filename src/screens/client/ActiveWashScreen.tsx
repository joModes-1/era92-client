import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';
import GradientButton from '../../components/GradientButton';
import ScreenHeader from '../../components/ScreenHeader';
import { Surface, SectionHeader, EmptyState, ListRow, StampRow, SkeletonList } from '../../components/ui';
import { useAppAlert } from '../../components/AppAlert';

const ugx = (n: any) => Number(n || 0).toLocaleString();

const STATUS_META: Record<string, { title: string; sub: string; color: string; icon: string }> = {
  in_progress: {
    title: 'Your car is being washed',
    sub: 'We will let you know the moment it is ready.',
    color: colors.washing,
    icon: 'soap',
  },
  ready: {
    title: 'Your car is ready',
    sub: 'Head to the bay and pay to collect.',
    color: colors.success,
    icon: 'check-circle',
  },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function ActiveWashScreen() {
  const navigation = useNavigation<any>();
  const { actor } = useAuth();
  const alert = useAppAlert();

  const [active, setActive] = useState<any>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [a, l, h] = await Promise.allSettled([api.clientActive(), api.clientLoyalty(), api.clientHistory()]);
    if (a.status === 'fulfilled') setActive(a.value);
    if (l.status === 'fulfilled') setLoyalty(l.value);
    if (h.status === 'fulfilled') setHistory(Array.isArray(h.value) ? h.value : []);
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  // Refresh whenever the screen regains focus (e.g. returning from the QR
  // sheet) so the customer never looks at a stale status.
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // While a wash is open the status changes on the worker's phone, not this
  // one — poll so "being washed" flips to "ready" without a manual pull.
  // Stops once nothing is active, so an idle app is not hitting the API.
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => { load(); }, 8000);
    return () => clearInterval(timer);
  }, [active, load]);

  // Announce the moment the car becomes ready. Push notifications need a
  // real device + token; this in-app alert works everywhere, web included.
  const prevStatus = useRef<string | null>(null);
  useEffect(() => {
    const status = active?.status || null;
    if (prevStatus.current === 'in_progress' && status === 'ready') {
      if (active?.is_redemption) {
        alert('Your car is ready', 'This wash was free — nothing to pay. Just collect your car.');
      } else {
        alert('Your car is ready', 'Head to the bay and tap "Pay now" to collect it.');
      }
    }
    prevStatus.current = status;
  }, [active?.status, active?.is_redemption, alert]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = actor?.full_name?.split(' ')[0] || 'there';
  const credits = Number(loyalty?.free_wash_credits || 0);
  const hasFreeCredit = credits > 0;
  const required = Number(loyalty?.washes_required || 7);
  const done = Number(loyalty?.wash_count || 0);
  const remaining = Math.max(0, required - done);
  const meta = active ? STATUS_META[active.status] : null;
  const isFreeWash = !!active?.is_redemption;

  // The in-progress wash already has its own card above; listing it again
  // under "Recent" makes the order look wrong. Show only finished visits.
  const pastWashes = history.filter((w: any) => !active || w.id !== active.id);

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={`${greeting()}, ${firstName}`} subtitle={actor?.org_name} />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={3} /></ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={`${greeting()}, ${firstName}`} subtitle={actor?.org_name} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* ── Saved reward ──
            Only shown when a credit is genuinely banked. The wording promises
            nothing about *this* visit: redeeming is the worker's action at the
            bay, so the customer must ask rather than assume. */}
        {hasFreeCredit && !active && (
          <LinearGradient
            colors={[colors.accent, colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.reward}
          >
            <View style={styles.rewardBloom} pointerEvents="none" />
            <View style={styles.rewardIcon}>
              <Icon name="gift" size={18} color="#fff" />
            </View>
            <Text style={styles.rewardTitle}>
              {credits > 1 ? `${credits} free washes saved` : '1 free wash saved'}
            </Text>
            <Text style={styles.rewardSub}>
              Tell the attendant you want to use it when you arrive.
            </Text>
          </LinearGradient>
        )}

        {/* ── Active wash status ── */}
        {active && meta ? (
          <Surface elevation="md" padded={false} radius="xl" style={styles.statusCard}>
            <View style={[styles.statusBanner, { backgroundColor: meta.color }]}>
              <Icon name={meta.icon} size={13} color="#fff" />
              <Text style={styles.statusBannerText}>{meta.title}</Text>
              {active.status === 'in_progress' ? <View style={styles.pulse} /> : null}
            </View>

            <View style={styles.statusBody}>
              <Text style={styles.statusBranch}>{active.branch_name}</Text>
              <Text style={styles.statusService}>
                {active.vehicle_class_name} · {active.service_name}
              </Text>

              {/* A redeemed wash costs nothing — showing a price and a "Pay
                  now" button makes the customer think the free wash failed. */}
              {isFreeWash ? (
                <View style={styles.freeRow}>
                  <Icon name="gift" size={14} color={colors.accent} />
                  <Text style={styles.freeAmount}>FREE</Text>
                  <Text style={styles.freeStruck}>UGX {ugx(active.quoted_amount_ugx)}</Text>
                </View>
              ) : (
                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrency}>UGX</Text>
                  <Text style={styles.priceAmount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                    {ugx(active.quoted_amount_ugx)}
                  </Text>
                </View>
              )}

              {active.status === 'ready' && isFreeWash ? (
                // Nothing to pay: the worker just hands the car back.
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
                  icon="qrcode"
                  full
                  onPress={() => navigation.navigate('PayWashQR', { wash: active })}
                  style={{ marginTop: spacing.lg }}
                />
              ) : (
                <View style={styles.waiting}>
                  <Icon name="clock" size={11} color={colors.textMuted} />
                  <Text style={styles.waitingText}>{meta.sub}</Text>
                </View>
              )}
            </View>
          </Surface>
        ) : (
          <Surface elevation="md" padded="lg" style={styles.idle}>
            <View style={styles.idleIcon}>
              <Icon name="car" size={22} color={colors.ink[300]} />
            </View>
            <Text style={styles.idleTitle}>No wash in progress</Text>
            <Text style={styles.idleSub}>
              {hasFreeCredit
                ? `Show your code at the bay. You have ${credits} free wash${credits === 1 ? '' : 'es'} saved — ask the attendant to use one.`
                : `Show your code at the bay when you arrive.${remaining > 0 ? ` ${remaining} more ${remaining === 1 ? 'wash' : 'washes'} earns you a free one.` : ''}`}
            </Text>
            {/* Always the same action — scanning starts the wash. A banked
                credit is spent by the system, not chosen by a different button,
                so the label must not imply two separate ways to start. */}
            <GradientButton
              title="Show my code"
              onPress={() => navigation.navigate('StartWashQR')}
              icon="qrcode"
              size="lg"
              full
              style={{ marginTop: spacing.lg }}
            />
          </Surface>
        )}

        {/* ── Loyalty punch card ── */}
        {loyalty && (
          <Surface elevation="sm" onPress={() => navigation.navigate('Loyalty')} style={styles.loyalty}>
            <View style={styles.loyaltyHead}>
              <View style={{ flex: 1 }}>
                <Text style={styles.loyaltyLabel}>LOYALTY</Text>
                <Text style={styles.loyaltyHeadline}>
                  {remaining === 0
                    ? 'Free wash unlocked'
                    : `${remaining} more ${remaining === 1 ? 'wash' : 'washes'} to a free one`}
                </Text>
              </View>
              <Icon name="chevron-right" size={11} color={colors.ink[300]} />
            </View>
            <StampRow filled={done} total={required} />

            {/* A saved credit is separate from this card's progress — showing
                both stops "2 more washes" and "free wash" looking contradictory. */}
            {hasFreeCredit ? (
              <View style={styles.savedRow}>
                <Icon name="gift" size={10} color={colors.accent} />
                <Text style={styles.savedText}>
                  Plus {credits} free wash{credits === 1 ? '' : 'es'} already saved
                </Text>
              </View>
            ) : null}
          </Surface>
        )}

        {/* ── Recent washes ── */}
        <View>
          <SectionHeader
            title="Recent washes"
            action={pastWashes.length > 5 ? 'See all' : undefined}
            onAction={() => navigation.navigate('History')}
          />
          {pastWashes.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="history" title="No washes yet" message="Your visits will show up here." />
            </Surface>
          ) : (
            <Surface elevation="sm" padded="sm">
              {pastWashes.slice(0, 5).map((w: any, i: number, arr: any[]) => (
                <ListRow
                  key={i}
                  leading="car"
                  title={w.service_name || w.vehicle_class_name}
                  subtitle={w.vehicle_class_name}
                  meta={`${w.started_at?.slice(0, 10)}${w.branch_name ? ` · ${w.branch_name}` : ''}`}
                  value={ugx(w.quoted_amount_ugx)}
                  valueSub="UGX"
                  last={i === Math.min(arr.length, 5) - 1}
                />
              ))}
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

  // Reward
  reward: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: 5,
    overflow: 'hidden',
    ...shadow.brand,
  },
  rewardBloom: {
    position: 'absolute', top: -70, right: -40,
    width: 170, height: 170, borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  rewardIcon: {
    width: 40, height: 40, borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  rewardTitle: { fontSize: font.xxl, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  rewardSub: { fontSize: font.sm, color: 'rgba(255,255,255,0.88)', lineHeight: 19 },

  // Status
  statusCard: { overflow: 'hidden' },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  statusBannerText: { flex: 1, color: '#fff', fontWeight: weight.heavy, fontSize: font.sm, letterSpacing: 0.1 },
  pulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.9)' },
  statusBody: { padding: spacing.lg },
  statusBranch: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.bold, letterSpacing: tracking.caps, textTransform: 'uppercase' },
  statusService: { fontSize: font.lg, fontWeight: weight.heavy, color: colors.text, marginTop: 3, letterSpacing: tracking.tight },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.md },
  priceCurrency: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.textMuted },
  priceAmount: { fontSize: font.hero, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  waitingText: { fontSize: font.sm, color: colors.textMuted, flex: 1 },
  freeRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.md },
  freeAmount: { fontSize: font.hero, fontWeight: weight.black, color: colors.accent, letterSpacing: tracking.display },
  freeStruck: { fontSize: font.sm, color: colors.textMuted, textDecorationLine: 'line-through' },
  freeReady: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: colors.successSoft, borderRadius: radii.md,
    padding: spacing.md, marginTop: spacing.lg,
  },
  freeReadyText: { flex: 1, fontSize: font.sm, color: colors.success, fontWeight: weight.semibold, lineHeight: 18 },

  // Idle
  idle: { alignItems: 'center', gap: 5 },
  idleIcon: {
    width: 58, height: 58, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  idleTitle: { fontSize: font.lg, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  idleSub: { fontSize: font.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },

  // Loyalty
  loyalty: { gap: spacing.md },
  loyaltyHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  loyaltyLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  loyaltyHeadline: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, marginTop: 2, letterSpacing: tracking.tight },
  savedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.full,
    paddingVertical: 6, paddingHorizontal: 11,
    alignSelf: 'flex-start',
  },
  savedText: { fontSize: font.xs, fontWeight: weight.bold, color: colors.accent },
});
