import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, font, spacing, weight, Tone, tone as toneMap, typography, staffType, staffText } from '../../theme';

export type StatGridItem = {
  label: string;
  value: string | number;
  /** Colours the figure — keep it for figures that mean something is off. */
  tone?: Tone;
  /** Greys the figure out, for a comparison value ("last month"). */
  muted?: boolean;
  /** Small trailing text after the figure, e.g. "/5" against a limit. */
  suffix?: string;
};

/**
 * StatGrid — a row of figures with a caption under each, inside a card.
 *
 * The platform, billing, org-detail and org-dashboard screens each defined
 * their own near-identical Stat / MixStat / SizeStat / WeekStat; this is the
 * one shared version, so a figure looks the same wherever it appears.
 */
export default function StatGrid({ items, style }: { items: StatGridItem[]; style?: ViewStyle }) {
  return (
    <View style={[styles.grid, style]}>
      {items.map((it) => (
        <View key={it.label} style={styles.cell}>
          <Text
            style={[
              styles.valueStaff,
              it.tone ? { color: toneMap[it.tone].text } : null,
              it.muted && (styles.mutedStaff),
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {it.value}
            {it.suffix ? <Text style={styles.suffix}>{it.suffix}</Text> : null}
          </Text>
          <Text style={styles.labelStaff} numberOfLines={1}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.md },
  cell: { flex: 1, gap: 2 },
  suffix: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textMuted },
  valueStaff: { fontSize: 20, lineHeight: 26, fontWeight: weight.bold, color: colors.text, ...staffType.tabular },
  mutedStaff: { color: staffText.muted },
  labelStaff: { ...staffType.meta },
});
