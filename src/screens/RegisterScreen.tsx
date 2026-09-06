import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api, setTokens, setActor } from '../api';
import { useAuth } from '../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking } from '../theme';
import GradientButton from '../components/GradientButton';
import DevCodeBanner from '../components/DevCodeBanner';
import { Field } from '../components/ui';
import AuthShell, { AuthError, authStyles } from './AuthShell';

type Step = 'form' | 'verify';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { refreshActor } = useAuth();

  const [step, setStep] = useState<Step>('form');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');

  const canSubmitForm =
    fullName.trim().length > 0 &&
    username.trim().length >= 3 &&
    email.trim().length > 0 &&
    password.length >= 6 &&
    !loading;
  const canSubmitCode = code.trim().length === 6 && !loading;

  const handleRegister = async () => {
    if (!canSubmitForm) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.registerClient(fullName.trim(), username.trim(), email.trim(), password);
      setDevCode(data.otp_code || '');
      setStep('verify');
    } catch (e: any) {
      setError(e.message || 'Registration failed.');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    if (!canSubmitCode) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.verifyClientEmail(email.trim(), code.trim());
      await setTokens(data.access_token, data.refresh_token);
      const me = await api.getMe();
      await setActor({ ...me, type: 'client', role: 'client', must_change_password: false });
      await refreshActor();
    } catch (e: any) {
      setError(e.message || 'Verification failed.');
    }
    setLoading(false);
  };

  if (step === 'verify') {
    return (
      <AuthShell
        icon="envelope-open-text"
        title="Check your email"
        subtitle={`We sent a 6-digit code to ${email}`}
        onBack={() => setStep('form')}
        backLabel="Change details"
      >
        <Text style={authStyles.cardTitle}>Verify email</Text>
        <Text style={authStyles.cardSub}>Enter the code to finish creating your account.</Text>

        {devCode ? <DevCodeBanner code={devCode} onUse={() => setCode(devCode)} /> : null}

        <Text style={styles.codeLabel}>VERIFICATION CODE</Text>
        <View style={styles.codeWrap}>
          <Field
            label=""
            value={code}
            onChangeText={(t) => { setCode(t.replace(/\D/g, '')); if (error) setError(''); }}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            returnKeyType="go"
            onSubmitEditing={handleVerify}
            style={styles.codeInput}
          />
        </View>

        <AuthError message={error} />

        <GradientButton
          title="Verify & continue"
          onPress={handleVerify}
          disabled={!canSubmitCode}
          loading={loading}
          size="lg"
          full
          iconRight="arrow-right"
        />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon="user-plus"
      title="Create account"
      subtitle="Join the loyalty program"
      onBack={() => navigation.goBack()}
      backLabel="Back to sign in"
      footer={
        <Text style={authStyles.footnote}>
          We only use your email to verify your account and send wash updates.
        </Text>
      }
    >
      <Text style={authStyles.cardTitle}>Your details</Text>
      <Text style={authStyles.cardSub}>Track your washes and earn free ones.</Text>

      <Field
        label="Full name"
        value={fullName}
        onChangeText={(t) => { setFullName(t); if (error) setError(''); }}
        placeholder="e.g. Jane Doe"
        returnKeyType="next"
      />
      <Field
        label="Username"
        value={username}
        onChangeText={(t) => { setUsername(t); if (error) setError(''); }}
        placeholder="e.g. jane_doe"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        hint="At least 3 characters."
      />
      <Field
        label="Email"
        value={email}
        onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
        placeholder="jane@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="next"
      />
      <Field
        label="Password"
        value={password}
        onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
        placeholder="At least 6 characters"
        secureTextEntry
        returnKeyType="go"
        onSubmitEditing={handleRegister}
      />

      <AuthError message={error} />

      <GradientButton
        title="Create account"
        onPress={handleRegister}
        disabled={!canSubmitForm}
        loading={loading}
        size="lg"
        full
        iconRight="arrow-right"
      />

      <TouchableOpacity onPress={() => navigation.goBack()} style={authStyles.linkBtn} hitSlop={8}>
        <Text style={authStyles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  codeLabel: {
    fontSize: font.micro, fontWeight: weight.heavy,
    color: colors.textSecondary, letterSpacing: tracking.capsWide, marginBottom: 7,
  },
  codeWrap: {},
  codeInput: {
    textAlign: 'center',
    fontSize: font.display,
    fontWeight: weight.black,
    letterSpacing: 10,
  },
});
