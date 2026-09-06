import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';

export type RankedItem = {
  key: string;
  label: string;
  value: number;
  /** Optional second line under the label — counts, codes, whatever is true. */
  meta?: string;
  /** Renders as a muted bar and grey value, for rows with nothing to show. */
  muted?: boolean;
};

/**
 * Horizontal ranked bars — the readable answer to "which branch is biggest"
 * on a phone, where a vertical grouped chart with four legend entries is not.
 *
 * Every bar carries its own name and its own number, so identity never rests
 * on colour: one hue distinguishes the leader from the rest and nothing more.
 * A zero row still renders (a branch that took nothing is the point), as a
 * flat grey rule rather than an absent one.
 */
export default function RankedBars({
  items,
  valuePrefix = '',
  onPress,
}: {
  items: RankedItem[];
  valuePrefix?: string;
  onPress?: (item: RankedItem) => void;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <View style={styles.wrap}>
      {items.map((item, i) => {
        const pct = Math.max(0, Math.min(100, (item.value / max) * 100));
        const leader = i === 0 && item.value > 0;
        const dead = item.value <= 0 || item.muted;
        const Row: any = onPress ? TouchableOpacity : View;

        return (
          <Row
            key={item.key}
            style={styles.row}
            {...(onPress ? { onPress: () => onPress(item), activeOpacity: 0.7 } : {})}
          >
            <View style={styles.head}>
              <Text style={[styles.label, dead && styles.labelDead]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[styles.value, dead && styles.valueDead]} numberOfLines={1}>
                {valuePrefix}{item.value.toLocaleString()}
              </Text>
            </View>

            <View style={styles.track}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${dead ? 100 : Math.max(pct, 2)}%`,
                    backgroundColor: dead
                      ? colors.ink[200]
                      : leader
                      ? colors.primary
                      : colors.primaryTint,
                    height: dead ? 2 : 8,
                  },
                ]}
              />
            </View>

            {item.meta ? (
              <Text style={styles.meta} numberOfLines={1}>{item.meta}</Text>
            ) : null}
          </Row>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { gap: 5 },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  label: {
    flex: 1, fontSize: font.sm, fontWeight: weight.heavy,
    color: colors.text, letterSpacing: tracking.tight,
  },
  labelDead: { color: colors.textMuted, fontWeight: weight.bold },
  value: {
    fontSize: font.sm, fontWeight: weight.black,
    color: colors.text, letterSpacing: tracking.tight,
  },
  valueDead: { color: colors.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.bgSunken, justifyContent: 'center', overflow: 'hidden' },
  bar: { borderRadius: 4 },
  meta: { fontSize: font.micro, color: colors.textMuted },
});
