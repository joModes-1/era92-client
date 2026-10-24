import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, font, spacing, radii, tracking, weight, Tone, tone as toneMap, staffType, staffText } from '../../theme';
import Icon from '../Icon';
import { useIsStaff } from './useIsStaff';

/**
 * MetricStrip — replaces the grid of bordered stat boxes. Values sit on one
 * baseline separated by hairline dividers, so the eye reads numbers, not boxes.
 */
export function MetricStrip({ items, style }: { items: MetricItem[]; style?: ViewStyle }) {
  const staff = useIsStaff();
  return (
    <View style={[styles.strip, style]}>
      {items.map((it, i) => (
        <React.Fragment key={it.label}>
          {i > 0 && <View style={styles.divider} />}
          <View style={styles.stripCell}>
            <Text
              style={[styles.stripValue, staff && styles.stripValueStaff, it.tone ? { color: toneMap[it.tone].text } : null]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {it.value}
            </Text>
            <Text style={[styles.stripLabel, staff && styles.stripLabelStaff]} numberOfLines={1}>{it.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

export type MetricItem = {
  label: string;
  value: string | number;
  tone?: Tone;
  hint?: string;
};

/**
 * HeroMetric — one number that matters, given real typographic weight.
 * Use at most one per screen.
 */
export function HeroMetric({
  label, value, sublabel, tone: t = 'primary', icon, align = 'left',
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: Tone;
  icon?: string;
  align?: 'left' | 'center';
}) {
  const c = toneMap[t];
  const staff = useIsStaff();
  return (
    <View style={[styles.hero, align === 'center' && { alignItems: 'center' }]}>
      <View style={styles.heroLabelRow}>
        {icon ? <Icon name={icon} size={11} color={colors.textMuted} /> : null}
        <Text style={[styles.heroLabel, staff && styles.heroLabelStaff]}>{label}</Text>
      </View>
      <Text style={[styles.heroValue, staff && styles.heroValueStaff, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {value}
      </Text>
      {sublabel ? <Text style={[styles.heroSub, staff && styles.heroSubStaff]}>{sublabel}</Text> : null}
    </View>
  );
}

/**
 * DataPoint — an inline label/value pair for dense detail, no box at all.
 */
export function DataPoint({
  label, value, tone: t, emphasis,
}: { label: string; value: string | number; tone?: Tone; emphasis?: boolean }) {
  const staff = useIsStaff();
  return (
    <View style={styles.dp}>
      <Text style={[styles.dpLabel, staff && styles.dpLabelStaff]}>{label}</Text>
      <Text
        style={[
          styles.dpValue,
          staff && styles.dpValueStaff,
          emphasis && (staff ? styles.dpValueEmphasisStaff : styles.dpValueEmphasis),
          t ? { color: toneMap[t].text } : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/**
 * StatTile — used only when a metric needs its own tappable target or icon.
 * Tinted fill, no border, so a row of them reads as a palette not a table.
 */
export function StatTile({
  label, value, icon, tone: t = 'neutral', style,
}: { label: string; value: string | number; icon?: string; tone?: Tone; style?: ViewStyle }) {
  const c = toneMap[t];
  const staff = useIsStaff();
  return (
    <View style={[styles.tile, { backgroundColor: c.bg }, style]}>
      {icon ? (
        <View style={[styles.tileIcon, { backgroundColor: c.fg + '1F' }]}>
          <Icon name={icon} size={12} color={c.fg} />
        </View>
      ) : null}
      <Text style={[styles.tileValue, staff && styles.tileValueStaff, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
        {value}
      </Text>
      <Text style={[styles.tileLabel, staff && styles.tileLabelStaff]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  stripCell: {
    flex: 1,
    paddingHorizontal: spacing.xs,
    gap: 3,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  stripValue: {
    fontSize: font.xl,
    fontWeight: weight.heavy,
    color: colors.text,
    letterSpacing: tracking.tight,
  },
  stripLabel: {
    fontSize: font.xs,
    fontWeight: weight.semibold,
    color: colors.textMuted,
  },

  hero: { gap: 4 },
  heroLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroLabel: {
    fontSize: font.sm,
    fontWeight: weight.semibold,
    color: colors.textMuted,
  },
  heroValue: {
    fontSize: font.hero,
    fontWeight: weight.black,
    letterSpacing: tracking.display,
  },
  heroSub: { fontSize: font.sm, color: colors.textSecondary },

  dp: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: 5 },
  dpLabel: { fontSize: font.sm, color: colors.textSecondary },
  dpValue: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  dpValueEmphasis: { fontSize: font.lg, fontWeight: weight.heavy },

  tile: {
    flex: 1,
    minWidth: 92,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 5,
  },
  tileIcon: {
    width: 22, height: 22, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  tileValue: { fontSize: font.xl, fontWeight: weight.heavy, letterSpacing: tracking.tight },
  tileLabel: { fontSize: font.xs, color: colors.textSecondary, fontWeight: weight.medium },

  // Staff variants (STAFF-UI-SPEC.md): weights ≤700, tabular figures, readable greys.
  stripValueStaff: { fontSize: 20, lineHeight: 26, fontWeight: weight.bold, letterSpacing: 0, ...staffType.tabular },
  stripLabelStaff: { ...staffType.meta },
  heroLabelStaff: { ...staffType.caption, color: staffText.secondary },
  heroValueStaff: { ...staffType.hero, letterSpacing: 0 },
  heroSubStaff: { ...staffType.meta, color: staffText.secondary },
  dpLabelStaff: { ...staffType.secondary },
  dpValueStaff: { ...staffType.label, ...staffType.tabular },
  dpValueEmphasisStaff: { fontSize: 17, lineHeight: 22, fontWeight: weight.bold },
  tileValueStaff: { fontSize: 20, lineHeight: 26, fontWeight: weight.bold, letterSpacing: 0, ...staffType.tabular },
  tileLabelStaff: { ...staffType.meta, color: staffText.secondary },
});
