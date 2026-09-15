import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import GradientButton from '../../components/GradientButton';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import { Field } from '../../components/ui';
import AuthShell, { AuthError, authStyles } from '../AuthShell';

/** Simple, honest strength read-out — length plus character variety. */
function strengthOf(pw: string): { score: 0 | 1 | 2 | 3; label: string; color: string } {
  if (pw.length < 8) return { score: 0, label: 'Too short', color: colors.error };
  const variety =
    (/[a-z]/.test(pw) ? 1 : 0) +
    (/[A-Z]/.test(pw) ? 1 : 0) +
    (/[0-9]/.test(pw) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
  if (pw.length >= 12 && variety >= 3) return { score: 3, label: 'Strong', color: colors.success };
  if (variety >= 2) return { score: 2, label: 'Good', color: colors.warning };
  return { score: 1, label: 'Weak', color: colors.error };
}

export default function ChangePasswordScreen() {
  const { changePassword, logout, mustChangePassword } = useAuth();
  const navigation = useNavigation<any>();
  const alert = useAppAlert();
  const [current, setCurrent] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const canGoBack = navigation.canGoBack();

  const strength = strengthOf(newPwd);
  const mismatch = confirm.length > 0 && newPwd !== confirm;

  const handleChange = async () => {
    setError('');
    if (!current || !newPwd) {
      setError('Fill in all fields.');
      return;
    }
    if (newPwd !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (newPwd.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(current, newPwd);
      // changePassword() clears must_change_password on the actor, and
      // RootNavigator gates the forced-change stack on exactly that field,
      // so this screen unmounts as a side effect of that one write —
      // nothing here navigates away. It has to stay a single write: when
      // the flag also lived in its own useState, the actor updated first
      // and the flag a moment later, and a render landing between them
      // kept this screen mounted with the password already changed, so
      // logging out was the only way off it.
      // AppAlertProvider is mounted above the navigator, so the alert
      // survives this screen unmounting underneath it.
      alert('Password updated', 'Your password has been changed.');
      if (canGoBack) {
        navigation.goBack();
      }
    } catch (e: any) {
      setError(e.message || 'Could not change password.');
    }
    setLoading(false);
  };

  return (
    <AuthShell
      icon="lock"
      title="Change password"
      subtitle={mustChangePassword ? 'Required before you continue' : 'Choose a new password'}
      onBack={canGoBack ? () => navigation.goBack() : undefined}
    >
      <Text style={authStyles.cardTitle}>New password</Text>
      <Text style={authStyles.cardSub}>Use at least 8 characters with a mix of letters and numbers.</Text>

      <Field
        label="Current password"
        value={current}
        onChangeText={(t) => { setCurrent(t); if (error) setError(''); }}
        secureTextEntry
        placeholder="••••••••"
      />

      <Field
        label="New password"
        value={newPwd}
        onChangeText={(t) => { setNewPwd(t); if (error) setError(''); }}
        secureTextEntry
        placeholder="••••••••"
      />

      {/* Strength meter turns an invisible rule into visible feedback */}
      {newPwd.length > 0 && (
        <View style={styles.strength}>
          <View style={styles.bars}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.bar,
                  { backgroundColor: i < strength.score ? strength.color : colors.bgSunken },
                ]}
              />
            ))}
          </View>
          <Text style={[styles.strengthText, { color: strength.color }]}>{strength.label}</Text>
        </View>
      )}

      <Field
        label="Confirm password"
        value={confirm}
        onChangeText={(t) => { setConfirm(t); if (error) setError(''); }}
        secureTextEntry
        placeholder="••••••••"
        error={mismatch ? 'Passwords do not match' : undefined}
      />

      <AuthError message={error} />

      <GradientButton
        title="Update password"
        onPress={handleChange}
        loading={loading}
        disabled={!current || !newPwd || mismatch}
        icon="save"
        size="lg"
        full
      />

      <TouchableOpacity
        onPress={canGoBack ? () => navigation.goBack() : logout}
        style={authStyles.linkBtn}
        hitSlop={8}
      >
        <Text style={styles.secondaryLink}>{canGoBack ? 'Cancel' : 'Log out instead'}</Text>
      </TouchableOpacity>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  strength: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
  },
  bars: { flexDirection: 'row', gap: 4, flex: 1 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  strengthText: { fontSize: font.micro, fontWeight: weight.heavy, letterSpacing: tracking.caps },
  secondaryLink: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.textSecondary },
});
