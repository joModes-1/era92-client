import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../../api';
import { colors, spacing, weight, tone as toneMap, staffType, jk } from '../../theme';
import { useAppAlert } from '../../components/AppAlert';
import { Avatar, Field, FormSheet } from '../../components/ui';
import AdminScreen from '../../components/admin/AdminScreen';
import BranchSheet, { BranchOption } from '../../components/admin/BranchSheet';
import {
  Card, Section, Row, Pill, Amount, Seg, Chip, Chips, Btn, Btns, IconBtn, Hr, kitStyles,
} from '../../components/admin/kit';
import { daysAgo, isoLocal, ugx, sinceText, clock, weekday, minutesSince } from './adminData';

type Tab = 'unhanded' | 'handed' | 'variances';

const parseAmount = (v: string) => parseInt(v.replace(/[^\d]/g, ''), 10) || 0;

/**
 * Cash, after the design canvas: the notes workers are holding, who handed
 * in today, and where a counted handover did not match. Mobile money never
 * shows here — it settles itself. Confirming money received works exactly as
 * on Cash Handover (server: modules/wallet), partly or in full, never more
 * than is owed, with a note when it is short.
 */
export default function CashScreen() {
  const alert = useAppAlert();
  const route = useRoute<any>();
  const [tab, setTab] = useState<Tab>('unhanded');
  // An alert opens this page on its own tab (Unhanded or Variances).
  useEffect(() => { if (route.params?.tab) setTab(route.params.tab); }, [route.params]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [data, setData] = useState<any>(null);
  const [target, setTarget] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [wallets, variance, staff, list] = await Promise.allSettled([
      api.listWallets(branchId || undefined),
      api.cashVariance(daysAgo(7), isoLocal(new Date())),
      api.listStaff(),
      api.listBranches(),
    ]);
    const v = (r: PromiseSettledResult<any>, f: any) => (r.status === 'fulfilled' && r.value ? r.value : f);
    setBranches((v(list, []) as any[]).map((b) => ({ id: b.id, name: b.name })));
    setData({ wallets: v(wallets, {}), variance: v(variance, {}), staff: v(staff, []) });
  }, [branchId]);

  useEffect(() => { load(); }, [load]);

  const branchName = branches.find((b) => b.id === branchId)?.name || null;
  const people: any[] = data?.wallets?.staff || [];
  const owing = people.filter((w) => Number(w.owes_ugx || 0) > 0).sort((a, b) => Number(b.owes_ugx) - Number(a.owes_ugx));
  const held = owing.reduce((t, w) => t + Number(w.owes_ugx || 0), 0);
  const heldBranches = new Set(owing.map((w) => w.branch_id)).size;
  const handed = people
    .filter((w) => Number(w.handed_in_today_ugx || 0) > 0)
    .sort((a, b) => String(b.last_handover_at).localeCompare(String(a.last_handover_at)));
  const variances: any[] = (data?.variance?.shifts || [])
    .filter((s: any) => s.variance_ugx !== null && (!branchName || s.branch_name === branchName))
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  const phoneOf = (id: string) => (data?.staff || []).find((s: any) => s.id === id)?.phone || null;

  const open = (w: any) => { setTarget(w); setAmount(String(Number(w.owes_ugx))); setNote(''); };

  const submit = async () => {
    if (!target) return;
    const owes = Number(target.owes_ugx);
    const n = parseAmount(amount);
    if (!n || n <= 0) { alert('Enter an amount', 'Count the notes, then type how much you received.'); return; }
    if (n > owes) { alert('More than they hold', `${target.full_name} only holds UGX ${ugx(owes)}.`); return; }
    if (n < owes && !note.trim()) {
      alert('Add a note', `That is UGX ${ugx(owes - n)} short. Say why — for example, "bringing the rest tomorrow".`);
      return;
    }
    setSaving(true);
    try {
      const res = await api.receiveCash(target.staff_id, n, note.trim() || undefined);
      const name = target.full_name;
      setTarget(null);
      await load();
      const still = Number(res?.owes_ugx || 0);
      alert('Money received', still === 0
        ? `UGX ${ugx(n)} from ${name}. They owe nothing now.`
        : `UGX ${ugx(n)} from ${name}. They still owe UGX ${ugx(still)}.`);
    } catch (e: any) {
      const code = String(e?.code || '');
      if (code === 'CANNOT_CONFIRM_OWN') alert('Not your own cash', 'Someone above you has to confirm the cash you collected.');
      else if (code === 'NOTHING_OWED') alert('Nothing owed', 'This person has already handed everything in.');
      else alert('Could not record it', e?.message || 'Try again.');
    }
    setSaving(false);
  };

  const holderCard = (w: any) => {
    const phone = phoneOf(w.staff_id);
    const days = w.last_handover_at ? Math.floor(minutesSince(w.last_handover_at) / 1440) : null;
    return (
      <Card key={w.staff_id}>
        <View style={styles.who}>
          <Avatar name={w.full_name} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={kitStyles.name} numberOfLines={1}>{w.full_name}</Text>
            <Text style={kitStyles.k} numberOfLines={1}>{w.branch_name} · {sinceText(w.last_handover_at)}</Text>
          </View>
          <Amount>{ugx(w.owes_ugx)}</Amount>
        </View>
        <Hr />
        <Text style={[kitStyles.k, { marginBottom: 10 }]}>
          {days === null ? 'Has never handed in cash'
            : days === 0 ? `Last handed in today at ${clock(w.last_handover_at)}`
            : `${days} day${days === 1 ? '' : 's'} since last handover`}
        </Text>
        <Btns>
          {phone ? <Btn icon="phone" title="Call" onPress={() => Linking.openURL(`tel:${phone}`).catch(() => {})} /> : null}
          <Btn primary title="Confirm received" onPress={() => open(w)} />
        </Btns>
      </Card>
    );
  };

  return (
    <AdminScreen
      title="Cash"
      subtitle={branchName ? `${branchName} · cash payments only` : 'Cash payments only'}
      loading={!data}
      onRefresh={load}
    >
      <Chips>
        <Chip label={branchName || 'All branches'} caret onPress={() => setPicking(true)} />
      </Chips>
      <View style={styles.heldCard}>
        <Text style={[kitStyles.k, styles.heldInk]}>Held by staff, not handed in</Text>
        <Text style={[styles.heldValue, styles.heldInk]} numberOfLines={1} adjustsFontSizeToFit>UGX {ugx(held)}</Text>
        <Text style={[kitStyles.k, styles.heldInk]}>
          {owing.length ? `${owing.length} ${owing.length === 1 ? 'person' : 'people'} across ${heldBranches} branch${heldBranches === 1 ? '' : 'es'}` : 'Everyone has handed in'}
        </Text>
      </View>

      <Seg
        value={tab}
        onChange={setTab}
        options={[
          { value: 'unhanded', label: 'Unhanded' },
          { value: 'handed', label: 'Handed in' },
          { value: 'variances', label: 'Variances' },
        ]}
      />

      {tab === 'unhanded' ? (
        owing.length ? owing.map(holderCard) : (
          <Card flush><Row leading={<Pill tone="ok" label="Clear" />} title="No cash outstanding" sub="Every worker has handed in what they collected" last /></Card>
        )
      ) : null}

      {tab === 'handed' ? (
        <>
          <Section title="Handed in today" />
          <Card flush>
            {handed.length ? handed.map((w, i) => (
              <Row
                key={w.staff_id}
                leading={<Avatar name={w.full_name} size={40} />}
                title={w.full_name}
                sub={`${w.branch_name} · ${clock(w.last_handover_at)}`}
                trailing={<Amount>{ugx(w.handed_in_today_ugx)}</Amount>}
                last={i === handed.length - 1}
              />
            )) : <Row title="Nothing handed in yet today" sub="Confirmed handovers appear here" last />}
          </Card>
        </>
      ) : null}

      {tab === 'variances' ? (
        <>
          <Section title="Variances this week" />
          <Card flush>
            {variances.length ? variances.map((s, i) => {
              const v = Number(s.variance_ugx || 0);
              return (
                <Row
                  key={s.id}
                  title={`${s.branch_name} · ${weekday(String(s.date).slice(0, 10))}`}
                  sub={`Expected ${ugx(s.expected_cash_ugx)} · counted ${ugx(s.counted_cash_ugx)} · ${s.worker_name}`}
                  trailing={<Pill tone={v < 0 ? 'bad' : v > 0 ? 'warn' : 'ok'} label={`${v > 0 ? '+' : ''}${ugx(v)}`} />}
                  last={i === variances.length - 1}
                />
              );
            }) : <Row title="No counted handovers this week" sub="A variance shows when counted cash differs from what was expected" last />}
          </Card>
        </>
      ) : null}


      <BranchSheet visible={picking} onClose={() => setPicking(false)} branches={branches} value={branchId} onPick={setBranchId} />

      <FormSheet
        visible={!!target}
        onClose={() => setTarget(null)}
        title={target ? `Collect from ${target.full_name}` : 'Collect cash'}
        subtitle="Count the notes, then type what you have"
        submitLabel="Confirm I have the money"
        onSubmit={submit}
        submitting={saving}
      >
        {target ? <Text style={styles.owes}>They hold UGX {ugx(target.owes_ugx)}</Text> : null}
        <Field label="Amount received" prefix="UGX" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
        <Field label="Note" hint="Needed if it is less than they hold" value={note} onChangeText={setNote} style={{ marginBottom: 0 }} />
      </FormSheet>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  who: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heldCard: {
    backgroundColor: toneMap.warning.bg, borderWidth: 1, borderColor: toneMap.warning.border,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: spacing.lg,
  },
  heldInk: { color: colors.warningText },
  heldValue: { fontSize: 26, lineHeight: 32, ...jk.semibold, marginTop: 2, ...staffType.tabular },
  owes: { ...staffType.label, marginBottom: spacing.md },
});
