import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, font, spacing } from '../theme';
import Icon from './Icon';

/**
 * SMTP isn't configured in this environment, so the backend returns the
 * verification/reset code directly in the API response (dev-mode only).
 * This surfaces it prominently and lets the user tap to auto-fill it,
 * standing in for the email they'd otherwise receive.
 */
export default function DevCodeBanner({ code, onUse }: { code: string; onUse: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onUse} activeOpacity={0.75}>
      <View style={styles.iconWrap}>
        <Icon name="flask" size={14} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>No email server yet — dev code</Text>
        <Text style={styles.code}>{code}</Text>
      </View>
      <View style={styles.useBtn}>
        <Text style={styles.useBtnText}>Use it</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent + '12',
    borderWidth: 1,
    borderColor: colors.accent + '35',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  code: {
    fontSize: font.lg,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 3,
  },
  useBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
  },
  useBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
});
