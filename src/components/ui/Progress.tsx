import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, font, spacing, radii, weight, tracking } from '../../theme';

/** Gradient-filled progress bar with an optional caption row. */
export function ProgressBar({
  value, max = 1, label, caption, height = 8, colorsOverride,
}: {
  value: number;
  max?: number;
  label?: string;
  caption?: string;
  height?: number;
  colorsOverride?: readonly [string, string];
}) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <View style={{ gap: 7 }}>
      {label || caption ? (
        <View style={styles.capRow}>
          {label ? <Text style={styles.label}>{label}</Text> : null}
          <View style={{ flex: 1 }} />
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        </View>
      ) : null}
      <View style={[styles.track, { height, borderRadius: height }]}>
        <LinearGradient
          colors={colorsOverride || colors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height }}
        />
      </View>
    </View>
  );
}

/**
 * StampRow — loyalty punch-card. Filled stamps use the brand gradient; the
 * next one up is outlined to show where you are.
 */
export function StampRow({ filled, total, style }: { filled: number; total: number; style?: ViewStyle }) {
  return (
    <View style={[styles.stamps, style]}>
      {Array.from({ length: total }).map((_, i) => {
        const isFilled = i < filled;
        const isNext = i === filled;
        if (isFilled) {
          return (
            <LinearGradient
              key={i}
              colors={colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.stamp}
            />
          );
        }
        return <View key={i} style={[styles.stamp, styles.stampEmpty, isNext && styles.stampNext]} />;
      })}
    </View>
  );
}

/** Small horizontal bar used inside list rows to compare workers/branches. */
export function MiniBar({ value, max, color = colors.primary }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.max(0.04, Math.min(1, value / max)) : 0;
  return (
    <View style={styles.miniTrack}>
      <View style={[styles.miniFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  capRow: { flexDirection: 'row', alignItems: 'baseline' },
  label: { fontSize: font.xs, fontWeight: weight.heavy, color: colors.textSecondary, letterSpacing: tracking.caps },
  caption: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.semibold },
  track: { backgroundColor: colors.bgSunken, overflow: 'hidden', width: '100%' },

  stamps: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  stamp: { width: 26, height: 26, borderRadius: radii.full },
  stampEmpty: { backgroundColor: colors.bgSunken, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  stampNext: { borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', backgroundColor: colors.primarySoft },

  miniTrack: { height: 4, borderRadius: 4, backgroundColor: colors.bgSunken, overflow: 'hidden', width: '100%' },
  miniFill: { height: '100%', borderRadius: 4 },
});
