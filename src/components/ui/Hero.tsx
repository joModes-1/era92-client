import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { radii, spacing, weight, staffType, brandTheme } from '../../theme';
import CssGradient from '../CssGradient';

export type HeroStat = { label: string; value: string | number; alert?: boolean };

/**
 * HeroCard — the one number a screen is built around (today's takings, a
 * branch's week, the platform's MRR, a worker's balance).
 *
 * The same card on every role: violet falling into deep navy with an orange
 * glow in the corner, the colours of the splash and the primary button.
 * White type on it — a dark surface is what makes the one figure the screen
 * is built around the loudest thing on it. A caption, the figure large in
 * tabular digits, an optional line under it and a strip of supporting figures.
 */
export function HeroCard({
  label, value, prefix, caption, stats, badge, children, style,
}: {
  label: string;
  value: string | number;
  /** Small unit before the figure — "UGX". */
  prefix?: string;
  /** A line under the figure: a delta, a "from 3 paying orgs". */
  caption?: ReactNode;
  stats?: HeroStat[];
  /** Top-right slot, beside the label (a status badge). */
  badge?: ReactNode;
  children?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <CssGradient colors={brandTheme.hero} locations={brandTheme.heroLocations} angle={brandTheme.heroAngle} style={[styles.card, style]}>
      <CssGradient pointerEvents="none" colors={brandTheme.glowStops} angle={45} style={styles.glow} />
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {badge}
      </View>
      <View style={styles.valueRow}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{value}</Text>
      </View>
      {caption ? (typeof caption === 'string' ? <Text style={styles.caption}>{caption}</Text> : caption) : null}
      {stats && stats.length > 0 ? (
        <View style={styles.stats}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 ? <View style={styles.statDivider} /> : null}
              <View style={styles.stat}>
                <Text style={[styles.statValue, s.alert && styles.statAlert]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.value}</Text>
                <Text style={styles.statLabel} numberOfLines={2}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      ) : null}
      {children}
    </CssGradient>
  );
}

/** Text styles for anything a caller puts inside the hero's `caption`/children. */
export const heroText = StyleSheet.create({
  muted: { ...staffType.meta, color: brandTheme.onHeroMuted },
  strong: { ...staffType.meta, color: '#fff', fontWeight: weight.semibold },
  alert: { color: brandTheme.onHeroAlert },
  up: { color: brandTheme.onHeroUp },
  down: { color: brandTheme.onHeroAlert },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: 'hidden',
    shadowColor: brandTheme.shadowColor,
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { ...staffType.caption, color: brandTheme.onHeroLabel, flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.xs },
  prefix: { fontSize: 17, fontWeight: weight.bold, color: brandTheme.onHeroMuted },
  value: { ...staffType.hero, color: '#fff', flexShrink: 1 },
  caption: { ...staffType.meta, color: brandTheme.onHeroMuted, marginTop: 2 },

  stats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: brandTheme.onHeroLine,
  },
  stat: { flex: 1, gap: 2 },
  statDivider: {
    width: StyleSheet.hairlineWidth, height: 32,
    backgroundColor: brandTheme.onHeroLine,
    marginHorizontal: spacing.md,
  },
  statValue: { ...staffType.figure, fontSize: 20, lineHeight: 26, color: '#fff' },
  statAlert: { color: brandTheme.onHeroAlert },
  statLabel: { ...staffType.meta, color: brandTheme.onHeroMuted },
});
