import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, spacing, weight, staffType, staffText } from '../../theme';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import { Field, PillPicker, FormSheet, Avatar } from '../../components/ui';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  Card, Section, Row, Pill, PillTone, Chip, Chips, Seg, Btn, IconBtn, Search,
} from '../../components/admin/kit';
import { compact } from '../orgadmin/adminData';

type Role = 'orgadmin' | 'manager' | 'worker';
type Filter = 'all' | 'manager' | 'worker';

const ROLE_LABEL: Record<Role, string> = { orgadmin: 'Org Admin', manager: 'Manager', worker: 'Worker' };
const ROLE_PILL: Record<Role, PillTone> = { orgadmin: 'info', manager: 'info', worker: 'neutral' };

/** +256706965418 → 070 696 5418, matching how the server reads it back. */
function displayPhone(e164: string): string {
  const m = /^\+256(\d{9})$/.exec(e164 || '');
  if (!m) return e164 || '';
  const n = m[1];
  return `0${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

/**
 * Staff, after the design canvas: search, a branch filter (org admin), the
 * team split into managers and workers, grouped by branch, each person with
 * their sign-in phone, any cash they hold and their role. Tapping someone
 * suspends or re-activates them, with a confirm; nothing here deletes.
 */
export default function StaffScreen() {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const isOrgAdmin = actor?.role === 'orgadmin';
  // Backend rule (staffRoutes.ts): orgadmin may create orgadmin/manager/worker;
  // manager may create worker only, in their own branch.
  const assignableRoles: Role[] = isOrgAdmin ? ['worker', 'manager', 'orgadmin'] : ['worker'];

  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [holds, setHolds] = useState<Map<string, number>>(new Map());
  const [loaded, setLoaded] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [branchFilter, setBranchFilter] = useState<string | null>(null);

  // Create-staff form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('worker');
  const [branchId, setBranchId] = useState<string>(actor?.branch_id || '');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const [s, b, w] = await Promise.allSettled([api.listStaff(), api.listBranches(), api.listWallets()]);
    if (s.status === 'fulfilled') setStaff(s.value || []);
    if (b.status === 'fulfilled') setBranches(b.value || []);
    if (w.status === 'fulfilled' && w.value) {
      setHolds(new Map((w.value.staff || []).map((x: any) => [x.staff_id, Number(x.owes_ugx || 0)])));
    }
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const resetForm = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setPhone('');
    setRole('worker');
    setBranchId(isOrgAdmin ? (branchFilter || '') : (actor?.branch_id || ''));
  };

  const openCreate = () => {
    resetForm();
    setCreateVisible(true);
  };

  const submitCreate = async () => {
    if (!fullName.trim() || !username.trim()) {
      alert('Missing details', 'Full name and username are required.');
      return;
    }
    // Phone is the sign-in identity — an account without one cannot be
    // signed into at all, so it is checked here rather than left to the
    // server to reject after the form has been filled in.
    if (phone.replace(/\D/g, '').length < 9) {
      alert('Missing phone', 'A phone number is required — it is how they sign in.');
      return;
    }
    if (role !== 'orgadmin' && !branchId) {
      alert('Missing branch', 'Choose a branch for this role.');
      return;
    }
    setCreating(true);
    try {
      const result = await api.createStaff({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        role,
        branch_id: role === 'orgadmin' ? undefined : branchId,
      });
      setCreateVisible(false);
      await load();
      alert(
        'Staff created',
        `${fullName} signs in with ${result.phone_display} — they enter that number and the code texted to it. No password to share.`
      );
    } catch (e: any) {
      alert('Error', e.message);
    }
    setCreating(false);
  };

  const toggleStatus = (member: any) => {
    const suspending = member.status === 'active';
    alert(
      suspending ? 'Suspend staff' : 'Activate staff',
      `${suspending ? 'Suspend' : 'Activate'} ${member.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: suspending ? 'Suspend' : 'Activate',
          style: suspending ? 'destructive' : 'default',
          onPress: async () => {
            setBusyId(member.id);
            try {
              if (suspending) await api.suspendStaff(member.id);
              else await api.activateStaff(member.id);
              await load();
            } catch (e: any) {
              alert('Error', e.message);
            }
            setBusyId(null);
          },
        },
      ]
    );
  };

  const roleOf = (s: any): Role => (s.role === 'orgadmin' || s.role === 'manager' ? s.role : 'worker');
  const q = query.trim().toLowerCase();
  const digits = q.replace(/\D/g, '');
  const matches = (s: any) => !q
    || String(s.full_name).toLowerCase().includes(q)
    || (digits.length >= 3 && String(s.phone || '').replace(/\D/g, '').includes(digits));
  const inScope = staff.filter((s) => matches(s) && (!branchFilter || s.branch_id === branchFilter));
  const managersN = inScope.filter((s) => roleOf(s) !== 'worker').length;
  const workersN = inScope.filter((s) => roleOf(s) === 'worker').length;
  const shown = inScope.filter((s) => filter === 'all' || (filter === 'manager' ? roleOf(s) !== 'worker' : roleOf(s) === 'worker'));

  // Grouped by branch, managers first, suspended people last in each group.
  const rank = (s: any) => (s.status === 'active' ? 0 : 10) + (roleOf(s) === 'orgadmin' ? 0 : roleOf(s) === 'manager' ? 1 : 2);
  const groups = new Map<string, { title: string; members: any[] }>();
  shown.forEach((s) => {
    const key = s.branch_id || 'org';
    if (!groups.has(key)) groups.set(key, { title: s.branch_name || 'Head office', members: [] });
    groups.get(key)!.members.push(s);
  });
  const grouped = [...groups.values()]
    .map((g) => ({ ...g, members: g.members.sort((a, b) => rank(a) - rank(b) || String(a.full_name).localeCompare(b.full_name)) }))
    .sort((a, b) => (a.title === 'Head office' ? -1 : b.title === 'Head office' ? 1 : a.title.localeCompare(b.title)));

  const activeCount = staff.filter((s) => s.status === 'active').length;

  const member = (s: any, i: number, list: any[]) => {
    const isActive = s.status === 'active';
    const held = holds.get(s.id) || 0;
    const sub = [
      s.phone ? displayPhone(s.phone) : 'No phone — cannot sign in',
      held > 0 ? `holds ${compact(held)}` : '',
    ].filter(Boolean).join(' · ');
    return (
      <Row
        key={s.id}
        leading={<Avatar name={s.full_name} size={40} variant={isActive ? 'soft' : 'muted'} />}
        title={s.full_name}
        titleStyle={!isActive ? { color: staffText.secondary } : undefined}
        sub={sub}
        trailing={busyId === s.id
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Pill tone={isActive ? ROLE_PILL[roleOf(s)] : 'bad'} label={isActive ? ROLE_LABEL[roleOf(s)] : 'Suspended'} />}
        onPress={() => toggleStatus(s)}
        last={i === list.length - 1}
      />
    );
  };

  return (
    <AdminScreen
      title="Staff"
      subtitle={loaded ? `${activeCount} active of ${staff.length}` : undefined}
      loading={!loaded}
      onRefresh={load}
      right={<IconBtn icon="user-plus" label="Add staff member" onPress={openCreate} />}
    >
      <Search value={query} onChange={setQuery} placeholder="Search by name or phone" />

      {isOrgAdmin && branches.length > 1 ? (
        <Chips>
          <Chip label="All branches" on={!branchFilter} onPress={() => setBranchFilter(null)} />
          {branches.map((b: any) => (
            <Chip key={b.id} label={b.name} on={branchFilter === b.id} onPress={() => setBranchFilter(b.id)} />
          ))}
        </Chips>
      ) : null}

      <Seg
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: `Everyone ${inScope.length}` },
          { value: 'manager', label: `Managers ${managersN}` },
          { value: 'worker', label: `Workers ${workersN}` },
        ]}
      />

      {grouped.length === 0 ? (
        <Card flush>
          <Row
            title={staff.length ? 'Nobody matches' : 'No staff yet'}
            sub={staff.length ? 'Try another name, phone or branch' : 'Add your first team member to get started'}
            last
          />
        </Card>
      ) : grouped.map((g) => (
        <View key={g.title} style={{ gap: 14 }}>
          <Section title={g.title} />
          <Card flush>{g.members.map((s, i) => member(s, i, g.members))}</Card>
        </View>
      ))}

      <Btn primary icon="user-plus" title="Add staff member" onPress={openCreate} />


      <FormSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title="Add staff"
        subtitle="They sign in with their phone and a one-time code"
        submitLabel="Create staff"
        onSubmit={submitCreate}
        submitting={creating}
      >
        <Field label="Full name" required value={fullName} onChangeText={setFullName} placeholder="e.g. Sarah N." />
        <Field
          label="Phone number"
          required
          value={phone}
          onChangeText={setPhone}
          placeholder="07XX XXX XXX"
          keyboardType="phone-pad"
          hint="Used to sign in, and to call about cash and jobs."
        />
        <Field
          label="Username"
          required
          value={username}
          onChangeText={setUsername}
          placeholder="e.g. sarah"
          autoCapitalize="none"
          autoCorrect={false}
          hint="Their handle in reports and activity."
        />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="sarah@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          hint="Optional — for contact only, nothing is sent to it."
        />

        {assignableRoles.length > 1 && (
          <View style={styles.field}>
            <Text style={styles.label}>Role</Text>
            <Seg value={role} onChange={setRole} options={assignableRoles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
          </View>
        )}

        {role !== 'orgadmin' && (
          isOrgAdmin ? (
            <PillPicker
              label="Branch"
              value={branchId}
              onChange={setBranchId}
              options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
            />
          ) : (
            <View style={styles.field}>
              <Text style={styles.label}>Branch</Text>
              <View style={styles.lockedRow}>
                <Icon name="lock" size={14} color={colors.textMuted} />
                <Text style={styles.lockedText}>{actor?.branch_name || 'Your branch'}</Text>
              </View>
            </View>
          )
        )}
      </FormSheet>
    </AdminScreen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6, marginBottom: spacing.lg },
  label: { ...staffType.label, color: staffText.secondary },
  lockedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.bgSunken, borderRadius: radii.md,
    paddingVertical: 13, paddingHorizontal: spacing.lg,
  },
  lockedText: { fontSize: 16, color: staffText.secondary, fontWeight: weight.regular },
});
