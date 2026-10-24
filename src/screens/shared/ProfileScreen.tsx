import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, orgBg } from '../../theme';
import ScreenHeader from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, ListRow, Field, Avatar } from '../../components/ui';

const ROLE_LABEL: Record<string, string> = {
  worker: 'Worker',
  manager: 'Manager',
  orgadmin: 'Org Admin',
  sysadmin: 'Platform Admin',
  client: 'Client',
};

export default function ProfileScreen() {
  const { actor, refreshActor, logout } = useAuth();
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();
  const role = actor?.role || actor?.type || 'client';

  // Phone-only accounts carry generated placeholders in the email and
  // username columns (…@phone.local, u07…). They are not the person's — show
  // nothing rather than an address nobody owns.
  const isPlaceholderEmail = (e?: string) => /@(phone|walkin)\.local$/i.test(e || '');
  const isPlaceholderUsername = (u?: string) => /^(u0\d{8,}|walkin_)/i.test(u || '');
  const baseEmail = isPlaceholderEmail(actor?.email) ? '' : (actor?.email || '');

  const [fullName, setFullName] = useState(actor?.full_name || '');
  const [email, setEmail] = useState(baseEmail);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The phone is the sign-in identity, so it is shown, not edited here.
  const phoneDisplay = actor?.phone
    ? String(actor.phone).replace(/^\+256(\d{3})(\d{3})(\d{3})$/, '0$1 $2 $3')
    : '';

  const dirty = fullName.trim() !== (actor?.full_name || '')
    || email.trim() !== baseEmail;

  const handleSave = async () => {
    if (!fullName.trim()) {
      alert('Missing name', 'Full name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await api.updateMe({
        full_name: fullName.trim(),
        email: email.trim() || undefined,
      });
      await refreshActor();
      alert('Profile updated', 'Your changes have been saved.');
    } catch (e: any) {
      alert('Error', e.message);
    }
    setSaving(false);
  };

  const displayName = actor?.full_name || actor?.username || 'Account';

  /**
   * Apple (Guideline 5.1.1(v)) and Google Play both require an in-app way
   * to delete an account for any app that lets people create one — a
   * support email is not enough. Client-only: staff and platform accounts
   * are provisioned by an org admin, not self-registered, so there is no
   * equivalent "delete my own account" action for them.
   */
  const confirmDelete = () => {
    alert(
      'Delete your account?',
      'This permanently removes your name, phone, and login details. Your wash and points history stays with the business for their records, but is no longer linked to you. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteClientAccount();
              await logout();
            } catch (e: any) {
              alert('Could not delete account', e.message);
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, orgBg()]}>
      <ScreenHeader title="Profile" subtitle={ROLE_LABEL[role] || role} />

      <KeyboardAvoidingView
        // Full name / email / phone are real editable fields directly on the
        // screen, not inside a sheet — with no avoidance here the keyboard
        // simply covered whichever one was focused, "Save changes" included.
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: spacing.xxl + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Identity card */}
        <Surface elevation="sm" padded="lg" style={styles.identity}>
          <Avatar name={displayName} size={58} variant="brand" />

          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {phoneDisplay
              ? <Text style={styles.handle}>{phoneDisplay}</Text>
              : actor?.username && !isPlaceholderUsername(actor.username)
                ? <Text style={styles.handle}>@{actor.username}</Text>
                : null}
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{ROLE_LABEL[role] || role}</Text>
            </View>
          </View>
        </Surface>

        {/* Editable details */}
        <View>
          <SectionHeader title="Your details" />
          <Surface elevation="sm">
            <Field label="Full name" required value={fullName} onChangeText={setFullName} placeholder="Your name" />
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Field
              label="Phone"
              value={phoneDisplay}
              editable={false}
              placeholder="No phone on file"
              hint={role === 'client'
                ? 'This is the number you sign in with.'
                : 'This is the number you sign in with — ask your manager to change it.'}
              style={{ marginBottom: 0 }}
            />
            <GradientButton
              title={dirty ? 'Save changes' : 'No changes'}
              onPress={handleSave}
              loading={saving}
              disabled={!dirty}
              icon="save"
              full
            />
          </Surface>
        </View>

        {/* Account actions */}
        <View>
          <SectionHeader title="Account" />
          <Surface elevation="sm" padded="sm" style={{ paddingHorizontal: spacing.md }}>
            <ListRow
              leading="sign-out-alt"
              leadingTone="error"
              title="Log out"
              subtitle="Sign out of this device"
              onPress={logout}
              last={role !== 'client'}
            />
            {role === 'client' ? (
              <ListRow
                leading="trash-alt"
                leadingTone="error"
                title="Delete account"
                subtitle={deleting ? 'Deleting…' : 'Permanently remove your account'}
                onPress={deleting ? undefined : confirmDelete}
                last
              />
            ) : null}
          </Surface>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.xl },

  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  name: { fontSize: font.xl, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  handle: { fontSize: font.sm, color: colors.textMuted, marginTop: 1 },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  roleTagText: { fontSize: font.xs, fontWeight: weight.bold, color: colors.primaryText },
});
