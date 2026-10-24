import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radii, font, weight, shadow } from '../../theme';

/**
 * Segmented — a two-to-four way switch for the same list seen differently
 * (week / month / all time, car types / wash types). The Leaderboard and the
 * Catalogue each hand-built one, in different shapes and colours.
 */
export default function Segmented<T extends string>({
  options, value, onChange, style,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => onChange(o.value)}
            activeOpacity={0.8}
            style={[styles.seg, on && styles.segOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.text, on && styles.textOn]} numberOfLines={1}>{o.label}</Text>
            {o.count != null ? (
              <View style={[styles.count, on && styles.countOn]}>
                <Text style={[styles.countText, on && styles.countTextOn]}>{o.count}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bgSunken,
    borderRadius: radii.md,
    padding: 4,
    gap: 4,
  },
  seg: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 38,
    borderRadius: radii.sm,
  },
  segOn: { backgroundColor: colors.bgCard, ...shadow.xs },
  text: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
  textOn: { color: colors.text },
  count: {
    minWidth: 20, paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: radii.full, backgroundColor: colors.border, alignItems: 'center',
  },
  countOn: { backgroundColor: colors.primarySoft },
  countText: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.textSecondary },
  countTextOn: { color: colors.primaryText },
});
