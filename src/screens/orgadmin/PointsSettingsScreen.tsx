import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TextInput } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, Field, SkeletonList } from '../../components/ui';

/**
 * The owner's points settings — both schemes on one screen:
 *
 *  - Client points: on/off, what one point is worth (UGX), and per wash type
 *    whether it earns points and how many. Clients spend points at booking.
 *  - Worker points: on/off, what one point is worth, and per wash type how
 *    many points the worker who washes it earns. They rank the leaderboard
 *    and decide who the dispatcher gives a car to first.
 *
 * Numbers are frozen onto each wash when it is booked, so a change here
 * affects new bookings only. Replaces the old "7 washes = 1 free wash"
 * settings — points replaced the stamp card.
 */

type ClientRow = { id: string; name: string; branch_name: string | null; active: boolean; earns_point: boolean; points: string };
type WorkerRow = { id: string; name: string; branch_name: string | null; active: boolean; points: string };

const toInt = (s: string) => {
  const n = parseInt(s.replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

export default function PointsSettingsScreen() {
  const alert = useAppAlert();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState<'client' | 'worker' | null>(null);

  const [clientOn, setClientOn] = useState(true);
  const [clientValue, setClientValue] = useState('100');
  const [clientRows, setClientRows] = useState<ClientRow[]>([]);

  const [workerOn, setWorkerOn] = useState(true);
  const [workerValue, setWorkerValue] = useState('100');
  const [workerRows, setWorkerRows] = useState<WorkerRow[]>([]);

  const load = async () => {
    try {
      const [c, w] = await Promise.all([api.getClientPointsSettings(), api.getWorkerPointsSettings()]);
      setClientOn(!!c.enabled);
      setClientValue(String(c.point_value_ugx ?? 0));
      setClientRows((c.services || []).filter((s: any) => s.active).map((s: any) => ({
        id: s.id, name: s.name, branch_name: s.branch_name, active: s.active,
        earns_point: !!s.earns_point, points: String(s.client_points_awarded ?? 0),
      })));
      setWorkerOn(!!w.enabled);
      setWorkerValue(String(w.point_value_ugx ?? 0));
      setWorkerRows((w.services || []).filter((s: any) => s.active).map((s: any) => ({
        id: s.id, name: s.name, branch_name: s.branch_name, active: s.active,
        points: String(s.worker_points_awarded ?? 0),
      })));
    } catch (e: any) {
      alert('Could not load settings', e.message);
    }
    setLoaded(true);
  };

  useEffect(() => { load(); }, []);

  const saveClient = async () => {
    const bad = clientRows.find((r) => r.earns_point && toInt(r.points) <= 0);
    if (bad) {
      alert('Check the points', `"${bad.name}" earns points, so it must give more than 0 — or switch it off.`);
      return;
    }
    setSaving('client');
    try {
      await api.updateClientPointsSettings({
        enabled: clientOn,
        point_value_ugx: toInt(clientValue),
        services: clientRows.map((r) => ({ id: r.id, earns_point: r.earns_point, client_points_awarded: toInt(r.points) })),
      });
      alert('Saved', 'Client points updated. New bookings use these numbers.');
      await load();
    } catch (e: any) {
      alert('Could not save', e.message);
    }
    setSaving(null);
  };

  const saveWorker = async () => {
    setSaving('worker');
    try {
      await api.updateWorkerPointsSettings({
        enabled: workerOn,
        point_value_ugx: toInt(workerValue),
        services: workerRows.map((r) => ({ id: r.id, worker_points_awarded: toInt(r.points) })),
      });
      alert('Saved', 'Worker points updated. New bookings use these numbers.');
      await load();
    } catch (e: any) {
      alert('Could not save', e.message);
    }
    setSaving(null);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Points Settings" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} /></ScrollView>
      </View>
    );
  }

  const cValue = toInt(clientValue);
  const sampleClient = clientRows.find((r) => r.earns_point && toInt(r.points) > 0);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Points Settings" subtitle="What each wash gives, and what a point is worth" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* ── Client points ── */}
        <View>
          <SectionHeader title="Client points" icon="award" />
          <Surface elevation="sm">
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Clients earn and spend points</Text>
                <Text style={styles.toggleSub}>Switch off to pause the scheme. Balances are kept.</Text>
              </View>
              <Switch value={clientOn} onValueChange={setClientOn} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>

            <Field
              label="Value of 1 point"
              prefix="UGX"
              keyboardType="numeric"
              value={clientValue}
              onChangeText={setClientValue}
              hint={sampleClient && cValue > 0
                ? `${sampleClient.name}: ${toInt(sampleClient.points)} points = UGX ${(toInt(sampleClient.points) * cValue).toLocaleString()} off a later wash.`
                : 'Set 0 to let clients collect points before they can spend them.'}
            />

            <Text style={styles.tableHead}>POINTS PER WASH TYPE</Text>
            {clientRows.map((r, i) => (
              <View key={r.id} style={[styles.row, i === clientRows.length - 1 && styles.rowLast]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{r.name}</Text>
                  {r.branch_name ? <Text style={styles.rowScope}>{r.branch_name} only</Text> : null}
                </View>
                <Switch
                  value={r.earns_point}
                  onValueChange={(v) => setClientRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, earns_point: v } : x)))}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
                <TextInput
                  style={[styles.pointsInput, !r.earns_point && styles.pointsInputOff]}
                  editable={r.earns_point}
                  keyboardType="numeric"
                  value={r.points}
                  onChangeText={(t) => setClientRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, points: t } : x)))}
                />
                <Text style={styles.ptsLabel}>pts</Text>
              </View>
            ))}

            <GradientButton title="Save client points" onPress={saveClient} loading={saving === 'client'} icon="save" full style={{ marginTop: spacing.lg }} />
          </Surface>
        </View>

        {/* ── Worker points ── */}
        <View>
          <SectionHeader title="Worker points" icon="user-check" />
          <Surface elevation="sm">
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Workers earn points</Text>
                <Text style={styles.toggleSub}>Points rank the leaderboard and decide who gets a car first.</Text>
              </View>
              <Switch value={workerOn} onValueChange={setWorkerOn} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>

            <Field
              label="Value of 1 point"
              prefix="UGX"
              keyboardType="numeric"
              value={workerValue}
              onChangeText={setWorkerValue}
              hint="What a worker's points are worth, shown on their account."
            />

            <Text style={styles.tableHead}>POINTS THE WORKER EARNS</Text>
            {workerRows.map((r, i) => (
              <View key={r.id} style={[styles.row, i === workerRows.length - 1 && styles.rowLast]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{r.name}</Text>
                  {r.branch_name ? <Text style={styles.rowScope}>{r.branch_name} only</Text> : null}
                </View>
                <TextInput
                  style={styles.pointsInput}
                  keyboardType="numeric"
                  value={r.points}
                  onChangeText={(t) => setWorkerRows((rows) => rows.map((x) => (x.id === r.id ? { ...x, points: t } : x)))}
                />
                <Text style={styles.ptsLabel}>pts</Text>
              </View>
            ))}

            <GradientButton title="Save worker points" onPress={saveWorker} loading={saving === 'worker'} icon="save" full style={{ marginTop: spacing.lg }} />
          </Surface>
        </View>

        <View style={styles.note}>
          <Icon name="info-circle" size={11} color={colors.textMuted} />
          <Text style={styles.noteText}>
            Each wash keeps the numbers it was booked with, so changes here apply to new bookings only.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  toggleTitle: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  toggleSub: { fontSize: font.xs, color: colors.textSecondary, marginTop: 2 },

  tableHead: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowName: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.text },
  rowScope: { fontSize: font.xs, color: colors.textMuted },
  pointsInput: {
    width: 64, height: 36, borderRadius: radii.sm, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgCard, textAlign: 'center', fontSize: font.sm, fontWeight: weight.bold, color: colors.text,
  },
  pointsInputOff: { backgroundColor: colors.bgSunken, color: colors.textMuted },
  ptsLabel: { fontSize: font.xs, color: colors.textMuted, width: 22 },

  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs },
  noteText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },
});
