import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, font, weight, tracking, Tone, tone as toneMap } from '../theme';

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
 * Badge — tinted pill with a subtle matching border. Optional leading dot for
 * live states so status reads at a glance without relying on color alone.
 */
export default function Badge({ label, color, tone: t, small, solid, dot, style }: Props) {
  const fg = color || (t ? toneMap[t].fg : colors.primary);
  const bg = solid ? fg : (t && !color ? toneMap[t].bg : fg + '16');
  const bd = solid ? fg : (t && !color ? toneMap[t].border : fg + '2E');
  const textColor = solid ? '#fff' : fg;

  return (
    <View
      style={[
        styles.badge,
        small && styles.small,
        { backgroundColor: bg, borderColor: bd },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: textColor }]} /> : null}
      <Text style={[styles.text, small && styles.textSmall, { color: textColor }]} numberOfLines={1}>
        {label}
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
    borderWidth: StyleSheet.hairlineWidth,
  },
  small: { paddingHorizontal: 7, paddingVertical: 2 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  text: {
    fontSize: font.xs,
    fontWeight: weight.heavy,
    textTransform: 'uppercase',
    letterSpacing: tracking.caps,
  },
  textSmall: { fontSize: font.micro },
});
