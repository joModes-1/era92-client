import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, noFocusRing } from '../../theme';
import ComponentButton1 from '../../components/buttons/ComponentButton1';
import Icon from '../../components/Icon';
import UgandaFlag from '../../components/UgandaFlag';
import { Sheet } from '../../components/ui';

type Method = 'mtn' | 'airtel' | 'cash';

/**
 * Two-step sheet shown right after booking: "Pay UGX X" prompt, then the
 * payment-method picker. Submitting only records the client's declared
 * method (POST /payment-intent) — no money moves; a worker confirms at the bay.
 */
export default function PaymentPromptSheet({
  visible, wash, onClose, onDone,
}: {
  visible: boolean;
  wash: any;
  onClose: () => void;
  onDone: (method: Method, receiptNo?: string) => void;
}) {
  const [step, setStep] = useState<'prompt' | 'method'>('prompt');
  const [method, setMethod] = useState<Method>('mtn');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) { setStep('prompt'); setError(''); }
  }, [visible]);

  // What is still owed after any points spent at booking.
  const amount = Number(wash?.amount_due_ugx ?? wash?.quoted_amount_ugx ?? 0).toLocaleString();
  const needsPhone = method !== 'cash';
  const canPay = !needsPhone || phone.replace(/\D/g, '').length >= 9;

  const pay = async () => {
    if (!canPay || !wash) return;
    setSubmitting(true);
    setError('');
    try {
      const res: any = await api.declarePaymentIntent(wash.id, {
        method,
        phone: needsPhone ? `+256${phone.replace(/\D/g, '').replace(/^0/, '')}` : undefined,
      });
      onDone(method, res?.receipt_no);
    } catch (e: any) {
      setError(e.message || 'Could not record your payment method. Try again.');
    }
    setSubmitting(false);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <TouchableOpacity onPress={onClose} hitSlop={12} style={s.close} activeOpacity={0.6}>
        <Text style={s.closeText}>Close</Text>
      </TouchableOpacity>

      {step === 'prompt' ? (
        <View style={s.center}>
          <Image source={require('../../../assets/shield.png')} style={s.shield} resizeMode="contain" />
          <Text style={s.amountTitle}>Pay UGX {amount}</Text>
          <Text style={s.sub}>Select payment method to proceed{'\n'}with payment of your service</Text>
          <ComponentButton1 title="Make a payment" onPress={() => setStep('method')} />
        </View>
      ) : (
        <View>
          <Text style={s.methodTitle}>Choose Payment Method</Text>

          <View style={s.row}>
            <MethodOption selected={method === 'mtn'} onPress={() => setMethod('mtn')} label="MTN" logo={<MtnLogo />} />
            <MethodOption selected={method === 'airtel'} onPress={() => setMethod('airtel')} label="Airtel" logo={<AirtelLogo />} />
          </View>
          <MethodOption
            selected={method === 'cash'}
            onPress={() => setMethod('cash')}
            label="Cash"
            logo={<Icon name="money-bill-alt" size={14} color={colors.text} />}
            wide
          />

          {needsPhone ? (
            <View style={s.phoneField}>
              <UgandaFlag width={18} height={12} />
              <Text style={s.dial}>+256</Text>
              <TextInput
                value={phone}
                onChangeText={(t) => setPhone(t.replace(/[^\d]/g, '').slice(0, 10))}
                placeholder="782235801"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                inputMode="numeric"
                style={s.phoneInput}
              />
              <Icon name="address-book" size={15} color={colors.primary} />
            </View>
          ) : null}

          {error ? <Text style={s.error}>{error}</Text> : null}

          <ComponentButton1
            title={`Pay UGX ${amount}`}
            onPress={pay}
            loading={submitting}
            disabled={!canPay}
            
            full
            style={{ marginTop: spacing.lg }}
          />
        </View>
      )}
    </Sheet>
  );
}

function MethodOption({
  selected, onPress, label, logo, wide,
}: { selected: boolean; onPress: () => void; label: string; logo: React.ReactNode; wide?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[s.option, wide ? s.optionWide : s.optionHalf, selected && s.optionOn]}
    >
      <View style={[s.radio, selected && s.radioOn]}>
        {selected ? <Icon name="check" size={8} color="#fff" /> : null}
      </View>
      <View style={s.logoBox}>{logo}</View>
      <Text style={s.optionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function MtnLogo() {
  return (
    <View style={[s.brandLogo, { backgroundColor: '#004F71' }]}>
      <View style={s.mtnOval}><Text style={s.mtnText}>MTN</Text></View>
    </View>
  );
}

function AirtelLogo() {
  return (
    <View style={[s.brandLogo, { backgroundColor: '#E40000' }]}>
      <Text style={s.airtelText}>airtel</Text>
    </View>
  );
}

const s = StyleSheet.create({
  close: { alignSelf: 'flex-end' },
  closeText: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.text },
  center: { alignItems: 'center' },
  shield: { width: 96, height: 96, marginTop: spacing.sm, marginBottom: spacing.md },
  amountTitle: { fontSize: font.lg, fontWeight: weight.bold, color: colors.primary, marginBottom: spacing.sm },
  sub: {
    fontSize: font.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.xl,
  },

  methodTitle: {
    fontSize: font.regular,
    fontWeight: weight.semibold,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  optionHalf: { flex: 1 },
  optionWide: { alignSelf: 'stretch' },
  optionOn: { borderColor: colors.primary },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  logoBox: { width: 28, alignItems: 'center' },
  optionLabel: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.text },

  brandLogo: { width: 26, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  mtnOval: { backgroundColor: '#FFCC00', borderRadius: 8, paddingHorizontal: 2, paddingVertical: 1 },
  mtnText: { fontSize: 6, fontWeight: weight.black, color: '#004F71' },
  airtelText: { fontSize: 7, fontWeight: weight.bold, color: '#fff' },

  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    height: 48,
    marginTop: spacing.sm,
  },
  dial: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.textSecondary },
  phoneInput: { flex: 1, fontSize: font.sm, color: colors.text, ...noFocusRing },
  error: { fontSize: font.xs, color: colors.error, marginTop: spacing.sm, textAlign: 'center' },
});
