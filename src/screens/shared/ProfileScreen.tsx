import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import ScreenHeader from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, ListRow, Field, initials } from '../../components/ui';

const ROLE_LABEL: Record<string, string> = {
  worker: 'Worker',
  manager: 'Manager',
  orgadmin: 'Org Admin',
  sysadmin: 'Platform Admin',
  client: 'Client',
};

export default function ProfileScreen() {
  const { actor, refreshActor, logout } = useAuth();
  const navigation = useNavigation<any>();
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();
  const role = actor?.role || actor?.type || 'client';

  const [fullName, setFullName] = useState(actor?.full_name || '');
  const [email, setEmail] = useState(actor?.email || '');
  const [phone, setPhone] = useState(actor?.phone || '');
  const [saving, setSaving] = useState(false);

  const dirty = fullName.trim() !== (actor?.full_name || '')
    || email.trim() !== (actor?.email || '')
    || phone.trim() !== (actor?.phone || '');

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
        phone: phone.trim() || undefined,
      });
      await refreshActor();
      alert('Profile updated', 'Your changes have been saved.');
    } catch (e: any) {
      alert('Error', e.message);
    }
    setSaving(false);
  };

  const displayName = actor?.full_name || actor?.username || 'Account';

  return (
    <View style={styles.container}>
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
        <Surface elevation="sm" style={styles.identity}>
          <LinearGradient
            colors={colors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials(displayName)}</Text>
          </LinearGradient>

          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            {actor?.username ? <Text style={styles.handle}>@{actor.username}</Text> : null}
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{(ROLE_LABEL[role] || role).toUpperCase()}</Text>
            </View>
          </View>
        </Surface>

        {/* Editable details */}
        <View>
          <SectionHeader title="Your details" icon="user-edit" />
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
              value={phone}
              onChangeText={setPhone}
              placeholder="+256700000000"
              keyboardType="phone-pad"
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
          <SectionHeader title="Account" icon="cog" />
          <Surface elevation="sm" padded="sm">
            <ListRow
              leading="lock"
              leadingTone="info"
              title="Change password"
              subtitle="Update your sign-in credentials"
              onPress={() => navigation.navigate('ChangePassword')}
            />
            <ListRow
              leading="sign-out-alt"
              leadingTone="error"
              title="Log out"
              subtitle="Sign out of this device"
              onPress={logout}
              last
            />
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
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 58, height: 58, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: font.xl, fontWeight: weight.black, color: '#fff', letterSpacing: 0.5 },
  name: { fontSize: font.lg, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  handle: { fontSize: font.sm, color: colors.textMuted, marginTop: 1 },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    marginTop: spacing.sm,
  },
  roleTagText: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.primary, letterSpacing: tracking.capsWide },
});
