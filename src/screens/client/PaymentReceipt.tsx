import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import ComponentButton1 from '../../components/buttons/ComponentButton1';

/**
 * The receipt shown after a client declares how they're paying.
 *
 * A full page rather than a small panel: this is the thing the client holds
 * up at the bay, and often the only proof either side keeps. It has to be
 * readable at arm's length and it has to stay put until someone dismisses
 * it.
 *
 * The reference is tappable to copy — it is the one value anyone ever needs
 * to quote back, and retyping a job number off a phone screen is how
 * disputes start.
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
  /** Loyalty points earned for this wash, if any were. */
  pointsEarned?: number | null;
  paidAt?: Date;
  /** Whether a confirmation SMS actually went out. */
  smsSent?: boolean;
  /**
   * Override the headline and its sub-line. Both default to
   * "Payment Successful", which is only true once a worker has actually
   * collected money and settled the wash — the client's own
   * declared-payment-intent screen (PaymentSuccessScreen.tsx) always
   * overrides this with its own honest copy ("Payment method recorded" —
   * nothing has been paid yet at that point).
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
            <Icon name="check" size={16} color={colors.success} />
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
              value={`${when.toLocaleDateString('en-GB')} | ${when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}`}
            />
            {pointsEarned ? (
              <Row label="Points earned" value={`+${pointsEarned} Points`} />
            ) : null}
            <Row label="Total" value={`UGX ${ugx(amountUgx)}`} />
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <ComponentButton1 title="Continue" onPress={onClose} />
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
    width: 40, height: 40, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },

  body: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },

  // Outlined green ring with a thin check, per the Figma frame.
  tick: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 2, borderColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
    marginTop: spacing.xxl, marginBottom: spacing.md,
  },
  title: {
    fontSize: font.xl,
    fontWeight: weight.bold,
    color: colors.text,
    letterSpacing: tracking.tight,
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

  rows: { alignSelf: 'stretch', gap: spacing.md },
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
