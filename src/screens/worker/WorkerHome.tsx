import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import GradientButton from '../../components/GradientButton';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, EmptyState, SkeletonList } from '../../components/ui';

/**
 * The worker's page, cut right down.
 *
 * Everything a worker used to do by hand — scanning a customer in,
 * starting a wash, taking payment, attaching a customer late, cancelling,
 * handovers, their own points — is gone with the old worker-initiated
 * model. A client now books their own wash by scanning the branch's wall
 * QR, and the server picks a free worker automatically the moment that
 * booking is made (see tryAutoAssign() in the server's washRoutes.ts) —
 * nothing here has to accept anything.
 *
 * What is left is the one thing that genuinely still needs a person: the
 * car has to be physically washed and the money physically collected. So
 * this page shows, at most, ONE car — whichever wash the server just
 * auto-assigned to this worker — with two buttons: mark it washed, and
 * confirm payment was collected. Nothing else.
 *
 * A shift still opens automatically in the background, exactly as before,
 * because wash-done/settle both still require one server-side (cash still
 * has to be attributable to a person for the day's reconciliation) — the
 * worker just never sees or manages it directly, same as it always was.
 */
export default function WorkerHome({ navigation }: any) {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const shift = await api.getCurrentShift().catch(() => null);
      if (!shift) {
        try { await api.openShift(); } catch { /* no branch, or offline — nothing to show either way */ }
      } else if (shift.status === 'pending_close') {
        await api.reopenShift(shift.id).catch(() => {});
      }

      const queue = await api.getQueue().catch(() => ({ washing: [] }));
      // At most one car ever matters here — whichever this worker is
      // currently washing. If auto-assign somehow left more than one (it
      // shouldn't; the busy check prevents it), the oldest one wins.
      const mine = (queue?.washing || []).filter((w: any) => w.started_by_worker_id === actor?.id);
      setCurrent(mine[0] || null);
    } catch {
      // Offline or an account with no branch — the empty state below covers it.
    }
  }, [actor?.id]);

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // While a car is assigned, poll — a new booking could be auto-assigned
  // here any time, and this worker has no other way to find out.
  useEffect(() => {
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

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
      alert('Error', e.message);
    }
    setBusy(false);
  };

  const confirmPayment = async () => {
    if (!current) return;
    setBusy(true);
    try {
      // The client already declared how they intend to pay (see
      // declared_payment_method on the wash) — this just confirms the
      // worker actually collected it. No method-selection UI needed here
      // any more; if nothing was declared, cash is the safe default,
      // exactly as the old manual-settle path already assumed.
      await api.settle(current.id, {
        unverified_reason: 'no_app',
        payment_method: current.declared_payment_method || 'cash',
      });
      await load();
      alert('Payment confirmed', 'The car is settled.');
    } catch (e: any) {
      alert('Error', e.message);
    }
    setBusy(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={2} /></ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{actor?.branch_name || 'Car Wash'}</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {current ? (
          <Surface elevation="sm" padded="lg">
            <Text style={styles.carType}>{current.vehicle_class_name}</Text>
            <Text style={styles.serviceName}>{current.service_name}</Text>
            {current.plate ? <Text style={styles.plate}>{current.plate}</Text> : null}
            {current.client_name ? (
              <View style={styles.clientRow}>
                <Icon name="user-check" size={10} color={colors.success} />
                <Text style={styles.clientName}>{current.client_name}</Text>
              </View>
            ) : null}

            <GradientButton
              title="Finish washing"
              variant="dark"
              size="lg"
              icon="check"
              full
              loading={busy}
              onPress={finishWashing}
              style={{ marginTop: spacing.lg }}
            />
            <GradientButton
              title="Payment collected"
              variant="success"
              size="lg"
              icon="credit-card"
              full
              loading={busy}
              onPress={confirmPayment}
              style={{ marginTop: spacing.sm }}
            />
          </Surface>
        ) : (
          <Surface elevation="sm" padded="lg">
            <EmptyState
              icon="car"
              title="No car assigned"
              message="A car appears here the moment a client scans in and you're free."
            />
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, backgroundColor: colors.bgCard },
  headerTitle: { fontSize: font.lg, fontWeight: weight.bold, color: colors.text, letterSpacing: tracking.tight },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  carType: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  serviceName: { fontSize: font.regular, color: colors.textSecondary, fontWeight: weight.semibold, marginTop: 2 },
  plate: {
    fontSize: font.sm, color: colors.textSecondary, fontWeight: weight.bold,
    backgroundColor: colors.bgSunken, alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm, marginTop: spacing.sm,
  },
  clientRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  clientName: { fontSize: font.sm, fontWeight: weight.bold, color: colors.success },
});
