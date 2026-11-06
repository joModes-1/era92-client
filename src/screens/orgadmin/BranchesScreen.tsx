import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, spacing, weight, jk } from '../../theme';
import { useAppAlert } from '../../components/AppAlert';
import { Field, FormSheet } from '../../components/ui';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  Card, Grid2, Stat, Pill, PillTone, Btn, IconBtn, Search, Hr, Row, kitStyles,
} from '../../components/admin/kit';
import { isoLocal, compact } from './adminData';

/**
 * Branches, after the design canvas: a search, two totals, and a card per
 * branch with its manager, team size, today's washes and takings and one
 * status pill. Adding a branch works as before.
 */
export default function BranchesScreen() {
  const alert = useAppAlert();
  const [data, setData] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [createVisible, setCreateVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    const today = isoLocal(new Date());
    const [b, s, r, st] = await Promise.allSettled([
      api.listBranches(), api.listStaff(), api.branches(today, today), api.stale(),
    ]);
    const v = (x: PromiseSettledResult<any>, f: any) => (x.status === 'fulfilled' && x.value ? x.value : f);
    setData({ branches: v(b, []), staff: v(s, []), today: v(r, []), stale: v(st, {}) });
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => { setName(''); setCode(''); setAddress(''); setPhone(''); };

  const submitCreate = async () => {
    if (!name.trim() || !code.trim()) {
      alert('Missing details', 'Branch name and code are required.');
      return;
    }
    setCreating(true);
    try {
      await api.createBranch({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setCreateVisible(false);
      resetForm();
      await load();
      alert('Branch created', `${name} (${code.toUpperCase()}) has been added.`);
    } catch (e: any) {
      alert('Error', e.message);
    }
    setCreating(false);
  };

  const branches: any[] = data?.branches || [];
  const staff: any[] = data?.staff || [];
  const todayBy = new Map<string, any>((data?.today || []).map((r: any) => [r.branch_id, r]));
  const stuck = [...(data?.stale?.long_in_progress || []), ...(data?.stale?.stale_ready || [])];
  const activeCount = branches.filter((b) => b.status === 'active').length;
  const teamTotal = branches.reduce((t, b) => t + Number(b.staff_count || 0), 0);
  const q = query.trim().toLowerCase();
  const shown = branches.filter((b) => !q || `${b.name} ${b.code} ${b.address || ''}`.toLowerCase().includes(q));

  const card = (b: any) => {
    const isActive = b.status === 'active';
    const manager = staff.find((s) => s.branch_id === b.id && s.role === 'manager' && s.status === 'active');
    const t = todayBy.get(b.id);
    const washes = Number(t?.washes || 0);
    const stuckHere = stuck.filter((w: any) => w.branch_name === b.name).length;
    let pill: { tone: PillTone; label: string } = { tone: 'ok', label: 'Clear' };
    if (!isActive) pill = { tone: 'neutral', label: 'Inactive' };
    else if (stuckHere) pill = { tone: 'bad', label: `${stuckHere} stuck` };
    else if (Number(t?.total_variance || 0) < 0) pill = { tone: 'warn', label: 'Variance' };
    else if (Number(t?.disputes || 0) > 0) pill = { tone: 'info', label: `${t.disputes} dispute${Number(t.disputes) > 1 ? 's' : ''}` };
    else if (!manager) pill = { tone: 'neutral', label: 'No manager' };
    const team = Number(b.staff_count || 0);
    return (
      <Card key={b.id}>
        <View style={styles.head}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{b.name}</Text>
            <Text style={kitStyles.k} numberOfLines={1}>
              {manager ? `Manager: ${manager.full_name}` : 'Manager not assigned'} · {team} staff
              {Number(b.suspended_staff_count) > 0 ? ` (+${b.suspended_staff_count} suspended)` : ''}
            </Text>
          </View>
          <Pill tone={pill.tone} label={pill.label} />
        </View>
        {b.address ? <Text style={[kitStyles.k, { marginTop: 4 }]} numberOfLines={1}>{b.code} · {b.address}</Text> : null}
        <Hr />
        <View style={kitStyles.between}>
          <Text style={kitStyles.k}>Today</Text>
          <Text style={styles.amt}>{washes} wash{washes === 1 ? '' : 'es'} · {compact(Number(t?.gross_ugx || 0))}</Text>
        </View>
      </Card>
    );
  };

  return (
    <AdminScreen
      title="Branches"
      subtitle={data ? `${activeCount} active of ${branches.length}` : undefined}
      loading={!data}
      onRefresh={load}
      right={<IconBtn icon="plus" label="Add branch" onPress={() => setCreateVisible(true)} />}
    >
      <Search value={query} onChange={setQuery} placeholder="Search branches" />
      <Grid2>
        <Stat label="Branches" value={String(activeCount)} sub={branches.length > activeCount ? `${branches.length - activeCount} inactive` : 'All active'} />
        <Stat label="Staff" value={String(teamTotal)} sub="Across every branch" />
      </Grid2>

      {shown.length ? shown.map(card) : (
        <Card flush>
          <Row title={branches.length ? 'No branch matches' : 'No branches yet'} sub={branches.length ? 'Try another name or code' : 'Add your first location to start taking washes'} last />
        </Card>
      )}

      <Btn primary icon="plus" title="Add branch" onPress={() => setCreateVisible(true)} />

      <FormSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title="New branch"
        subtitle="Add a location to your organisation"
        submitLabel="Create branch"
        onSubmit={submitCreate}
        submitting={creating}
      >
        <Field label="Branch name" required value={name} onChangeText={setName} placeholder="e.g. Ntinda Bay" />
        <Field
          label="Code"
          required
          value={code}
          onChangeText={setCode}
          placeholder="e.g. NTD"
          autoCapitalize="characters"
          maxLength={10}
          hint="A short prefix used on job numbers."
        />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="123 Ntinda Road" />
        <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+256700000000" keyboardType="phone-pad" />
      </FormSheet>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { fontSize: 16, lineHeight: 22, ...jk.semibold, color: colors.text },
  amt: { fontSize: 15, ...jk.semibold, color: colors.text },
});
