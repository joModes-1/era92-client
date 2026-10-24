import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, spacing, weight, staffType, staffText, orgBg } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader, { HeaderStat } from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet, Avatar, NoticeRow, Hint,
} from '../../components/ui';

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
 * Laid out per STAFF-UI-SPEC.md §4 (Toast shift review, Square "cash owed to
 * house"): each person carries one button with the amount on it — "Collect
 * UGX 141,500" — and the count is typed fresh rather than pre-filled, with
 * the result said in words: Exact, or Short UGX 3,000 (a note required).
 *
 * A manager sees their own branch's workers. An org admin sees every branch
 * — and can confirm too, which is the only way a manager's own cash gets
 * confirmed (nobody confirms their own).
 */

const ugx = (n: any) => Number(n || 0).toLocaleString();

function sinceLabel(iso?: string | null) {
  if (!iso) return 'Never handed in';
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h < 1) return 'Last handed in just now';
  if (h < 24) return `Last handed in ${Math.floor(h)}h ago`;
  const d = Math.floor(h / 24);
  return `Last handed in ${d} day${d === 1 ? '' : 's'} ago`;
}

/** Digits only, as a number (0 when empty). */
const parseAmount = (v: string) => parseInt(v.replace(/[^\d]/g, ''), 10) || 0;

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
  const [showClear, setShowClear] = useState(false);

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
    // Typed fresh, not pre-filled: the manager counts the notes first.
    setAmount('');
    setNote('');
  };

  const submit = async () => {
    if (!target) return;
    const n = parseAmount(amount);
    if (!n || n <= 0) {
      alert('Enter an amount', 'Count the notes, then type how much you received.');
      return;
    }
    if (n > target.owes_ugx) {
      alert('More than they hold', `${target.full_name} only holds UGX ${ugx(target.owes_ugx)}.`);
      return;
    }
    if (n < target.owes_ugx && !note.trim()) {
      alert('Add a note', `That is UGX ${ugx(target.owes_ugx - n)} short. Say why — for example, "bringing the rest tomorrow".`);
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
      <View style={[styles.container, orgBg()]}>
        <ScreenHeader title="Cash Handover" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} showHeader={false} /></ScrollView>
      </View>
    );
  }

  // One button carrying the amount, the way Toast's shift review does
  // ("Collect $X"), in the brand gradient.
  const renderOwing = (s: any) => (
    <Surface key={s.staff_id} elevation="sm" style={styles.card}>
      <View style={styles.head}>
        <Avatar name={s.full_name} size={40} />
        <View style={styles.who}>
          <Text style={styles.name} numberOfLines={1}>{s.full_name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {s.role === 'manager' ? 'Manager · ' : ''}{sinceLabel(s.last_handover_at)}
          </Text>
        </View>
      </View>
      <GradientButton
        title={`Collect UGX ${ugx(s.owes_ugx)}`}
        variant="primary"
        onPress={() => openReceive(s)}
        icon="hand-holding-usd"
        full
      />
    </Surface>
  );

  const counted = parseAmount(amount);
  const diff = target ? counted - Number(target.owes_ugx) : 0;

  return (
    <View style={[styles.container, orgBg()]}>
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
              <NoticeRow tone="success" icon="check" title="Nobody owes any cash" subtitle="Every worker has handed in what they collected." />
            ) : isOrgAdmin ? (
              byBranch.map((g) => (
                <View key={g.name}>
                  <SectionHeader title={g.name} count={g.rows.length} action={`UGX ${ugx(g.total)}`} />
                  <View style={{ gap: spacing.sm }}>{g.rows.map(renderOwing)}</View>
                </View>
              ))
            ) : (
              <View>
                <SectionHeader title="Money to collect" count={owing.length} />
                <View style={{ gap: spacing.sm }}>{owing.map(renderOwing)}</View>
              </View>
            )}

            {handedToday.length > 0 && (
              <View>
                <SectionHeader title="Handed in today" count={handedToday.length} />
                <Surface elevation="sm" tone={colors.successSoft} style={{ gap: spacing.md }}>
                  {handedToday.map((s) => (
                    <View key={s.staff_id} style={styles.doneRow}>
                      <View style={styles.doneIcon}><Icon name="check" size={14} color={colors.success} /></View>
                      <Text style={styles.doneName} numberOfLines={1}>{s.full_name}</Text>
                      <Text style={styles.doneAmount}>UGX {ugx(s.handed_in_today_ugx)}</Text>
                    </View>
                  ))}
                </Surface>
              </View>
            )}

            {/* Named, not counted — but as quiet chips rather than one long
                comma-run that cut off mid-name after four lines. */}
            {clear.length > 0 && (
              <View>
                <SectionHeader
                  title="Nothing owed"
                  count={clear.length}
                  action={showClear ? 'Hide' : 'Show'}
                  onAction={() => setShowClear((v) => !v)}
                />
                {showClear ? (
                  <View style={styles.chips}>
                    {clear.map((s) => (
                      <View key={s.staff_id} style={styles.chip}>
                        <Text style={styles.chipText} numberOfLines={1}>{s.full_name}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            )}
          </>
        )}

        <Hint>
          A worker keeps their commission out of cash they collect, so they owe the rest. Mobile money and points washes owe nothing.
        </Hint>
      </ScrollView>

      <FormSheet
        visible={!!target}
        onClose={() => setTarget(null)}
        title={target ? `Collect from ${target.full_name}` : 'Collect cash'}
        subtitle="Count the notes, then type what you have"
        submitLabel="Confirm I have the money"
        onSubmit={submit}
        submitting={saving}
      >
        {target ? (
          <Surface elevation="none" tone={colors.bg} borderless style={styles.expected}>
            <Text style={styles.expectedLabel}>They hold</Text>
            <Text style={styles.expectedValue}>UGX {ugx(target.owes_ugx)}</Text>
          </Surface>
        ) : null}
        {target && counted > 0 ? (
          <Text
            style={[
              styles.result,
              { color: diff === 0 ? colors.successText : diff < 0 ? colors.warningText : colors.errorText },
            ]}
          >
            {diff === 0
              ? 'Exact — all collected'
              : diff < 0
                ? `Short UGX ${ugx(-diff)} — stays on their account`
                : `UGX ${ugx(diff)} more than they hold`}
          </Text>
        ) : null}
        <Field
          label="Cash you counted"
          required
          prefix="UGX"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          hint="Less is fine — add a note and the rest stays on their account."
        />
        <Field
          label={diff < 0 && counted > 0 ? 'Note (needed — it is short)' : 'Note'}
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
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl },

  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  who: { flex: 1, gap: 2 },
  name: { ...staffType.rowTitle },
  meta: { ...staffType.meta },

  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doneIcon: {
    width: 28, height: 28, borderRadius: radii.full, backgroundColor: colors.successSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  doneName: { ...staffType.rowTitle, fontSize: 16, flex: 1 },
  doneAmount: { ...staffType.label, ...staffType.tabular, fontWeight: weight.bold, color: colors.successText },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.bgCard, borderRadius: radii.full,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  },
  chipText: { ...staffType.meta, color: staffText.secondary },

  expected: { alignItems: 'center', gap: 3, marginBottom: spacing.lg, paddingVertical: spacing.lg },
  expectedLabel: { ...staffType.caption, color: staffText.secondary },
  expectedValue: { ...staffType.hero },
  result: { ...staffType.label, textAlign: 'center', marginTop: -spacing.sm, marginBottom: spacing.lg },
});
