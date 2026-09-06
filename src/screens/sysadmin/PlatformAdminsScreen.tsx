import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader, { HeaderAction } from '../../components/ScreenHeader';
import Badge from '../../components/Badge';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet, initials,
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
  const [busyId, setBusyId] = useState<string | null>(null);

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
    setCreating(true);
    try {
      const result = await api.createPlatformAdmin({
        full_name: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      const who = fullName.trim();
      setCreateVisible(false);
      await load();
      alert(
        'Platform admin created',
        `${who} now has full platform access.\n\nUsername: ${result.username || username.trim()}\nTemporary password: ${result.temp_password}\n\nShown only once — share it securely.`
      );
    } catch (e: any) {
      alert('Error', e.message);
    }
    setCreating(false);
  };

  const doReset = (admin: any) => {
    alert(
      'Reset password',
      `Reset the password for ${admin.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setBusyId(admin.id);
            try {
              const result = await api.resetPlatformAdminPassword(admin.id);
              alert(
                'Password reset',
                `New temporary password for ${admin.full_name}:\n\n${result.temp_password}\n\nShown only once — share it securely.`
              );
              await load();
            } catch (e: any) {
              // Backend refuses self-reset; surface that plainly.
              alert('Could not reset', e.message);
            }
            setBusyId(null);
          },
        },
      ]
    );
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
        <Surface elevation="sm" tone={colors.warningSoft} borderless style={styles.notice}>
          <Icon name="shield-alt" size={13} color={colors.warning} />
          <Text style={styles.noticeText}>
            Platform admins can create, suspend and administer every organization on the system.
          </Text>
        </Surface>

        {admins.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="user-shield" title="No platform admins" message="Add one to share platform duties." />
          </Surface>
        ) : (
          <View>
            <SectionHeader title="Accounts" count={admins.length} icon="user-shield" />
            <View style={{ gap: spacing.sm }}>
              {admins.map((a: any) => {
                const isActive = a.status === 'active';
                const busy = busyId === a.id;
                return (
                  <Surface key={a.id} elevation="sm" style={[styles.card, !isActive && styles.cardOff]}>
                    <View style={styles.head}>
                      <View style={[styles.avatar, !isActive && styles.avatarOff]}>
                        <Text style={styles.avatarText}>{initials(a.full_name)}</Text>
                      </View>
                      <View style={styles.who}>
                        <Text style={styles.name} numberOfLines={1}>{a.full_name}</Text>
                        <Text style={styles.meta} numberOfLines={1}>
                          {a.username ? `@${a.username}` : a.email}
                        </Text>
                        <Text style={styles.sub} numberOfLines={1}>{lastSeen(a.last_login_at)}</Text>
                      </View>
                      <View style={styles.badges}>
                        <Badge label={isActive ? 'Active' : 'Suspended'} tone={isActive ? 'success' : 'error'} dot small />
                        {a.must_change_password ? <Badge label="Pending setup" tone="warning" small /> : null}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      disabled={busy}
                      onPress={() => doReset(a)}
                      activeOpacity={0.6}
                    >
                      <Icon name="key" size={11} color={colors.textSecondary} />
                      <Text style={styles.actionText}>Reset password</Text>
                    </TouchableOpacity>
                  </Surface>
                );
              })}
            </View>
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
          value={phone}
          onChangeText={setPhone}
          placeholder="+256700000000"
          keyboardType="phone-pad"
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

  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noticeText: { flex: 1, fontSize: font.sm, color: colors.warning, fontWeight: weight.semibold, lineHeight: 18 },

  card: { gap: spacing.md },
  cardOff: { opacity: 0.72 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  avatar: {
    width: 38, height: 38, borderRadius: radii.full,
    backgroundColor: colors.ink[900],
    alignItems: 'center', justifyContent: 'center',
  },
  avatarOff: { backgroundColor: colors.ink[400] },
  avatarText: { fontSize: font.sm, fontWeight: weight.heavy, color: '#fff' },
  who: { flex: 1, gap: 2 },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  meta: { fontSize: font.xs, color: colors.textSecondary },
  sub: { fontSize: font.micro, color: colors.textMuted },
  badges: { alignItems: 'flex-end', gap: 4 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight,
  },
  actionText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
});
