import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, KeyboardAvoidingView, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../api';
import { useAppAlert } from '../../components/AppAlert';
import { colors, radii, font, spacing, weight, tracking, noFocusRing } from '../../theme';
import Icon from '../../components/Icon';
import GradientButton from '../../components/GradientButton';

/**
 * "Tell us how you're paying" — the client's declared payment intent.
 *
 * A primary, full-screen destination for a client tapping their own phone
 * with no money moving yet — not a bottom sheet, since nothing here is
 * happening in the middle of some other task.
 *
 * MTN and Airtel go through PesaPal: the app opens PesaPal's checkout page,
 * the customer pays there, and this screen waits for the server to confirm
 * it (the server asks PesaPal itself — nothing here is trusted). Cash is
 * still only a declaration for the worker to confirm at the bay.
 */
type PaymentMethod = 'mtn' | 'airtel' | 'cash';
const SHOW_MOBILE_MONEY = true;

export default function PaymentMethodScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const alert = useAppAlert();
  const { wash } = route.params || {};

  const [method, setMethod] = useState<PaymentMethod>(SHOW_MOBILE_MONEY ? 'mtn' : 'cash');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Set once PesaPal's page has been opened: the payment we are waiting on.
  const [awaiting, setAwaiting] = useState<{ id: string; url: string } | null>(null);
  const done = useRef(false);

  const ugx = (n: any) => Number(n || 0).toLocaleString();
  const needsPhone = method === 'mtn' || method === 'airtel';
  const canSubmit = !needsPhone || phone.replace(/\D/g, '').length >= 9;

  const finish = (paid: boolean) => {
    if (done.current) return;
    done.current = true;
    navigation.replace('PaymentSuccess', { wash, method, paid });
  };

  const checkPayment = async (id: string, quiet = false) => {
    try {
      const p: any = await api.getPayment(id);
      if (p?.status === 'succeeded') finish(true);
      else if (p?.status === 'failed' && !quiet) {
        setAwaiting(null);
        alert('Payment did not go through', 'You have not been charged for this attempt. You can try again.');
      }
    } catch { /* keep waiting; the next check will retry */ }
  };

  // While the PesaPal page is open elsewhere, ask the server every few seconds.
  useEffect(() => {
    if (!awaiting) return;
    const t = setInterval(() => checkPayment(awaiting.id, true), 3000);
    return () => clearInterval(t);
  }, [awaiting]);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (needsPhone) {
        await api.declarePaymentIntent(wash.id, { method, phone: `+256${phone.replace(/D/g, '')}` });
        const p: any = await api.startPayment(wash.id, `0${phone.replace(/D/g, '').slice(-9)}`);
        setAwaiting({ id: p.payment_id, url: p.redirect_url });
        Linking.openURL(p.redirect_url).catch(() => alert('Could not open the payment page', 'Tap "Open payment page" to try again.'));
        setSubmitting(false);
        return;
      }
      const res: any = await api.declarePaymentIntent(wash.id, {
        method,
        phone: needsPhone ? `+256${phone.replace(/\D/g, '')}` : undefined,
      });
      navigation.replace('PaymentSuccess', { wash: { ...wash, receipt_no: res?.receipt_no || wash?.receipt_no }, method });
    } catch (e: any) {
      alert('Could not record this', e.message);
    }
    setSubmitting(false);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn} activeOpacity={0.6}>
          <Icon name="chevron-left" size={17} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tell us how you're paying</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.amount}>UGX {ugx(wash?.quoted_amount_ugx)}</Text>

          {/* The honesty requirement: this must never read like a charge is
              about to fire. */}
          <View style={styles.honestyNote}>
            <Icon name="info-circle" size={12} color={colors.info} />
            <Text style={styles.honestyText}>
              {needsPhone
                ? "You'll pay securely on PesaPal. Nothing is charged until you approve it on your phone."
                : 'This does not charge you automatically — a worker will collect payment at the bay and confirm it against what you select here.'}
            </Text>
          </View>

          {SHOW_MOBILE_MONEY && (
            <View style={styles.methodRow}>
              <MethodOption
                label="MTN"
                selected={method === 'mtn'}
                onPress={() => setMethod('mtn')}
                swatch="#FFCC00"
                glyph="M"
                glyphColor={colors.ink[900]}
              />
              <MethodOption
                label="Airtel"
                selected={method === 'airtel'}
                onPress={() => setMethod('airtel')}
                swatch="#E8112D"
                glyph="A"
                glyphColor="#fff"
              />
            </View>
          )}

          <MethodOption
            label="Cash"
            selected={method === 'cash'}
            onPress={() => setMethod('cash')}
            swatch={colors.bgSunken}
            glyph="₵"
            glyphColor={colors.textSecondary}
            full
          />

          {needsPhone && (
            <View style={styles.phoneRow}>
              <Text style={styles.flag}>🇺🇬</Text>
              <Text style={styles.dial}>+256</Text>
              <TextInput
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^\d]/g, '').slice(0, 12))}
                placeholder="782235801"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={styles.phoneInput}
              />
            </View>
          )}

          <View style={styles.methodNote}>
            <Icon name="info-circle" size={11} color={colors.info} />
            <Text style={styles.methodNoteText}>
              {method === 'cash'
                ? 'Have this ready when you collect your car — the attendant will confirm it there.'
                : "We'll open PesaPal so you can pay with mobile money or card. This page confirms it the moment it arrives."}
            </Text>
          </View>

          {awaiting ? (
            <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
              <Text style={styles.methodNoteText}>Waiting for your payment… finish it on the PesaPal page, then come back here.</Text>
              <GradientButton title="I've paid — check now" onPress={() => checkPayment(awaiting.id)} size="lg" full />
              <GradientButton title="Open payment page" variant="secondary" onPress={() => Linking.openURL(awaiting.url)} size="lg" full />
            </View>
          ) : (
          <GradientButton
            title={needsPhone ? 'Pay with PesaPal' : 'Confirm payment method'}
            onPress={submit}
            disabled={!canSubmit}
            loading={submitting}
            size="lg"
            full
            style={{ marginTop: spacing.xl }}
          />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MethodOption({
  label, selected, onPress, swatch, glyph, glyphColor, full,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  swatch: string;
  glyph: string;
  glyphColor: string;
  full?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.method, full && { width: '100%' }, selected && styles.methodOn]}
    >
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={[styles.swatch, { backgroundColor: swatch }]}>
        <Text style={[styles.swatchGlyph, { color: glyphColor }]}>{glyph}</Text>
      </View>
      <Text style={styles.methodLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgCard },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.lg, fontWeight: weight.bold, color: colors.text, letterSpacing: tracking.tight, flex: 1, textAlign: 'center' },

  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, alignItems: 'center' },

  amount: {
    fontSize: font.xxl,
    fontWeight: weight.black,
    color: colors.primary,
    letterSpacing: tracking.display,
    marginTop: spacing.md,
  },

  honestyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    width: '100%',
    backgroundColor: colors.infoSoft,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  honestyText: { flex: 1, fontSize: font.xs, color: colors.info, lineHeight: 17, fontWeight: weight.medium },

  methodRow: { flexDirection: 'row', gap: spacing.sm, width: '100%' },
  method: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  methodOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: {
    width: 17, height: 17, borderRadius: 9,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  swatch: {
    width: 28, height: 24, borderRadius: radii.xs,
    alignItems: 'center', justifyContent: 'center',
  },
  swatchGlyph: { fontSize: font.sm, fontWeight: weight.black },
  methodLabel: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },

  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    backgroundColor: colors.bgSunken,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  flag: { fontSize: font.lg },
  dial: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
  phoneInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: font.regular,
    fontWeight: weight.semibold,
    color: colors.text,
    ...noFocusRing,
  },

  methodNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    width: '100%',
    backgroundColor: colors.infoSoft,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  methodNoteText: { flex: 1, fontSize: font.xs, color: colors.info, lineHeight: 17, fontWeight: weight.medium },
});
