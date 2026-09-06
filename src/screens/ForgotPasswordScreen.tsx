import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api';
import { colors, radii, font, spacing, weight, tracking } from '../theme';
import Icon from '../components/Icon';
import GradientButton from '../components/GradientButton';
import DevCodeBanner from '../components/DevCodeBanner';
import { Field } from '../components/ui';
import AuthShell, { AuthError, authStyles } from './AuthShell';

type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();

  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');

  const canRequest = email.trim().length > 0 && !loading;
  const canReset = code.trim().length === 6 && newPassword.length >= 6 && !loading;

  const handleRequest = async () => {
    if (!canRequest) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.requestClientPasswordReset(email.trim());
      setDevCode(data.otp_code || '');
      setStep('reset');
    } catch (e: any) {
      setError(e.message || 'Could not send reset code.');
    }
    setLoading(false);
  };

  const handleReset = async () => {
    if (!canReset) return;
    setLoading(true);
    setError('');
    try {
      await api.resetClientPassword(email.trim(), code.trim(), newPassword);
      setStep('done');
    } catch (e: any) {
      setError(e.message || 'Could not reset password.');
    }
    setLoading(false);
  };

  // ── Success ──
  if (step === 'done') {
    return (
      <AuthShell icon="check" title="Password reset" subtitle="You can sign in with your new password">
        <View style={styles.done}>
          <View style={styles.doneIcon}>
            <Icon name="check" size={22} color={colors.success} />
          </View>
          <Text style={authStyles.cardTitle}>All set</Text>
          <Text style={styles.doneText}>
            Your password has been changed. Sign in with your new details.
          </Text>
        </View>
        <GradientButton
          title="Back to sign in"
          onPress={() => navigation.navigate('Login')}
          size="lg"
          full
          iconRight="arrow-right"
        />
      </AuthShell>
    );
  }

  // ── Enter code + new password ──
  if (step === 'reset') {
    return (
      <AuthShell
        icon="envelope-open-text"
        title="Check your email"
        subtitle={`Code sent to ${email}`}
        onBack={() => setStep('request')}
        backLabel="Use another email"
      >
        <Text style={authStyles.cardTitle}>Enter your code</Text>
        <Text style={authStyles.cardSub}>Then choose a new password for your account.</Text>

        {devCode ? <DevCodeBanner code={devCode} onUse={() => setCode(devCode)} /> : null}

        <Field
          label="Verification code"
          value={code}
          onChangeText={(t) => { setCode(t.replace(/\D/g, '')); if (error) setError(''); }}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          style={styles.codeInput}
        />

        <Field
          label="New password"
          value={newPassword}
          onChangeText={(t) => { setNewPassword(t); if (error) setError(''); }}
          placeholder="At least 6 characters"
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={handleReset}
        />

        <AuthError message={error} />

        <GradientButton
          title="Reset password"
          onPress={handleReset}
          disabled={!canReset}
          loading={loading}
          size="lg"
          full
          iconRight="arrow-right"
        />
      </AuthShell>
    );
  }

  // ── Request a code ──
  return (
    <AuthShell
      icon="key"
      title="Reset password"
      subtitle="We will email you a code"
      onBack={() => navigation.goBack()}
      backLabel="Back to sign in"
    >
      <Text style={authStyles.cardTitle}>Forgot your password?</Text>
      <Text style={authStyles.cardSub}>
        Enter the email on your account and we will send a 6-digit reset code.
      </Text>

      <Field
        label="Email"
        value={email}
        onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
        placeholder="jane@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="go"
        onSubmitEditing={handleRequest}
      />

      <AuthError message={error} />

      <GradientButton
        title="Send reset code"
        onPress={handleRequest}
        disabled={!canRequest}
        loading={loading}
        size="lg"
        full
        iconRight="arrow-right"
      />

      <TouchableOpacity onPress={() => navigation.goBack()} style={authStyles.linkBtn} hitSlop={8}>
        <Text style={authStyles.link}>Remembered it? Sign in</Text>
      </TouchableOpacity>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  codeInput: { textAlign: 'center', fontSize: font.display, fontWeight: weight.black, letterSpacing: 10 },
  done: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  doneIcon: {
    width: 54, height: 54, borderRadius: radii.full,
    backgroundColor: colors.successSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  doneText: { fontSize: font.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 19 },
});
