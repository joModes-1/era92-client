import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, Tone } from '../../theme';
import Badge from '../../components/Badge';
import AppTopBar from '../../components/AppTopBar';
import ComponentButton1 from '../../components/buttons/ComponentButton1';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList,
  Field, PillPicker, FormSheet, initials,
} from '../../components/ui';

type Role = 'orgadmin' | 'manager' | 'worker';

const ROLE_LABEL: Record<Role, string> = { orgadmin: 'Org Admin', manager: 'Manager', worker: 'Worker' };
const ROLE_TONE: Record<string, Tone> = { orgadmin: 'primary', manager: 'info', worker: 'neutral' };

/** +256706965418 → 070 696 5418, matching how the server reads it back. */
function displayPhone(e164: string): string {
  const m = /^\+256(\d{9})$/.exec(e164 || '');
  if (!m) return e164 || '';
  const n = m[1];
  return `0${n.slice(0, 2)} ${n.slice(2, 5)} ${n.slice(5)}`;
}

export default function StaffScreen() {
  const { actor } = useAuth();
  const navigation = useNavigation<any>();
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <AppTopBar context="Staff" onMenu={() => navigation.openDrawer?.()} />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={5} showHeader={false} /></ScrollView>
      </SafeAreaView>
    );
  }

  // Group by role so the hierarchy is visible at a glance.
  const order: Role[] = ['orgadmin', 'manager', 'worker'];
  const grouped = order
    .map((r) => ({ role: r, members: staff.filter((s: any) => s.role === r) }))
    .filter((g) => g.members.length > 0);
  const other = staff.filter((s: any) => !order.includes(s.role));
  if (other.length) grouped.push({ role: 'worker' as Role, members: other });

  const activeCount = staff.filter((s: any) => s.status === 'active').length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AppTopBar context="Staff" onMenu={() => navigation.openDrawer?.()} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* The page's own title and primary action, rather than a header
            band with an icon-only button — matching how the new screens
            lead with a real headline and a full-width CTA. */}
        <View>
          <Text style={styles.title}>Your team</Text>
          <Text style={styles.subtitle}>{activeCount} active of {staff.length}</Text>
        </View>

        <ComponentButton1
          title="Add staff member"
          onPress={openCreate}
          icon="plus"
        />

        {staff.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="users" title="No staff yet" message="Add your first team member to get started." />
          </Surface>
        ) : (
          grouped.map((g) => (
            <View key={g.role}>
              <SectionHeader title={`${ROLE_LABEL[g.role]}s`} count={g.members.length} />
              <View style={{ gap: spacing.sm }}>
                {g.members.map((s: any) => {
                  const isActive = s.status === 'active';
                  const busy = busyId === s.id;
                  return (
                    <Surface
                      key={s.id}
                      elevation="none"
                      borderless
                      tone={colors.bgSunken}
                      style={[styles.card, !isActive && styles.cardOff]}
                    >
                      <View style={styles.head}>
                        {/* Active staff get the brand roundel; suspended
                            ones fall back to a flat grey so the colour
                            itself signals who is currently working. */}
                        {isActive ? (
                          <LinearGradient
                            colors={colors.rewardIconGradient}
                            start={colors.rewardIconGradientStart}
                            end={colors.rewardIconGradientEnd}
                            style={styles.avatar}
                          >
                            <Text style={styles.avatarText}>{initials(s.full_name)}</Text>
                          </LinearGradient>
                        ) : (
                          <View style={[styles.avatar, styles.avatarOff]}>
                            <Text style={[styles.avatarText, styles.avatarTextOff]}>
                              {initials(s.full_name)}
                            </Text>
                          </View>
                        )}

                        <View style={styles.who}>
                          <Text style={styles.name} numberOfLines={1}>{s.full_name}</Text>
                          {/* Phone leads: it is how they sign in. A missing
                              one is called out rather than left blank,
                              because that account cannot be signed into. */}
                          <Text style={styles.meta} numberOfLines={1}>
                            {s.phone
                              ? displayPhone(s.phone)
                              : 'No phone — cannot sign in'}
                            {s.branch_name ? ` · ${s.branch_name}` : ''}
                          </Text>
                        </View>

                        <Badge
                          label={isActive ? 'Active' : 'Suspended'}
                          tone={isActive ? 'success' : 'error'}
                          dot
                          small
                        />
                      </View>

                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={styles.actionBtn}
                          disabled={busy}
                          onPress={() => toggleStatus(s)}
                          activeOpacity={0.6}
                        >
                          <Icon
                            name={isActive ? 'user-slash' : 'user-check'}
                            size={11}
                            color={isActive ? colors.error : colors.success}
                          />
                          <Text style={[styles.actionText, { color: isActive ? colors.error : colors.success }]}>
                            {isActive ? 'Suspend' : 'Activate'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </Surface>
                  );
                })}
              </View>
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
              <Text style={styles.lockedLabel}>BRANCH</Text>
              <View style={styles.lockedRow}>
                <Icon name="lock" size={11} color={colors.textMuted} />
                <Text style={styles.lockedText}>{actor?.branch_name || 'Your branch'}</Text>
              </View>
            </View>
          )
        )}
      </FormSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgCard },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  title: {
    fontSize: font.xxl,
    fontWeight: weight.black,
    color: colors.text,
    letterSpacing: tracking.tight,
  },
  subtitle: { fontSize: font.sm, color: colors.textMuted, marginTop: 2 },

  card: { gap: spacing.md },
  cardOff: { opacity: 0.72 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 38, height: 38, borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarOff: { backgroundColor: colors.bgSunken },
  // White on the gradient roundel; the suspended variant overrides both
  // the fill and this back to muted grey.
  avatarText: { fontSize: font.sm, fontWeight: weight.heavy, color: '#fff' },
  avatarTextOff: { color: colors.textMuted },
  who: { flex: 1, gap: 2 },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  meta: { fontSize: font.xs, color: colors.textMuted },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 2 },
  actionDivider: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: colors.border },
  actionText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },

  locked: { gap: 7, marginBottom: spacing.lg },
  lockedLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textSecondary, letterSpacing: tracking.capsWide },
  lockedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.bgSunken, borderRadius: radii.md,
    paddingVertical: 13, paddingHorizontal: spacing.lg,
  },
  lockedText: { fontSize: font.regular, color: colors.textSecondary, fontWeight: weight.medium },
});
