import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, spacing, weight, staffType, staffText, orgBg } from '../../theme';
import ScreenHeader from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList,
  Field, PillPicker, FormSheet, Avatar,
} from '../../components/ui';

type Role = 'orgadmin' | 'manager' | 'worker';

const ROLE_LABEL: Record<Role, string> = { orgadmin: 'Org Admin', manager: 'Manager', worker: 'Worker' };
const GROUP_LABEL: Record<Role, string> = { orgadmin: 'Org admins', manager: 'Managers', worker: 'Workers' };

/** +256706965418 → 070 696 5418, matching how the server reads it back. */
function displayPhone(e164: string): string {
  const m = /^\+256(\d{9})$/.exec(e164 || '');
  if (!m) return e164 || '';
  const n = m[1];
  return `0${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

export default function StaffScreen() {
  const { actor } = useAuth();
  const alert = useAppAlert();
  const isOrgAdmin = actor?.role === 'orgadmin';
  // Backend rule (staffRoutes.ts): orgadmin may create orgadmin/manager/worker;
  // manager may create worker only, in their own branch.
  const assignableRoles: Role[] = isOrgAdmin ? ['orgadmin', 'manager', 'worker'] : ['worker'];

  const [staff, setStaff] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create-staff form state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>(assignableRoles[assignableRoles.length - 1]);
  const [branchId, setBranchId] = useState<string>(actor?.branch_id || '');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, b] = await Promise.allSettled([api.listStaff(), api.listBranches()]);
      if (s.status === 'fulfilled') setStaff(s.value);
      if (b.status === 'fulfilled') setBranches(b.value);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFullName('');
    setUsername('');
    setEmail('');
    setPhone('');
    setRole(assignableRoles[assignableRoles.length - 1]);
    setBranchId(isOrgAdmin ? '' : (actor?.branch_id || ''));
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
    // Phone is the sign-in identity now — an account without one cannot be
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

  if (!loaded) {
    return (
      <View style={[styles.container, orgBg()]}>
        <ScreenHeader title="Staff" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={5} showHeader={false} /></ScrollView>
      </View>
    );
  }

  // The working team first, grouped by role so the hierarchy reads at a
  // glance; suspended accounts collect in one group at the end. They used to
  // sit among the active workers — first, as it happened — each on its own
  // tall card, so a crew of twenty took a dozen screens to scan.
  const order: Role[] = ['orgadmin', 'manager', 'worker'];
  const active = staff.filter((s: any) => s.status === 'active');
  const suspended = staff.filter((s: any) => s.status !== 'active');
  const roleOf = (s: any): Role => (order.includes(s.role) ? s.role : 'worker');
  const grouped = order
    .map((r) => ({ key: r, title: GROUP_LABEL[r], members: active.filter((s: any) => roleOf(s) === r) }))
    .filter((g) => g.members.length > 0);
  if (suspended.length) grouped.push({ key: 'suspended' as Role, title: 'Suspended', members: suspended });

  // The row shows who they are and a status word; suspending sits one tap
  // in (with its own confirm), not as a red button on every row — a
  // destructive action is never the loudest thing in a list (Apple HIG,
  // Polaris). Suspend keeps their history; nothing here deletes.
  const renderMember = (s: any, i: number, list: any[]) => {
    const isActive = s.status === 'active';
    const busy = busyId === s.id;
    return (
      <TouchableOpacity
        key={s.id}
        style={[styles.row, i < list.length - 1 && styles.rowBorder]}
        onPress={() => toggleStatus(s)}
        activeOpacity={0.7}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`${s.full_name}, ${isActive ? 'active' : 'suspended'}. ${isActive ? 'Suspend' : 'Activate'}`}
      >
        <Avatar name={s.full_name} size={38} variant={isActive ? 'soft' : 'muted'} />
        <View style={styles.who}>
          <Text style={[styles.name, !isActive && styles.nameOff]} numberOfLines={1}>{s.full_name}</Text>
          {/* Phone leads: it is how they sign in. A missing one is called
              out rather than left blank, because that account cannot be
              signed into. */}
          <Text style={[styles.meta, !s.phone && styles.metaWarn]} numberOfLines={1}>
            {s.phone ? displayPhone(s.phone) : 'No phone — cannot sign in'}
            {s.branch_name ? ` · ${s.branch_name}` : ''}
            {!isActive && s.role ? ` · ${ROLE_LABEL[roleOf(s)]}` : ''}
          </Text>
        </View>
        {busy ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View style={[styles.status, isActive ? styles.statusOn : styles.statusOff]}>
            <Text style={[styles.statusText, { color: isActive ? colors.successText : staffText.secondary }]}>
              {isActive ? 'Active' : 'Suspended'}
            </Text>
          </View>
        )}
        <Icon name="chevron-right" size={14} color={staffText.muted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, orgBg()]}>
      <ScreenHeader
        title="Staff"
        subtitle={`${active.length} active of ${staff.length}`}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <GradientButton title="Add staff member" variant="tonal" icon="user-plus" onPress={openCreate} full />

        {staff.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="users" title="No staff yet" message="Add your first team member to get started." />
          </Surface>
        ) : (
          grouped.map((g) => (
            <View key={g.key}>
              <SectionHeader title={g.title} count={g.members.length} />
              <Surface elevation="sm" padded="sm" style={[styles.listCard, g.key === ('suspended' as Role) && styles.listCardOff]}>
                {g.members.map((s: any, i: number) => renderMember(s, i, g.members))}
              </Surface>
            </View>
          ))
        )}
      </ScrollView>

      <FormSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title="New staff member"
        subtitle="They sign in with their phone and a one-time code"
        submitLabel="Create staff"
        onSubmit={submitCreate}
        submitting={creating}
      >
        <Field label="Full name" required value={fullName} onChangeText={setFullName} placeholder="e.g. Sarah N." />
        <Field
          label="Phone"
          required
          value={phone}
          onChangeText={setPhone}
          placeholder="0700 000 000"
          keyboardType="phone-pad"
          hint="How they sign in — a code is texted to this number."
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
          <PillPicker
            label="Role"
            value={role}
            onChange={setRole}
            options={assignableRoles.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          />
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
            <View style={styles.locked}>
              <Text style={styles.lockedLabel}>Branch</Text>
              <View style={styles.lockedRow}>
                <Icon name="lock" size={14} color={colors.textMuted} />
                <Text style={styles.lockedText}>{actor?.branch_name || 'Your branch'}</Text>
              </View>
            </View>
          )
        )}
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl },

  listCard: { paddingHorizontal: spacing.md },
  listCardOff: { backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 60 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  who: { flex: 1, gap: 2 },
  name: { ...staffType.rowTitle, fontSize: 16 },
  nameOff: { color: staffText.secondary },
  meta: { ...staffType.meta },
  metaWarn: { color: colors.warningText, fontWeight: weight.semibold },

  status: { borderRadius: radii.full, paddingHorizontal: 9, paddingVertical: 3 },
  statusOn: { backgroundColor: colors.successSoft },
  statusOff: { backgroundColor: colors.bgSunken },
  statusText: { ...staffType.caption },

  locked: { gap: 6, marginBottom: spacing.lg },
  lockedLabel: { ...staffType.label, color: staffText.secondary },
  lockedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.bgSunken, borderRadius: radii.md,
    paddingVertical: 13, paddingHorizontal: spacing.lg,
  },
  lockedText: { fontSize: 16, color: staffText.secondary, fontWeight: weight.regular },
});
