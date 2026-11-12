import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, soft, tint, jk } from '../theme';
import CarWashLogo from './CarWashLogo';
import Era92Logo from './Era92Logo';
import { branchQrValue } from '../utils/branchQr';

/**
 * The poster that goes on a branch's wall: the logo, "Scan to wash", one
 * large QR for that branch, and its name and code (the code is what a client
 * types if their camera won't scan). One per branch — a client scans it to
 * start a booking at the branch they are standing in.
 */
export default function BranchQrPoster({
  orgId, branchCode, branchName, size = 230,
}: {
  orgId: string;
  branchCode: string;
  branchName: string;
  size?: number;
}) {
  return (
    <View style={s.poster}>
      <CarWashLogo height={26} color={colors.text} />
      <Text style={s.title}>Scan to wash</Text>
      <Text style={s.sub}>Open the 92 CarWash app, tap “Scan to wash” and point your camera here.</Text>

      <View style={s.qrFrame}>
        <QRCode value={branchQrValue(orgId, branchCode)} size={size} color={colors.text} backgroundColor="#fff" ecl="M" />
      </View>

      <View style={s.branchPill}>
        <Text style={s.branchName} numberOfLines={1}>{branchName}</Text>
        <View style={s.dot} />
        <Text style={s.branchCode}>{branchCode}</Text>
      </View>
      <Text style={s.manual}>Camera not working? Enter code <Text style={s.manualCode}>{branchCode}</Text> in the app.</Text>

      <View style={s.footer}>
        <Text style={s.footerText}>Product of</Text>
        <Era92Logo height={12} color={colors.textSecondary} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  poster: {
    backgroundColor: '#fff', borderRadius: 28, paddingVertical: 26, paddingHorizontal: 22,
    alignItems: 'center', ...soft.cardShadow,
  },
  title: { fontSize: 28, lineHeight: 34, ...jk.heavy, color: colors.text, marginTop: 18 },
  sub: { fontSize: 13, lineHeight: 19, ...jk.medium, color: colors.textSecondary, textAlign: 'center', marginTop: 6, maxWidth: 280 },
  qrFrame: {
    marginTop: 20, padding: 16, borderRadius: 24, backgroundColor: '#fff',
    borderWidth: 2, borderColor: tint.primary.bg,
  },
  branchPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    backgroundColor: soft.bg, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 9, maxWidth: '100%',
  },
  branchName: { fontSize: 15, ...jk.bold, color: soft.text, flexShrink: 1 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: soft.text, opacity: 0.5 },
  branchCode: { fontSize: 15, ...jk.heavy, color: soft.text, letterSpacing: 1 },
  manual: { fontSize: 12, ...jk.medium, color: colors.textSecondary, marginTop: 10, textAlign: 'center' },
  manualCode: { ...jk.bold, color: colors.text },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 22 },
  footerText: { fontSize: 11, ...jk.medium, color: colors.textSecondary },
});
