import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Platform, KeyboardAvoidingView, ScrollView,
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
 * No real payment processor exists anywhere in this codebase — no MTN or
 * Airtel collection API, no webhook. This screen can only ever record a
 * declaration for the worker to confirm at the bay (the worker's own
 * confirm button just reads whatever was declared here — see
 * WorkerHome.tsx's confirmPayment), never charge anyone.
 * SHOW_MOBILE_MONEY stays off until a real collection integration exists.
 */
type PaymentMethod = 'mtn' | 'airtel' | 'cash';
const SHOW_MOBILE_MONEY = false;

export default function PaymentMethodScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const alert = useAppAlert();
  const { wash } = route.params || {};

  const [method, setMethod] = useState<PaymentMethod>(SHOW_MOBILE_MONEY ? 'mtn' : 'cash');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ugx = (n: any) => Number(n || 0).toLocaleString();
  const needsPhone = method === 'mtn' || method === 'airtel';
  const canSubmit = !needsPhone || phone.replace(/\D/g, '').length >= 9;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
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
              This does not charge you automatically — a worker will collect payment
              at the bay and confirm it against what you select here.
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
                : "You'll still complete this payment with the attendant in person — selecting this just tells them how you plan to pay."}
            </Text>
          </View>

          <GradientButton
            title="Confirm payment method"
            onPress={submit}
            disabled={!canSubmit}
            loading={submitting}
            size="lg"
            full
            style={{ marginTop: spacing.xl }}
          />
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
