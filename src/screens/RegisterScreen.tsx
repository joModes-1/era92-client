import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Platform,
  KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { api, setTokens, setActor } from '../api';
import { useAuth } from '../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking, noFocusRing } from '../theme';
import GradientButton from '../components/GradientButton';
import Icon from '../components/Icon';

/**
 * Customer sign-in: a phone number and a code, nothing else.
 *
 * Deliberately not built on AuthShell. That shell is a white card floating
 * on a dark brand field, which suits a staff login; this flow is plain
 * white and full-bleed, so the number and the keypad are the only things
 * competing for attention.
 *
 * Signing up and signing in are the same two screens — whether the number
 * is already known is the server's problem, not something to make the
 * customer declare up front. A new number is never asked for a name either:
 * the server resolves one itself (a name-lookup-by-phone provider, once one
 * is configured — see server/src/utils/nameLookup.ts) and falls back to
 * "Customer" until they rename themselves in Profile.
 */

const CODE_LENGTH = 4;
const RESEND_SECONDS = 60;

type Step = 'phone' | 'code';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { refreshActor } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devCode, setDevCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [focused, setFocused] = useState(false);

  const codeInput = useRef<TextInput>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const onPhoneChange = (t: string) => {
    setPhone(t.replace(/[^\d]/g, '').slice(0, 12));
    if (error) setError('');
  };

  const canSend = phone.replace(/\D/g, '').length >= 9 && !loading;
  // The same guard now covers both the code step's button and verify() —
  // there is nothing left to gate on beyond having a full code, since a new
  // number's name is resolved server-side rather than asked for here.
  const canVerify = code.length === CODE_LENGTH && !loading;

  const sendCode = async () => {
    if (!canSend) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.phoneStart(phone);
      setPhoneDisplay(data.phone_display || phone);
      setDevCode(data.otp_code || '');
      setResendIn(RESEND_SECONDS);
      setStep('code');
      setTimeout(() => codeInput.current?.focus(), 350);
      if (data.sent === false) {
        setError('We could not send the code by SMS. Check the number, or try again.');
      }
    } catch (e: any) {
      setError(e.message || 'Could not send the code. Try again.');
    }
    setLoading(false);
  };

  const verify = async () => {
    if (!canVerify) return;
    setLoading(true);
    setError('');
    try {
      // No full_name sent for a new number any more — the server resolves
      // one itself (a name-lookup provider if configured, else 'Customer'),
      // so there is nothing left to ask for here.
      const data = await api.phoneVerify(phone, code);
      await setTokens(data.access_token, data.refresh_token);
      const me = await api.getMe();

      // A number that already belongs to staff or the platform logs that
      // person in as themselves — same actor shape each username/password
      // path already builds, so every screen downstream (role-based
      // drawer, branch scoping) treats it identically regardless of which
      // door they came in by.
      if (data.account_type === 'platform') {
        await setActor({ type: 'platform', role: 'sysadmin', must_change_password: false });
      } else if (data.account_type === 'staff') {
        await setActor({
          ...me, type: 'staff', role: data.role,
          org_id: me.org_id, branch_id: me.branch_id,
          must_change_password: false,
        });
      } else {
        await setActor({ ...me, type: 'client', role: 'client', must_change_password: false });
      }
      await refreshActor();
    } catch (e: any) {
      setError(e.message || 'That code did not work.');
      setCode('');
    }
    setLoading(false);
  };

  const Header = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={styles.backBtn} activeOpacity={0.6}>
        <Icon name="chevron-left" size={17} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      {/* Balances the back button so the title sits truly centred. */}
      <View style={styles.backBtn} />
    </View>
  );

  // ── Step 2: the code ──────────────────────────────────────────────
  if (step === 'code') {
    return (
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <Header title="Verify OTP" onBack={() => { setStep('phone'); setCode(''); setError(''); }} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.centerLead}>
              Enter the OTP which has been sent to your{'\n'}number ending with{' '}
              <Text style={styles.leadStrong}>
                ****{phone.slice(-4)}
              </Text>
            </Text>

            <TouchableOpacity
              activeOpacity={1}
              onPress={() => codeInput.current?.focus()}
              style={styles.codeRow}
            >
              {Array.from({ length: CODE_LENGTH }).map((_, i) => (
                <View key={i} style={styles.codeSlot}>
                  <Text style={styles.codeChar}>{code[i] ?? ''}</Text>
                  <View style={[styles.codeRule, (i === code.length || !!code[i]) && styles.codeRuleActive]} />
                </View>
              ))}
              {/* One real input behind the slots: the OS autofills an SMS
                  code into a single field, and six separate inputs break
                  that entirely. */}
              <TextInput
                ref={codeInput}
                value={code}
                onChangeText={(t) => {
                  setCode(t.replace(/[^\d]/g, '').slice(0, CODE_LENGTH));
                  if (error) setError('');
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
                maxLength={CODE_LENGTH}
                style={styles.hiddenInput}
                autoFocus
              />
            </TouchableOpacity>

            <Text style={styles.sentNote}>A code has been sent to your phone</Text>
            <TouchableOpacity
              onPress={resendIn > 0 ? undefined : sendCode}
              disabled={resendIn > 0}
              hitSlop={8}
            >
              <Text style={[styles.resend, resendIn > 0 && styles.resendWaiting]}>
                {resendIn > 0
                  ? `Resend in 00:${String(resendIn).padStart(2, '0')}`
                  : 'Resend code'}
              </Text>
            </TouchableOpacity>

            {devCode ? (
              <TouchableOpacity style={styles.devHint} onPress={() => setCode(devCode)} activeOpacity={0.7}>
                <Icon name="info-circle" size={11} color={colors.info} />
                <Text style={styles.devHintText}>Testing code: {devCode} — tap to fill</Text>
              </TouchableOpacity>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <Icon name="exclamation-circle" size={12} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.footer} onStartShouldSetResponder={() => true}>
            <GradientButton
              title="Confirm"
              onPress={verify}
              disabled={!canVerify}
              loading={loading}
              size="action"
              full
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Step 1: the number ────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <Header title="Enter number" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.phoneField, focused && styles.phoneFieldFocus]}>
            <Text style={styles.flag}>🇺🇬</Text>
            <Text style={styles.dial}>256</Text>
            <TextInput
              value={phone}
              onChangeText={onPhoneChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder=""
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              style={styles.phoneInput}
              returnKeyType="go"
              onSubmitEditing={sendCode}
              autoFocus
            />
          </View>
          <Text style={styles.fieldNote}>Enter mobile number</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Icon name="exclamation-circle" size={12} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>

        {/* The footer sits outside the ScrollView, so it does not inherit
            its `keyboardShouldPersistTaps`. Without this the first tap on
            Continue was swallowed dismissing the keyboard and the button
            only fired on the second — `onStartShouldSetResponder` claims
            the touch before the keyboard-dismiss gesture can take it. */}
        <View
          style={styles.footer}
          onStartShouldSetResponder={() => true}
        >
          <GradientButton
            title="Continue"
            onPress={sendCode}
            disabled={!canSend}
            loading={loading}
            size="action"
            full
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgCard },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    fontSize: font.lg,
    fontWeight: weight.bold,
    color: colors.text,
    letterSpacing: tracking.tight,
  },

  // 16px gutter, matching the design's frame padding. Centred vertically
  // rather than pinned under the header — the Figma frame has the field
  // sitting in the middle of the free space above the footer, not pushed
  // up against the top.
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // ── Phone step ──
  // 56px tall, 12px padding and gap, and a 1px rule on the bottom edge
  // only — not a box outline. The rule is what the focus state colours, so
  // focusing cannot change the field's height by a sub-pixel and nudge the
  // layout. Radius corrected to 8px: 16 read far rounder than the design's
  // field, which is only lightly softened, not a pill.
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgField,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  phoneFieldFocus: { borderBottomColor: colors.primary },
  flag: { fontSize: font.xl },
  dial: { fontSize: font.lg, fontWeight: weight.semibold, color: colors.textSecondary },
  phoneInput: {
    flex: 1,
    // The row is a fixed 56px and centres its children, so vertical
    // padding here would only fight that.
    height: '100%',
    fontSize: font.lg,
    fontWeight: weight.semibold,
    color: colors.text,
    letterSpacing: 0.4,
    ...noFocusRing,
  },
  fieldNote: { fontSize: font.xs, color: colors.textMuted, marginTop: spacing.sm },

  // ── Code step ──
  centerLead: {
    fontSize: font.regular,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  leadStrong: { color: colors.accent, fontWeight: weight.heavy },

  // Centred as a group, not stretched across the full width. With
  // `flex: 1` slots the six underlines spanned edge to edge and the digits
  // drifted apart from each other — the mockup has a tight, centred
  // cluster sitting under the lead text, so the slots are a fixed width
  // and the row centres them.
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignSelf: 'center',
    gap: spacing.md,
    marginTop: spacing.xxl,
    marginBottom: spacing.xl,
  },
  // An underline per digit rather than a filled box — matches the mockup
  // and keeps the screen feeling light.
  codeSlot: { width: 38, alignItems: 'center' },
  codeChar: {
    fontSize: font.xxl,
    fontWeight: weight.bold,
    color: colors.text,
    height: 32,
    textAlign: 'center',
  },
  codeRule: {
    height: 2,
    alignSelf: 'stretch',
    borderRadius: 1,
    backgroundColor: colors.border,
  },
  codeRuleActive: { backgroundColor: colors.text },
  hiddenInput: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    opacity: 0,
    ...noFocusRing,
  },

  sentNote: {
    fontSize: font.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 6,
  },
  resend: {
    fontSize: font.sm,
    fontWeight: weight.bold,
    color: colors.error,
    textAlign: 'center',
  },
  resendWaiting: { color: colors.error },

  devHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.infoSoft,
    borderRadius: radii.sm,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xl,
  },
  devHintText: { flex: 1, fontSize: font.xs, color: colors.info, fontWeight: weight.semibold },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.errorSoft,
    borderRadius: radii.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
  },
  errorText: { flex: 1, fontSize: font.sm, color: colors.error, fontWeight: weight.semibold },

  // Pinned to the bottom, above the keyboard — the mockup's primary action
  // sits there rather than inline with the fields.
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
});
