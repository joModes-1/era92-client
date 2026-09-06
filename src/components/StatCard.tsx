import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radii, font, spacing, weight, tracking } from '../theme';
import Icon from './Icon';

type Props = {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
  style?: ViewStyle;
};

/**
 * StatCard — kept for compatibility, but restyled: tinted fill, no hard
 * border, left-aligned type. New code should prefer MetricStrip / StatTile
 * from components/ui.
 */
export default function StatCard({ label, value, color = colors.primary, icon, style }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: color + '0F' }, style]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: color + '1F' }]}>
          <Icon name={icon} size={11} color={color} />
        </View>
      ) : null}
      <Text
        style={[styles.value, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    flex: 1,
    minWidth: 88,
    gap: 5,
  },
  iconWrap: {
    width: 22, height: 22, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  value: { fontSize: font.xl, fontWeight: weight.heavy, letterSpacing: tracking.tight },
  label: { fontSize: font.xs, color: colors.textSecondary, fontWeight: weight.medium },
});
