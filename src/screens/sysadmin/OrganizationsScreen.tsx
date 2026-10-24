import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, Tone } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader, { HeaderAction } from '../../components/ScreenHeader';
import Badge from '../../components/Badge';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet, NoticeRow,
} from '../../components/ui';

/** Auto-derive a URL-safe slug so the sysadmin does not have to invent one. */
function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50);
}

/** How a tenant's billing state reads to a platform admin at a glance. */
const BILLING_META: Record<string, { label: string; tone: Tone }> = {
  trial: { label: 'Trial', tone: 'info' },
  active: { label: 'Paying', tone: 'success' },
  past_due: { label: 'Overdue', tone: 'error' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

const compactUgx = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${Math.round(n)}`;
};

export default function OrganizationsScreen() {
  const alert = useAppAlert();
  const navigation = useNavigation<any>();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create-org form
  const [createVisible, setCreateVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  // Add-admin-to-existing-org form
  const [adminTarget, setAdminTarget] = useState<any>(null);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [addingAdmin, setAddingAdmin] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.platformOrgs();
      setOrgs(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openCreate = () => {
    setName(''); setSlug(''); setSlugTouched(false);
    setContactName(''); setPhone('');
    setAdminName(''); setAdminEmail(''); setAdminPhone('');
    setCreateVisible(true);
  };

  const onNameChange = (t: string) => {
    setName(t);
    if (!slugTouched) setSlug(slugify(t));
  };

  const submitCreate = async () => {
    if (!name.trim() || !slug.trim()) {
      alert('Missing details', 'Organization name and slug are required.');
      return;
    }
    if (!adminName.trim() || !adminEmail.trim()) {
      alert('Missing admin', 'The first org admin needs a name and email.');
      return;
    }
    // Phone is the admin's sign-in identity now — no password is generated.
    if (adminPhone.trim().length < 9) {
      alert('Admin phone required', 'The first org admin signs in with phone + one-time code, so a valid number is required.');
      return;
    }
    setCreating(true);
    try {
      const result = await api.createOrg({
        name: name.trim(),
        slug: slug.trim(),
        phone: phone.trim() || undefined,
        contact_name: contactName.trim() || undefined,
        admin_name: adminName.trim(),
        admin_email: adminEmail.trim(),
        admin_phone: adminPhone.trim(),
      });
      setCreateVisible(false);
      await load();
      alert(
        'Organization created',
        `${name.trim()} is live.\n\nIts admin signs in with\n${result.admin_phone_display || adminPhone.trim()}\n\nand the one-time code sent to that phone.`
      );
    } catch (e: any) {
      alert('Error', e.message);
    }
    setCreating(false);
  };

  const openAddAdmin = (org: any) => {
    setAdminTarget(org);
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminPhone('');
  };

  const submitAddAdmin = async () => {
    if (!newAdminName.trim() || !newAdminEmail.trim()) {
      alert('Missing details', 'Name and email are required.');
      return;
    }
    if (newAdminPhone.trim().length < 9) {
      alert('Phone required', 'This admin signs in with phone + one-time code, so a valid number is required.');
      return;
    }
    setAddingAdmin(true);
    try {
      const result = await api.addOrgAdmin(adminTarget.id, {
        full_name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        phone: newAdminPhone.trim(),
      });
      const orgName = adminTarget.name;
      setAdminTarget(null);
      await load();
      alert(
        'Org admin added',
        `${newAdminName.trim()} can now administer ${orgName}.\n\nThey sign in with\n${result.phone_display || newAdminPhone.trim()}\n\nand the one-time code sent to that phone.`
      );
    } catch (e: any) {
      alert('Error', e.message);
    }
    setAddingAdmin(false);
  };

  const toggleStatus = (org: any) => {
    const suspending = org.status === 'active';
    if (!suspending) {
      alert('Activate organization', `Reactivate ${org.name}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
          onPress: async () => {
            setBusyId(org.id);
            try { await api.activateOrg(org.id); await load(); }
            catch (e: any) { alert('Error', e.message); }
            setBusyId(null);
          },
        },
      ]);
      return;
    }
    // Suspending locks every user in the tenant out — say so plainly.
    alert(
      'Suspend organization',
      `Suspend ${org.name}? Everyone in this organization loses access until it is reactivated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            setBusyId(org.id);
            try { await api.suspendOrg(org.id, 'Suspended by platform admin'); await load(); }
            catch (e: any) { alert('Error', e.message); }
            setBusyId(null);
          },
        },
      ]
    );
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Organizations" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} showHeader={false} /></ScrollView>
      </View>
    );
  }

  const active = orgs.filter((o: any) => o.status === 'active');
  const suspended = orgs.filter((o: any) => o.status !== 'active');
  const paying = orgs.filter((o: any) => o.billing_status === 'active').length;
  const overdueCount = orgs.filter((o: any) => o.billing_status === 'past_due').length;

  const renderOrg = (org: any) => {
    const isActive = org.status === 'active';
    const busy = busyId === org.id;
    const bm = BILLING_META[org.billing_status] || BILLING_META.trial;
    const days = org.days_to_due == null ? null : Number(org.days_to_due);
    const overdue = days != null && days < 0;
    const gross = Number(org.gross_this_month || 0);

    return (
      <Surface key={org.id} elevation="sm" style={[styles.card, !isActive && styles.cardOff]}>
        {/* The whole header is the drill-down: a platform admin wants the
            org's own page far more often than they want a row action. */}
        <TouchableOpacity
          style={styles.head}
          onPress={() => navigation.navigate('Org Detail', { orgId: org.id })}
          activeOpacity={0.7}
        >
          <View style={[styles.mark, !isActive && styles.markOff]}>
            <Text style={styles.markText}>{(org.name || '?').trim().charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.who}>
            <Text style={styles.name} numberOfLines={1}>{org.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {Number(org.branch_count || 0)} branch{Number(org.branch_count) === 1 ? '' : 'es'} · {Number(org.staff_count || 0)} staff · {Number(org.client_count || 0)} customers
            </Text>
          </View>
          <Icon name="chevron-right" size={11} color={colors.ink[300]} />
        </TouchableOpacity>

        {/* Two numbers that answer different questions: what they earn on the
            software, and what they pay us for it. */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{compactUgx(gross)}</Text>
            <Text style={styles.statLabel}>Their takings, this month</Text>
          </View>
          <View style={styles.statDivide} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {org.plan_price_ugx != null ? compactUgx(Number(org.plan_price_ugx)) : '—'}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {org.plan_name || 'No plan'}{org.billing_cycle ? ` / ${org.billing_cycle.replace('ly', '')}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.badges}>
          <Badge label={isActive ? 'Active' : 'Suspended'} tone={isActive ? 'success' : 'error'} dot small />
          <Badge label={bm.label} tone={bm.tone} small />
          {days != null && (
            <Text style={[styles.due, overdue && styles.dueLate]}>
              {overdue
                ? `${Math.abs(days)}d overdue`
                : days === 0
                ? 'Renews today'
                : `Renews in ${days}d`}
            </Text>
          )}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            disabled={busy}
            onPress={() => openAddAdmin(org)}
            activeOpacity={0.6}
          >
            <Icon name="user-shield" size={12} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primaryText }]}>Add admin</Text>
          </TouchableOpacity>

          <View style={styles.actionDivider} />

          <TouchableOpacity
            style={styles.actionBtn}
            disabled={busy}
            onPress={() => toggleStatus(org)}
            activeOpacity={0.6}
          >
            <Icon
              name={isActive ? 'ban' : 'check-circle'}
              size={12}
              color={isActive ? colors.error : colors.success}
            />
            <Text style={[styles.actionText, { color: isActive ? colors.errorText : colors.successText }]}>
              {isActive ? 'Suspend' : 'Activate'}
            </Text>
          </TouchableOpacity>
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Organizations"
        subtitle={`${active.length} active of ${orgs.length} · ${paying} paying`}
        action={<HeaderAction icon="plus" onPress={openCreate} />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {overdueCount > 0 && (
          <NoticeRow
            tone="error"
            icon="exclamation-triangle"
            title={`${overdueCount} organisation${overdueCount === 1 ? ' is' : 's are'} past due on payment`}
            subtitle="Open Billing to see who to chase"
            onPress={() => navigation.navigate('Billing')}
          />
        )}

        {orgs.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState
              icon="building"
              title="No organizations yet"
              message="Onboard your first tenant to get started."
            />
          </Surface>
        ) : (
          <>
            {active.length > 0 && (
              <View>
                <SectionHeader title="Active" count={active.length} />
                <View style={{ gap: spacing.sm }}>{active.map(renderOrg)}</View>
              </View>
            )}
            {suspended.length > 0 && (
              <View>
                <SectionHeader title="Suspended" count={suspended.length} />
                <View style={{ gap: spacing.sm }}>{suspended.map(renderOrg)}</View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Onboard a new tenant ── */}
      <FormSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title="New organization"
        subtitle="Creates the tenant and its first admin"
        submitLabel="Create organization"
        onSubmit={submitCreate}
        submitting={creating}
      >
        <Text style={styles.groupLabel}>Organization</Text>
        <Field label="Name" required value={name} onChangeText={onNameChange} placeholder="e.g. Shine Motors" />
        <Field
          label="Slug"
          required
          value={slug}
          onChangeText={(t) => { setSlugTouched(true); setSlug(slugify(t)); }}
          placeholder="shine-motors"
          autoCapitalize="none"
          hint="Used in URLs. Auto-filled from the name."
        />
        <Field label="Contact name" value={contactName} onChangeText={setContactName} placeholder="e.g. Shine Owner" />
        <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+256700000000" keyboardType="phone-pad" />

        <Text style={[styles.groupLabel, styles.groupLabelNext]}>First org admin</Text>
        <Field label="Admin name" required value={adminName} onChangeText={setAdminName} placeholder="e.g. Jane Doe" />
        <Field
          label="Admin email"
          required
          value={adminEmail}
          onChangeText={setAdminEmail}
          placeholder="jane@shinemotors.com"
          autoCapitalize="none"
          keyboardType="email-address"
          hint="Contact address only — they sign in with the phone number below."
        />
        <Field
          label="Admin phone"
          required
          value={adminPhone}
          onChangeText={setAdminPhone}
          placeholder="+256700000000"
          keyboardType="phone-pad"
          hint="How they sign in — they receive a one-time code on this number."
          style={{ marginBottom: 0 }}
        />
      </FormSheet>

      {/* ── Add another admin to an existing org ── */}
      <FormSheet
        visible={!!adminTarget}
        onClose={() => setAdminTarget(null)}
        title="Add org admin"
        subtitle={adminTarget?.name}
        submitLabel="Create admin"
        onSubmit={submitAddAdmin}
        submitting={addingAdmin}
      >
        <Field label="Full name" required value={newAdminName} onChangeText={setNewAdminName} placeholder="e.g. Jane Doe" />
        <Field
          label="Email"
          required
          value={newAdminEmail}
          onChangeText={setNewAdminEmail}
          placeholder="jane@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          hint="Contact address only — they sign in with the phone number below."
        />
        <Field
          label="Phone"
          required
          value={newAdminPhone}
          onChangeText={setNewAdminPhone}
          placeholder="+256700000000"
          keyboardType="phone-pad"
          hint="How they sign in — they receive a one-time code on this number."
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
  cardOff: { opacity: 0.72 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  mark: {
    width: 38, height: 38, borderRadius: radii.md,
    backgroundColor: colors.ink[900],
    alignItems: 'center', justifyContent: 'center',
  },
  markOff: { backgroundColor: colors.ink[400] },
  markText: { fontSize: font.lg, fontWeight: weight.black, color: '#fff' },
  who: { flex: 1, gap: 2 },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  meta: { fontSize: font.sm, color: colors.textMuted },

  stats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg, borderRadius: radii.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
  },
  stat: { flex: 1, gap: 2 },
  statValue: { fontSize: font.lg, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  statLabel: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.medium },
  statDivide: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: colors.border, marginHorizontal: spacing.md },

  badges: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  due: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.semibold },
  dueLate: { color: colors.errorText, fontWeight: weight.heavy },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderLight,
  },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 2 },
  actionDivider: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: colors.border },
  actionText: { fontSize: font.sm, fontWeight: weight.bold },

  groupLabel: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, marginBottom: spacing.md },
  groupLabelNext: {
    marginTop: spacing.xs, paddingTop: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight,
  },
});
