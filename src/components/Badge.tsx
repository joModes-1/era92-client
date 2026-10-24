import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, font, weight, Tone, tone as toneMap } from '../theme';
import { useIsStaff } from './ui/useIsStaff';

type Props = {
  label: string;
  color?: string;          // legacy: explicit color
  tone?: Tone;             // preferred: semantic tone
  small?: boolean;
  solid?: boolean;         // filled instead of tinted
  dot?: boolean;           // leading status dot
  style?: ViewStyle;
};

/**
 * Badge — a soft tinted pill. Sentence case and no outline: a list of
 * uppercase, bordered pills ("ACTIVE", "PAID", "OWES CASH") on every row was
 * the loudest thing on most staff screens, louder than the data. The words
 * use the tone's darker text step so they stay readable on the tint; the
 * optional dot carries the live state without leaning on colour alone.
 */
export default function Badge({ label, color, tone: t, small, solid, dot, style }: Props) {
  const tm = t && !color ? toneMap[t] : null;
  const staff = useIsStaff();
  const fg = color || (tm ? tm.fg : colors.primary);
  const textColor = solid ? '#fff' : color || (tm ? tm.text : colors.primaryText);
  const bg = solid ? fg : tm ? tm.bg : fg + '16';
  // Some callers pass a raw status ("cancelled", "in_progress"); the old
  // uppercase transform hid that, so tidy it into sentence case here.
  const words = label.replace(/_/g, ' ');
  const text = words.charAt(0).toUpperCase() + words.slice(1);

  return (
    <View style={[styles.badge, small && styles.small, { backgroundColor: bg }, style]}>
      {dot ? <View style={[styles.dot, { backgroundColor: solid ? '#fff' : fg }]} /> : null}
      <Text style={[staff ? styles.textStaff : styles.text, small && styles.textSmall, { color: textColor }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
  },
  small: { paddingHorizontal: 8, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: font.sm, fontWeight: weight.bold },
  textSmall: { fontSize: font.xs },
  // Staff: the caption role — 12/16 semibold (STAFF-UI-SPEC.md).
  textStaff: { fontSize: 12, lineHeight: 16, fontWeight: weight.semibold },
});
