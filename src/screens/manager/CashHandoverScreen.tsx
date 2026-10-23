import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';
import ScreenHeader, { HeaderStat } from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet, initials } from '../../components/ui';

/**
 * Cash Handover — on the worker wallet.
 *
 * Every cash wash puts the worker's wallet in the red by the cash they took
 * minus their commission (server: modules/wallet). This screen lists who
 * owes what and lets the person receiving the notes confirm it — partly or
 * fully, never more than is owed. Confirming moves the wallet back up.
 *
 * It used to "close the worker's shift" with a counted amount. That never
 * touched the wallet, so a worker who had handed everything in still showed
 * as owing it. Shifts carry on as a report; the wallet is the money.
 *
 * A manager sees their own branch's workers. An org admin sees every branch
 * — and can confirm too, which is the only way a manager's own cash gets
 * confirmed (nobody confirms their own).
 */

const ugx = (n: any) => Number(n || 0).toLocaleString();

function sinceLabel(iso?: string | null) {
  if (!iso) return 'never handed in';
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h < 1) return 'handed in just now';
  if (h < 24) return `last handed in ${Math.floor(h)}h ago`;
  const d = Math.floor(h / 24);
  return `last handed in ${d} day${d === 1 ? '' : 's'} ago`;
}

export default function CashHandoverScreen() {
  const alert = useAppAlert();
  const { actor } = useAuth();
  const isOrgAdmin = actor?.role === 'orgadmin';

  const [staff, setStaff] = useState<any[]>([]);
  const [totals, setTotals] = useState({ owed: 0, today: 0 });
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [target, setTarget] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listWallets();
      setStaff(data?.staff || []);
      setTotals({ owed: Number(data?.total_owed_ugx || 0), today: Number(data?.handed_in_today_ugx || 0) });
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openReceive = (s: any) => {
    setTarget(s);
    setAmount(String(s.owes_ugx));
    setNote('');
  };

  const submit = async () => {
    if (!target) return;
    const n = parseInt(amount.replace(/[^\d]/g, ''), 10);
    if (!n || n <= 0) {
      alert('Enter an amount', 'Type how much money you received.');
      return;
    }
    if (n > target.owes_ugx) {
      alert('More than they owe', `${target.full_name} only owes UGX ${ugx(target.owes_ugx)}.`);
      return;
    }
    setSaving(true);
    try {
      const res = await api.receiveCash(target.staff_id, n, note.trim() || undefined);
      setTarget(null);
      await load();
      const still = Number(res?.owes_ugx || 0);
      alert(
        'Money received',
        still === 0
          ? `UGX ${ugx(n)} from ${target.full_name}. They owe nothing now.`
          : `UGX ${ugx(n)} from ${target.full_name}. They still owe UGX ${ugx(still)}.`
      );
    } catch (e: any) {
      const code = String(e?.code || '');
      if (code === 'CANNOT_CONFIRM_OWN') alert('Not your own cash', 'Someone above you has to confirm the cash you collected.');
      else if (code === 'MORE_THAN_OWED') alert('More than they owe', e.message);
      else if (code === 'NOTHING_OWED') alert('Nothing owed', 'This person has already handed everything in.');
      else alert('Could not record it', e?.message || 'Try again.');
    }
    setSaving(false);
  };

  const owing = staff.filter((s) => s.owes_ugx > 0);
  const handedToday = staff.filter((s) => s.handed_in_today_ugx > 0);
  const clear = staff.filter((s) => s.owes_ugx === 0 && s.handed_in_today_ugx === 0);

  // An org admin thinks in branches; a manager has one.
  const byBranch = useMemo(() => {
    const map = new Map<string, { name: string; rows: any[]; total: number }>();
    owing.forEach((s) => {
      const key = s.branch_id || 'none';
      if (!map.has(key)) map.set(key, { name: s.branch_name || 'No branch', rows: [], total: 0 });
      const g = map.get(key)!;
      g.rows.push(s);
      g.total += s.owes_ugx;
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [owing]);

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Cash Handover" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} showHeader={false} /></ScrollView>
      </View>
    );
  }

  const renderOwing = (s: any) => (
    <Surface key={s.staff_id} elevation="sm" style={styles.card}>
      <View style={styles.head}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(s.full_name)}</Text></View>
        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1}>{s.full_name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {s.role === 'manager' ? 'Manager · ' : ''}{sinceLabel(s.last_handover_at)}
          </Text>
        </View>
        <Badge label="Owes cash" tone="warning" dot small />
      </View>
      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>SHOULD HAND IN</Text>
        <Text style={styles.amountValue}>UGX {ugx(s.owes_ugx)}</Text>
      </View>
      <GradientButton title="Receive money" onPress={() => openReceive(s)} icon="hand-holding-usd" full />
    </Surface>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Cash Handover" subtitle={isOrgAdmin ? 'Every branch' : 'Your branch'}>
        <HeaderStat label="Still to collect" value={ugx(totals.owed)} icon="hourglass-half" />
        <HeaderStat label="Handed in today" value={ugx(totals.today)} icon="check-circle" />
      </ScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {staff.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="coins" title="No staff yet" message="Workers appear here once they have an account." />
          </Surface>
        ) : (
          <>
            {owing.length === 0 ? (
              <Surface elevation="sm" tone={colors.successSoft} borderless style={styles.banner}>
                <Icon name="check-circle" size={14} color={colors.success} />
                <Text style={[styles.bannerTitle, { color: colors.success }]}>Nobody owes any cash</Text>
              </Surface>
            ) : isOrgAdmin ? (
              byBranch.map((g) => (
                <View key={g.name}>
                  <SectionHeader title={`${g.name} · UGX ${ugx(g.total)}`} count={g.rows.length} icon="building" />
                  <View style={{ gap: spacing.sm }}>{g.rows.map(renderOwing)}</View>
                </View>
              ))
            ) : (
              <View>
                <SectionHeader title="Money to collect" count={owing.length} icon="hourglass-half" />
                <View style={{ gap: spacing.sm }}>{owing.map(renderOwing)}</View>
              </View>
            )}

            {handedToday.length > 0 && (
              <View>
                <SectionHeader title="Handed in today" count={handedToday.length} icon="check-circle" />
                <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
                  {handedToday.map((s) => (
                    <View key={s.staff_id} style={styles.doneRow}>
                      <View style={[styles.avatar, styles.avatarDone]}><Icon name="check" size={12} color={colors.success} /></View>
                      <Text style={styles.doneName} numberOfLines={1}>{s.full_name}</Text>
                      <Text style={styles.doneAmount}>UGX {ugx(s.handed_in_today_ugx)}</Text>
                    </View>
                  ))}
                </Surface>
              </View>
            )}

            {clear.length > 0 && (
              <View>
                <SectionHeader title="Nothing owed" count={clear.length} icon="user-check" />
                <Surface elevation="sm" padded="lg">
                  <Text style={styles.idleText} numberOfLines={4}>{clear.map((s) => s.full_name).join(', ')}</Text>
                </Surface>
              </View>
            )}
          </>
        )}

        <View style={styles.hint}>
          <Icon name="info-circle" size={11} color={colors.textMuted} />
          <Text style={styles.hintText}>
            A worker keeps their commission out of cash they collect, so they owe the rest. Mobile money and points washes owe nothing.
          </Text>
        </View>
      </ScrollView>

      <FormSheet
        visible={!!target}
        onClose={() => setTarget(null)}
        title="Receive money"
        subtitle={target?.full_name}
        submitLabel="Confirm I have the money"
        onSubmit={submit}
        submitting={saving}
      >
        {target ? (
          <Surface elevation="none" tone={colors.bgSunken} borderless style={styles.expected}>
            <Text style={styles.expectedLabel}>THEY OWE</Text>
            <Text style={styles.expectedValue}>UGX {ugx(target.owes_ugx)}</Text>
          </Surface>
        ) : null}
        <Field
          label="Money you received"
          required
          prefix="UGX"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          hint="Less than they owe is fine — the rest stays on their account."
        />
        <Field
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Will bring the rest tomorrow"
          multiline
          style={{ marginBottom: 0 }}
        />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bannerTitle: { fontSize: font.regular, fontWeight: weight.heavy, letterSpacing: tracking.tight },

  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 38, height: 38, borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarDone: { backgroundColor: colors.successSoft, width: 28, height: 28 },
  avatarText: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.primary },
  who: { flex: 1, gap: 2 },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  meta: { fontSize: font.xs, color: colors.textMuted },

  amountRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    backgroundColor: colors.bgSunken, borderRadius: radii.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  amountLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  amountValue: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },

  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doneName: { flex: 1, fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  doneAmount: { fontSize: font.sm, fontWeight: weight.black, color: colors.success },

  idleText: { fontSize: font.xs, color: colors.textSecondary, lineHeight: 18 },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs },
  hintText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },

  expected: { alignItems: 'center', gap: 3, marginBottom: spacing.lg },
  expectedLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  expectedValue: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
});
