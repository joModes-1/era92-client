import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  Platform, KeyboardAvoidingView, ScrollView, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, font, spacing, weight, tracking, noFocusRing, shadow } from '../../theme';
import Icon from '../../components/Icon';
import GradientButton from '../../components/GradientButton';
import { AlertHost } from '../../components/AppAlert';

/**
 * Taking payment: confirm the amount, choose how it was paid, done.
 *
 * Two steps because they answer different questions. The first is "are we
 * charging the right amount", which the worker checks against the car in
 * front of them. The second is "where did the money go", which decides
 * whether this cash is in the drawer at close of shift.
 *
 * Nothing here talks to MTN or Airtel yet. The worker confirms the money
 * arrived and the method is recorded against the wash — so reports can
 * separate cash from mobile money, and a shift's expected cash only counts
 * what the worker is physically holding.
 */

export type PaymentMethod = 'mtn' | 'airtel' | 'cash';

/**
 * Mobile money is built but switched off.
 *
 * The screens, the phone field and the backend columns all handle MTN and
 * Airtel already — what is missing is the actual collection API, so nothing
 * would really be charged. Showing the options anyway would let a worker
 * mark a wash paid when no money moved, which is worse than not offering
 * them. Flip this to true once the collection integration is live.
 */
const SHOW_MOBILE_MONEY = false;

type Step = 'amount' | 'method';

export default function PaymentSheet({
  visible,
  onClose,
  onConfirm,
  amountUgx,
  jobLabel,
  submitting,
  defaultPhone,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (payment: { method: PaymentMethod; phone?: string }) => void;
  amountUgx: number;
  jobLabel?: string;
  submitting?: boolean;
  defaultPhone?: string;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('amount');
  // Starts on whatever is actually offered, so the selection is never a
  // hidden option.
  const [method, setMethod] = useState<PaymentMethod>(SHOW_MOBILE_MONEY ? 'mtn' : 'cash');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStep('amount');
    setMethod(SHOW_MOBILE_MONEY ? 'mtn' : 'cash');
    setPhone(defaultPhone ? defaultPhone.replace(/^\+256/, '') : '');
  }, [visible, defaultPhone]);

  const ugx = (n: any) => Number(n || 0).toLocaleString();
  const needsPhone = method === 'mtn' || method === 'airtel';
  const canPay = !needsPhone || phone.replace(/\D/g, '').length >= 9;

  const confirm = () => {
    if (!canPay) return;
    onConfirm({
      method,
      phone: needsPhone ? `+256${phone.replace(/\D/g, '')}` : undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={s.overlay}>
          <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

          <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <TouchableOpacity onPress={onClose} style={s.close} hitSlop={10} activeOpacity={0.6}>
              <Text style={s.closeText}>Close</Text>
            </TouchableOpacity>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.scroll}
            >
              {step === 'amount' && (
                <>
                  <Image
                    source={require('../../../assets/shield.jpg')}
                    style={s.shield}
                    resizeMode="contain"
                  />

                  <Text style={s.payTitle}>Pay UGX {ugx(amountUgx)}</Text>
                  <Text style={s.paySub}>
                    Select payment method to proceed{'\n'}with payment of your service
                  </Text>

                  <GradientButton
                    title="Make a payment"
                    onPress={() => setStep('method')}
                    size="lg"
                    full
                    style={{ marginTop: spacing.xl }}
                  />
                </>
              )}

              {step === 'method' && (
                <>
                  <Text style={s.methodTitle}>
                    {SHOW_MOBILE_MONEY ? 'Choose Payment Method' : 'Confirm Payment'}
                  </Text>

                  {/* Mobile money is hidden until the MTN and Airtel
                      collection APIs are actually wired up. Offering a
                      method that cannot take money would let a worker mark
                      a wash paid when nothing arrived — the backend already
                      accepts and records 'mtn' and 'airtel', so restoring
                      these is a matter of setting SHOW_MOBILE_MONEY true. */}
                  {SHOW_MOBILE_MONEY && (
                    <View style={s.methodRow}>
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
                    <View style={s.phoneRow}>
                      <Text style={s.flag}>🇺🇬</Text>
                      <Text style={s.dial}>+256</Text>
                      <TextInput
                        value={phone}
                        onChangeText={(t) => setPhone(t.replace(/[^\d]/g, '').slice(0, 12))}
                        placeholder="782235801"
                        placeholderTextColor={colors.textMuted}
                        keyboardType="phone-pad"
                        style={s.phoneInput}
                      />
                      <Icon name="address-book" size={14} color={colors.primary} />
                    </View>
                  )}

                  {method === 'cash' && (
                    <View style={s.cashNote}>
                      <Icon name="info-circle" size={11} color={colors.info} />
                      <Text style={s.cashNoteText}>
                        This counts toward the cash you hand in at the end of your shift.
                      </Text>
                    </View>
                  )}

                  <GradientButton
                    title={`Pay UGX ${ugx(amountUgx)}`}
                    onPress={confirm}
                    disabled={!canPay}
                    loading={submitting}
                    size="lg"
                    full
                    style={{ marginTop: spacing.xl }}
                  />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* An Android Modal is its own native window, so an alert raised from
          here needs a host inside it or it is trapped behind. */}
      <AlertHost />
    </Modal>
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
      style={[s.method, full && { width: '100%' }, selected && s.methodOn]}
    >
      <View style={[s.radio, selected && s.radioOn]}>
        {selected ? <View style={s.radioDot} /> : null}
      </View>
      <View style={[s.swatch, { backgroundColor: swatch }]}>
        <Text style={[s.swatchGlyph, { color: glyphColor }]}>{glyph}</Text>
      </View>
      <Text style={s.methodLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,14,28,0.6)',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    maxHeight: '88%',
    ...shadow.lg,
  },
  close: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 4 },
  closeText: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.primary },
  scroll: { alignItems: 'center', paddingBottom: spacing.lg },

  // ── Amount step ──
  // The exported render (assets/shield.jpg) already carries its own
  // dimension and lighting — no background, radius or shadow to add on
  // top of it the way the old flat-icon-on-a-gradient-box version needed.
  shield: {
    width: 76,
    height: 76,
    marginTop: spacing.sm,
  },
  payTitle: {
    fontSize: font.xxl,
    fontWeight: weight.black,
    color: colors.primary,
    letterSpacing: tracking.display,
    marginTop: spacing.lg,
  },
  paySub: {
    fontSize: font.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.sm,
  },

  // ── Method step ──
  methodTitle: {
    fontSize: font.lg,
    fontWeight: weight.black,
    color: colors.text,
    letterSpacing: tracking.tight,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
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

  cashNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    width: '100%',
    backgroundColor: colors.infoSoft,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  cashNoteText: { flex: 1, fontSize: font.xs, color: colors.info, lineHeight: 17, fontWeight: weight.medium },

});
