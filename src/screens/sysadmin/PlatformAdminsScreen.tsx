import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking } from '../../theme';
import ScreenHeader, { HeaderAction } from '../../components/ScreenHeader';
import Badge from '../../components/Badge';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet, NoticeRow, Avatar,
} from '../../components/ui';

function lastSeen(iso?: string) {
  if (!iso) return 'Never signed in';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 'Never signed in';
  return `Last seen ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export default function PlatformAdminsScreen() {
  const alert = useAppAlert();
  const [admins, setAdmins] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [createVisible, setCreateVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.listPlatformAdmins();
      setAdmins(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openCreate = () => {
    setFullName(''); setUsername(''); setEmail(''); setPhone('');
    setCreateVisible(true);
  };

  const submitCreate = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim()) {
      alert('Missing details', 'Name, username and email are required.');
      return;
    }
    if (username.trim().length < 3) {
      alert('Username too short', 'Use at least 3 characters.');
      return;
    }
    // Phone is how this account signs in (phone + one-time code) — there is
    // no password any more, so an account without one cannot be used.
    if (phone.trim().length < 9) {
      alert('Phone required', 'Enter a valid Ugandan mobile number — it is how this admin signs in.');
      return;
    }
    setCreating(true);
    try {
      const result = await api.createPlatformAdmin({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      const who = fullName.trim();
      setCreateVisible(false);
      await load();
      alert(
        'Platform admin created',
        `${who} now has full platform access.\n\nThey sign in with\n${result.phone_display || phone.trim()}\n\nand the one-time code sent to that phone.`
      );
    } catch (e: any) {
      alert('Error', e.message);
    }
    setCreating(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Platform Admins" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={3} showHeader={false} /></ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Platform Admins"
        subtitle={`${admins.length} with full platform access`}
        action={<HeaderAction icon="plus" onPress={openCreate} />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* These accounts outrank every tenant — make the stakes explicit. */}
        <NoticeRow
          tone="warning"
          icon="shield-alt"
          title="Full access to every organization"
          subtitle="Platform admins can create, suspend and administer every organization on the system."
        />

        {admins.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="user-shield" title="No platform admins" message="Add one to share platform duties." />
          </Surface>
        ) : (
          <View>
            <SectionHeader title="Accounts" count={admins.length} />
            <Surface elevation="sm" padded="sm" style={styles.listCard}>
              {admins.map((a: any, i: number) => {
                const isActive = a.status === 'active';
                return (
                  <View key={a.id} style={[styles.head, i < admins.length - 1 && styles.rowBorder, !isActive && styles.cardOff]}>
                    <Avatar name={a.full_name} size={40} variant={isActive ? 'soft' : 'muted'} />
                    <View style={styles.who}>
                      <Text style={styles.name} numberOfLines={1}>{a.full_name}</Text>
                      <Text style={styles.meta} numberOfLines={1}>
                        {a.phone || (a.username ? `@${a.username}` : a.email)}
                      </Text>
                      <Text style={styles.sub} numberOfLines={1}>{lastSeen(a.last_login_at)}</Text>
                    </View>
                    {/* Only the exception is labelled; "Active" on every
                        row was noise. */}
                    {!isActive ? <Badge label="Suspended" tone="error" dot small /> : null}
                  </View>
                );
              })}
            </Surface>
          </View>
        )}
      </ScrollView>

      <FormSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title="New platform admin"
        subtitle="Full access to every organization"
        submitLabel="Create admin"
        onSubmit={submitCreate}
        submitting={creating}
      >
        <Field label="Full name" required value={fullName} onChangeText={setFullName} placeholder="e.g. Jane Doe" />
        <Field
          label="Username"
          required
          value={username}
          onChangeText={setUsername}
          placeholder="e.g. jane"
          autoCapitalize="none"
          autoCorrect={false}
          hint="What they type to sign in. Letters, numbers, dot, underscore or hyphen."
        />
        <Field
          label="Email"
          required
          value={email}
          onChangeText={setEmail}
          placeholder="jane@era92.com"
          autoCapitalize="none"
          keyboardType="email-address"
          hint="Contact address — also accepted as a login identifier."
        />
        <Field
          label="Phone"
          required
          value={phone}
          onChangeText={setPhone}
          placeholder="+256700000000"
          keyboardType="phone-pad"
          hint="How they sign in — they receive a one-time code on this number. No password."
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

  listCard: { paddingHorizontal: spacing.md },
  cardOff: { opacity: 0.72 },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  who: { flex: 1, gap: 2 },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  meta: { fontSize: font.sm, color: colors.textSecondary },
  sub: { fontSize: font.xs, color: colors.textMuted },
});
