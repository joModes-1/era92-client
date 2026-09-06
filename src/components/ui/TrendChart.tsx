import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';

export type TrendPoint = { day: string; value: number; sub?: number };

const compact = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${Math.round(n)}`;
};

/** Mon / Tue …, or the day-of-month when the window is long enough to repeat. */
function tick(day: string, longWindow: boolean) {
  const d = new Date(day + 'T00:00:00');
  if (longWindow) return String(d.getDate());
  return d.toLocaleDateString(undefined, { weekday: 'narrow' });
}

function fullLabel(day: string) {
  return new Date(day + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

/**
 * Daily columns on a shared baseline — the org admin's "which way are we
 * going" chart, sized for a phone rather than shrunk down from a desktop one.
 *
 * Deliberate choices:
 *  - One hue (brand primary). A single series needs no legend, and a second
 *    hue here would imply a comparison the data does not make.
 *  - Zero days render as a visible baseline stub, not a gap — a day with no
 *    trade is information, and closing it up would fake a smooth curve.
 *  - Only the peak and the last day are labelled. A number over every column
 *    is unreadable at this width; tapping any column reveals its exact value.
 *  - The value readout sits above the plot at a fixed height, so selecting a
 *    column never reflows the layout underneath it.
 */
export default function TrendChart({
  points,
  valuePrefix = '',
  emptyLabel = 'No activity yet',
  height = 108,
}: {
  points: TrendPoint[];
  valuePrefix?: string;
  emptyLabel?: string;
  height?: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);

  const max = useMemo(
    () => Math.max(...points.map((p) => p.value), 0),
    [points]
  );
  const peakIndex = useMemo(
    () => (max <= 0 ? -1 : points.findIndex((p) => p.value === max)),
    [points, max]
  );

  const total = points.reduce((s, p) => s + p.value, 0);
  const longWindow = points.length > 10;
  const active = selected != null ? points[selected] : null;

  if (points.length === 0 || total === 0) {
    return (
      <View style={[styles.empty, { height: height + 34 }]}>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <View>
      {/* Fixed-height readout: tapping a column must not move the chart. */}
      <View style={styles.readout}>
        {active ? (
          <>
            <Text style={styles.readoutValue} numberOfLines={1}>
              {valuePrefix}{active.value.toLocaleString()}
            </Text>
            <Text style={styles.readoutDay} numberOfLines={1}>{fullLabel(active.day)}</Text>
          </>
        ) : (
          <Text style={styles.readoutHint} numberOfLines={1}>Tap a bar for that day</Text>
        )}
      </View>

      <View style={[styles.plot, { height }]}>
        {points.map((p, i) => {
          // A tiny stub for a zero day so the axis stays continuous and the
          // tap target still exists.
          const pct = max > 0 ? (p.value / max) * 100 : 0;
          const barH = p.value === 0 ? 2 : Math.max(3, (pct / 100) * (height - 18));
          const isPeak = i === peakIndex;
          const isLast = i === points.length - 1;
          const isSelected = selected === i;
          const labelled = !active && (isPeak || (isLast && !isPeak)) && p.value > 0;

          return (
            <TouchableOpacity
              key={p.day}
              style={styles.col}
              activeOpacity={0.7}
              onPress={() => setSelected(isSelected ? null : i)}
            >
              {labelled ? (
                <Text style={styles.barLabel} numberOfLines={1}>{compact(p.value)}</Text>
              ) : (
                <View style={styles.barLabelSpacer} />
              )}
              <View
                style={[
                  styles.bar,
                  {
                    height: barH,
                    backgroundColor:
                      p.value === 0
                        ? colors.ink[200]
                        : isSelected || (!active && isPeak)
                        ? colors.primary
                        : colors.primaryTint,
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.axis} />

      <View style={styles.ticks}>
        {points.map((p, i) => (
          <Text
            key={p.day}
            style={[styles.tick, selected === i && styles.tickOn]}
            numberOfLines={1}
          >
            {tick(p.day, longWindow)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: { height: 34, justifyContent: 'center', marginBottom: spacing.xs },
  readoutValue: {
    fontSize: font.lg, fontWeight: weight.black,
    color: colors.text, letterSpacing: tracking.tight,
  },
  readoutDay: { fontSize: font.micro, color: colors.textMuted, marginTop: -1 },
  readoutHint: { fontSize: font.xs, color: colors.textMuted },

  empty: {
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgSunken, borderRadius: radii.md,
  },
  emptyText: { fontSize: font.xs, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.lg },

  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  // 2px surface gap between adjacent fills comes from the row gap above;
  // the rounded top is the data-end, the baseline end stays square.
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 2 },
  barLabel: {
    fontSize: font.micro, fontWeight: weight.heavy,
    color: colors.textSecondary, marginBottom: 3,
  },
  barLabelSpacer: { height: 14 },

  axis: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginTop: 1 },

  ticks: { flexDirection: 'row', gap: 2, marginTop: 5 },
  tick: { flex: 1, fontSize: font.micro, color: colors.textMuted, textAlign: 'center' },
  tickOn: { color: colors.primary, fontWeight: weight.heavy },
});
