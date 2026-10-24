import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radii, font, spacing, weight, shadow, Tone, tone as toneMap, staffType, staffText } from '../../theme';
import Icon from '../Icon';
import { useIsStaff } from './useIsStaff';

/**
 * NoticeRow — something that needs a decision ("UGX 1.3M still with
 * workers", "3 cars waiting over 30 min"), built like the client home's
 * PromptRow: a white row, a tinted icon tile, a title, a supporting line
 * and a chevron when it leads somewhere.
 *
 * These used to be whole cards flooded in the status colour with the title
 * in that colour too — amber on cream measured about 2:1. Here the colour
 * lives in the icon tile and a slim edge; the title uses the tone's darker
 * text step for warnings and errors, and plain ink for anything calmer.
 */
export default function NoticeRow({
  tone: t = 'neutral', icon, title, subtitle, onPress, trailing, style,
}: {
  tone?: Tone;
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  style?: ViewStyle;
}) {
  const c = toneMap[t];
  const urgent = t === 'error' || t === 'warning';
  const Wrap: any = onPress ? TouchableOpacity : View;
  const staff = useIsStaff();

  return (
    <Wrap
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.row, urgent && { borderLeftColor: c.fg, borderLeftWidth: 3 }, style]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      <View style={[styles.icon, { backgroundColor: c.bg }]}>
        <Icon name={icon} size={staff ? 17 : 14} color={c.fg} />
      </View>
      <View style={styles.body}>
        <Text style={[staff ? styles.titleStaff : styles.title, urgent && { color: c.text }]} numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={staff ? styles.subtitleStaff : styles.subtitle} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      {trailing}
      {onPress ? <Icon name="chevron-right" size={staff ? 14 : 11} color={staff ? staffText.muted : colors.ink[300]} /> : null}
    </Wrap>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadow.xs,
  },
  icon: {
    width: 36, height: 36, borderRadius: radii.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text },
  subtitle: { fontSize: font.sm, color: colors.textSecondary, lineHeight: 17 },
  titleStaff: { ...staffType.rowTitle, fontSize: 16, ...staffType.tabular },
  subtitleStaff: { ...staffType.meta, color: staffText.secondary },
});
