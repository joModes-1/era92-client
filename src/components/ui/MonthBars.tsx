import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, spacing, weight, orgTheme } from '../../theme';
import { useIsBranded } from './useIsStaff';

export type MonthBar = {
  key: string;
  /** Under the bar — the month. */
  label: string;
  value: number;
  /** Over the bar; defaults to the value itself. */
  top?: string;
  /** A second, quieter figure under the label (washes, UGX collected). */
  sub?: string;
};

/**
 * MonthBars — a short run of monthly columns with the latest one picked out.
 * Shared by the platform overview, billing and org-detail screens, which had
 * three copies of the same chart.
 *
 * One hue: the current month in brand primary, the rest in its tint. Every
 * column carries its own number, so nothing rests on colour.
 */
export default function MonthBars({
  items, height = 68, legend,
}: { items: MonthBar[]; height?: number; legend?: string }) {
  const orgAdmin = useIsBranded();
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <View>
      <View style={[styles.row, { minHeight: height + 46 }]}>
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          const h = Math.max(3, (it.value / max) * height);
          return (
            <View key={it.key} style={styles.col}>
              <Text style={[styles.top, isLast && styles.topOn]} numberOfLines={1}>{it.top ?? String(it.value)}</Text>
              {orgAdmin ? (
                <LinearGradient colors={isLast ? orgTheme.barOn : [orgTheme.barBase, orgTheme.barBase]} style={[styles.bar, { height: h }]} />
              ) : (
              <View
                style={[styles.bar, { height: h, backgroundColor: isLast ? colors.primary : colors.primaryTint }]}
              />
              )}
              <Text style={[styles.label, isLast && styles.labelOn]}>{it.label}</Text>
              {it.sub != null ? <Text style={styles.sub} numberOfLines={1}>{it.sub}</Text> : null}
            </View>
          );
        })}
      </View>
      {legend ? <Text style={styles.legend}>{legend}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  col: { flex: 1, alignItems: 'center', gap: 4 },
  top: { fontSize: font.xs, fontWeight: weight.bold, color: colors.textSecondary },
  topOn: { color: colors.text, fontWeight: weight.heavy },
  bar: { width: '100%', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  label: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.semibold },
  labelOn: { color: colors.primaryText, fontWeight: weight.heavy },
  sub: { fontSize: font.micro, color: colors.textMuted },
  legend: { fontSize: font.xs, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md },
});
