import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import GradientButton from '../../components/GradientButton';

/**
 * The receipt shown after a payment goes through.
 *
 * A full page rather than a panel inside the payment sheet: this is the
 * thing a worker holds up to the customer, and often the only proof either
 * of them keeps. It has to be readable at arm's length and it has to stay
 * put until someone dismisses it.
 *
 * The reference is tappable to copy — it is the one value anyone ever needs
 * to quote back, and retyping a 15-character string off a phone screen is
 * how disputes start.
 */
export default function PaymentReceipt({
  visible,
  onClose,
  reference,
  item,
  paymentType,
  recipient,
  amountUgx,
  pointsEarned,
  paidAt,
  smsSent,
  title,
  sub,
}: {
  visible: boolean;
  onClose: () => void;
  reference: string;
  item: string;
  paymentType: string;
  recipient: string;
  amountUgx: number;
  /** Points the worker earned for this job, if the scheme is on. */
  pointsEarned?: number | null;
  paidAt?: Date;
  /** Whether a confirmation SMS actually went out. */
  smsSent?: boolean;
  /**
   * Override the headline and its sub-line. Both default to the worker's
   * "Payment Successful" copy, which is only true once money has actually
   * been collected and settle has run. The client's declared-payment-intent
   * screen reuses this same layout before any of that has happened, so it
   * must pass its own honest copy instead ("Payment method recorded" —
   * nothing has been paid yet).
   */
  title?: string;
  sub?: string;
}) {
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const ugx = (n: any) => Number(n || 0).toLocaleString();
  const when = paidAt || new Date();

  const copyRef = async () => {
    try {
      await Clipboard.setStringAsync(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be unavailable in a browser without permission. The
      // reference is on screen either way, so this is not worth an error.
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={12} activeOpacity={0.6}>
            <Icon name="times" size={15} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.tick}>
            <Icon name="check-circle" size={40} color={colors.success} />
          </View>

          <Text style={s.title}>{title || 'Payment Successful'}</Text>
          <Text style={s.sub}>
            {sub !== undefined
              ? sub
              : smsSent === false
                ? 'Your payment has been processed successfully.'
                : 'Your payment has been processed successfully.\nYou\'ll receive a confirmation SMS shortly.'}
          </Text>

          <View style={s.dashed} />

          {/* The reference gets its own row — it is the value anyone quotes
              back when something needs looking up. */}
          <TouchableOpacity style={s.refRow} onPress={copyRef} activeOpacity={0.7}>
            <Text style={s.refLabel}>Reference number</Text>
            <View style={s.refValueWrap}>
              <Text style={s.refValue} numberOfLines={1}>{reference}</Text>
              <Icon name={copied ? 'check' : 'copy'} size={12} color={copied ? colors.success : colors.textMuted} />
            </View>
          </TouchableOpacity>
          {copied ? <Text style={s.copied}>Copied</Text> : null}

          <View style={s.dashed} />

          <View style={s.rows}>
            <Row label="Item" value={item} />
            <Row label="Payment type" value={paymentType} />
            <Row label="Recipient" value={recipient} />
            <Row
              label="Date"
              value={`${when.toLocaleDateString('en-GB')} | ${when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            />
            {pointsEarned ? (
              <Row label="Points earned" value={`+${pointsEarned} Points`} tone="accent" />
            ) : null}
            <Row label="Total" value={`UGX ${ugx(amountUgx)}`} strong />
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <GradientButton title="Continue" onPress={onClose} size="lg" full />
        </View>
      </View>
    </Modal>
  );
}

function Row({
  label, value, strong, tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'accent';
}) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text
        style={[
          s.rowValue,
          strong && s.rowValueStrong,
          tone === 'accent' && { color: colors.accent },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgCard },

  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  closeBtn: {
    width: 36, height: 36, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },

  body: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },

  tick: { marginTop: spacing.xl, marginBottom: spacing.md },
  title: {
    fontSize: font.xxl,
    fontWeight: weight.black,
    color: colors.text,
    letterSpacing: tracking.display,
  },
  sub: {
    fontSize: font.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 6,
  },

  // A dashed rule reads as a torn receipt edge, which is exactly the
  // metaphor this screen is going for.
  dashed: {
    alignSelf: 'stretch',
    borderBottomWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    marginVertical: spacing.xl,
  },

  refRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  refLabel: { fontSize: font.sm, color: colors.textMuted },
  refValueWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  refValue: {
    fontSize: font.sm,
    fontWeight: weight.heavy,
    color: colors.text,
    letterSpacing: 0.3,
  },
  copied: {
    alignSelf: 'flex-end',
    fontSize: font.micro,
    color: colors.success,
    fontWeight: weight.bold,
    marginTop: 4,
  },

  rows: { alignSelf: 'stretch', gap: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowLabel: { fontSize: font.sm, color: colors.textMuted },
  rowValue: {
    flex: 1,
    fontSize: font.sm,
    fontWeight: weight.bold,
    color: colors.text,
    textAlign: 'right',
  },
  rowValueStrong: { fontSize: font.lg, fontWeight: weight.black },

  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
});
