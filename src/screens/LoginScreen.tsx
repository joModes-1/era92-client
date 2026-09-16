import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking, shadow, noFocusRing } from '../theme';
import Icon from '../components/Icon';
import GradientButton from '../components/GradientButton';

export default function LoginScreen() {
  const { login } = useAuth();
  const navigation = useNavigation<any>();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focus, setFocus] = useState<'id' | 'pw' | null>(null);

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !loading;

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      await login(identifier.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Login failed. Check your details and try again.');
    }
    setLoading(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* Deep ink field with a brand bloom — reads far richer than a flat gradient */}
      <LinearGradient colors={[colors.ink[900], colors.ink[950]]} style={StyleSheet.absoluteFill as any} />
      <View style={styles.bloomPink} pointerEvents="none" />
      <View style={styles.bloomOrange} pointerEvents="none" />

      <SafeAreaView style={{ flex: 1 }}>
        {/* 'padding' only resizes the view on iOS; leaving Android's behavior
            undefined meant the keyboard just covered the focused field
            instead of the screen making room for it — 'height' is the
            working equivalent on Android. */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : StatusBar.currentHeight ?? 0}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Brand */}
            <View style={styles.brand}>
              <LinearGradient
                colors={colors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logo}
              >
                <Icon name="car" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>Car Wash</Text>
              <Text style={styles.subtitle}>Loyalty & operations</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Welcome back</Text>
              <Text style={styles.cardSub}>Sign in to continue</Text>

              {/* Username */}
              <View style={styles.field}>
                <Text style={styles.label}>USERNAME</Text>
                <View style={[styles.inputWrap, focus === 'id' && styles.inputWrapFocus, !!error && styles.inputWrapError]}>
                  <Icon name="user" size={13} color={focus === 'id' ? colors.primary : colors.textMuted} />
                  <TextInput
                    value={identifier}
                    onChangeText={(t) => { setIdentifier(t); if (error) setError(''); }}
                    onFocus={() => setFocus('id')}
                    onBlur={() => setFocus(null)}
                    placeholder="e.g. grace"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.input}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>PASSWORD</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} hitSlop={10}>
                    <Text style={styles.forgot}>Forgot?</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputWrap, focus === 'pw' && styles.inputWrapFocus, !!error && styles.inputWrapError]}>
                  <Icon name="lock" size={13} color={focus === 'pw' ? colors.primary : colors.textMuted} />
                  <TextInput
                    value={password}
                    onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
                    onFocus={() => setFocus('pw')}
                    onBlur={() => setFocus(null)}
                    placeholder="••••••••"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    style={styles.input}
                    returnKeyType="go"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity onPress={() => setShowPassword((s) => !s)} hitSlop={10}>
                    <Icon name={showPassword ? 'eye-slash' : 'eye'} size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Icon name="exclamation-circle" size={12} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <GradientButton
                title="Sign in"
                onPress={handleLogin}
                disabled={!canSubmit}
                loading={loading}
                size="lg"
                full
                iconRight="arrow-right"
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>NEW CUSTOMER</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('Register')}
                style={styles.registerBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.registerText}>Create an account</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.footnote}>
              Your role and access are determined automatically after sign-in.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink[950] },
  bloomPink: {
    position: 'absolute', top: -120, right: -90,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(233,30,99,0.28)',
  },
  bloomOrange: {
    position: 'absolute', bottom: -140, left: -100,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(255,107,53,0.16)',
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },

  brand: { alignItems: 'center', marginBottom: spacing.xl },
  logo: {
    width: 62, height: 62, borderRadius: radii.xl,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadow.brand,
  },
  title: { fontSize: font.hero, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  subtitle: { fontSize: font.sm, color: 'rgba(255,255,255,0.6)', marginTop: 3, letterSpacing: tracking.caps },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    ...shadow.lg,
  },
  cardTitle: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  cardSub: { fontSize: font.sm, color: colors.textMuted, marginTop: 3, marginBottom: spacing.xl },

  field: { marginBottom: spacing.lg, gap: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textSecondary, letterSpacing: tracking.capsWide },
  forgot: { fontSize: font.xs, fontWeight: weight.bold, color: colors.primary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgSunken,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapFocus: { borderColor: colors.primary, backgroundColor: colors.bgCard },
  inputWrapError: { borderColor: colors.error },
  input: { flex: 1, paddingVertical: 14, fontSize: font.regular, color: colors.text, fontWeight: weight.medium, ...noFocusRing },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: colors.errorSoft, borderRadius: radii.sm,
    paddingVertical: 10, paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: { flex: 1, fontSize: font.sm, color: colors.error, fontWeight: weight.semibold },

  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.xl },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  dividerText: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },

  registerBtn: {
    paddingVertical: 13,
    borderRadius: radii.md,
    alignItems: 'center',
    backgroundColor: colors.bgSunken,
  },
  registerText: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },

  footnote: {
    fontSize: font.xs,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 17,
  },
});
