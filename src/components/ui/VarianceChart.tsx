import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../Icon';

/**
 * A diverging bar-per-shift chart: over/short against a shared zero baseline.
 *
 * Color alone fails colorblind separation for a red/green pair at this
 * saturation (checked with the dataviz skill's validator — worst adjacent
 * pair ΔE 4.5 for deuteranopia, below the safe floor). Direction icons and a
 * value label on every bar are the required secondary encoding, so nobody
 * has to infer "short vs over" from hue.
 */
export default function VarianceChart({ shifts }: { shifts: any[] }) {
  const values = shifts.map((s) => Number(s.variance_ugx || 0));
  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), 1);

  return (
    <View style={styles.wrap}>
      {shifts.map((s, i) => {
        const v = Number(s.variance_ugx || 0);
        const short = v < 0;
        const pct = Math.min(100, (Math.abs(v) / maxAbs) * 100);
        const color = v === 0 ? colors.ink[300] : short ? colors.error : colors.success;

        return (
          <View key={i} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>{s.worker_name?.split(' ')[0] || '—'}</Text>

            <View style={styles.track}>
              {/* Zero baseline */}
              <View style={styles.baseline} />
              {/* Bar grows left (short) or right (over) from the baseline */}
              <View
                style={[
                  styles.bar,
                  short ? styles.barLeft : styles.barRight,
                  { width: `${pct / 2}%`, backgroundColor: color },
                ]}
              />
            </View>

            <View style={styles.valueCol}>
              {v !== 0 && (
                <Icon name={short ? 'arrow-down' : 'arrow-up'} size={8} color={color} />
              )}
              <Text style={[styles.value, { color }]} numberOfLines={1}>
                {v === 0 ? '0' : Math.abs(v).toLocaleString()}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { width: 56, fontSize: font.xs, fontWeight: weight.semibold, color: colors.textSecondary },
  track: { flex: 1, height: 16, justifyContent: 'center' },
  baseline: {
    position: 'absolute', left: '50%', top: 0, bottom: 0,
    width: StyleSheet.hairlineWidth, backgroundColor: colors.border,
  },
  bar: { position: 'absolute', height: 10, borderRadius: 5 },
  barLeft: { right: '50%' },
  barRight: { left: '50%' },
  valueCol: { flexDirection: 'row', alignItems: 'center', gap: 3, width: 62, justifyContent: 'flex-end' },
  value: { fontSize: font.xs, fontWeight: weight.bold, letterSpacing: tracking.tight },
});
