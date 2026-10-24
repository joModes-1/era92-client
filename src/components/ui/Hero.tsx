import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing, weight, staffType, staffText, orgTheme } from '../../theme';
import CssGradient from '../CssGradient';
import { useIsOrgAdmin } from './useIsStaff';

export type HeroStat = { label: string; value: string | number; alert?: boolean };

/**
 * HeroCard — the one number a staff screen is built around (today's takings,
 * a branch's week, the platform's MRR).
 *
 * It used to be the same navy→violet gradient card on every staff screen —
 * reused so often the screens blurred together. Now it is the plain figure
 * card the research points to (Toast Now, Square Dashboard, Shopify Home —
 * STAFF-UI-SPEC.md §2): a white card, a caption, the figure large in tabular
 * digits, an optional line under it and a strip of supporting figures. Only
 * staff screens use it; the client app has its own mockup cards.
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
  const org = useIsOrgAdmin();
  if (org) return <OrgHero {...{ label, value, prefix, caption, stats, badge, children, style }} />;
  return (
    // The client home's rewards-banner wash (soft violet → peach, violet
    // border): a small brand moment on the one figure a screen is about.
    <LinearGradient colors={colors.promoBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.card, style]}>
      <View style={styles.head}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        {badge}
      </View>

      <View style={styles.valueRow}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
          {value}
        </Text>
      </View>

      {caption ? (
        typeof caption === 'string' ? <Text style={styles.caption}>{caption}</Text> : caption
      ) : null}

      {stats && stats.length > 0 ? (
        <View style={styles.stats}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 ? <View style={styles.statDivider} /> : null}
              <View style={styles.stat}>
                <Text
                  style={[styles.statValue, s.alert && styles.statAlert]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {s.value}
                </Text>
                <Text style={styles.statLabel} numberOfLines={2}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      ) : null}

      {children}
    </LinearGradient>
  );
}

/**
 * The org admin's hero: violet falling into deep navy with an orange glow in
 * the corner (COLOR-PROPOSAL.html). White type on it — a dark surface is what
 * makes the one figure the screen is built around the loudest thing on it.
 */
function OrgHero({ label, value, prefix, caption, stats, badge, children, style }: {
  label: string; value: string | number; prefix?: string; caption?: ReactNode; stats?: HeroStat[];
  badge?: ReactNode; children?: ReactNode; style?: ViewStyle;
}) {
  return (
    <CssGradient colors={orgTheme.hero} locations={orgTheme.heroLocations} angle={orgTheme.heroAngle} style={[styles.card, org.card, style]}>
      <CssGradient pointerEvents="none" colors={orgTheme.glowStops} angle={45} style={org.glow} />
      <View style={styles.head}>
        <Text style={[styles.label, org.label]} numberOfLines={1}>{label}</Text>
        {badge}
      </View>
      <View style={styles.valueRow}>
        {prefix ? <Text style={[styles.prefix, org.prefix]}>{prefix}</Text> : null}
        <Text style={[styles.value, org.value]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{value}</Text>
      </View>
      {caption ? (typeof caption === 'string' ? <Text style={[styles.caption, org.caption]}>{caption}</Text> : caption) : null}
      {stats && stats.length > 0 ? (
        <View style={[styles.stats, org.stats]}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 ? <View style={[styles.statDivider, org.divider]} /> : null}
              <View style={styles.stat}>
                <Text style={[styles.statValue, org.statValue, s.alert && org.statAlert]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.value}</Text>
                <Text style={[styles.statLabel, org.statLabel]} numberOfLines={2}>{s.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      ) : null}
      {children}
    </CssGradient>
  );
}

const org = StyleSheet.create({
  card: { borderWidth: 0, shadowColor: orgTheme.shadowColor, shadowOpacity: 0.28, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  glow: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  label: { color: 'rgba(255,255,255,0.80)' },
  prefix: { color: 'rgba(255,255,255,0.72)' },
  value: { color: '#fff' },
  caption: { color: 'rgba(255,255,255,0.78)' },
  stats: { borderTopColor: 'rgba(255,255,255,0.18)' },
  divider: { backgroundColor: 'rgba(255,255,255,0.18)' },
  statValue: { color: '#fff' },
  statAlert: { color: '#FFB4C0' },
  statLabel: { color: 'rgba(255,255,255,0.78)' },
});

/**
 * Text styles for anything a caller puts inside the hero's caption — light on
 * the org admin's dark hero, the usual dark-on-wash elsewhere.
 */
export function useHeroText() {
  const orgAdmin = useIsOrgAdmin();
  return orgAdmin ? heroTextOnDark : heroText;
}
export const heroTextOnDark = StyleSheet.create({
  muted: { ...staffType.meta, color: 'rgba(255,255,255,0.78)' },
  strong: { ...staffType.meta, color: '#fff', fontWeight: weight.semibold },
  alert: { color: '#FFB4C0' },
  up: { color: '#7CF0C3' },
  down: { color: '#FFB4C0' },
});

/** Text styles for anything a caller puts inside the hero's `caption`/children. */
export const heroText = StyleSheet.create({
  muted: { ...staffType.meta, color: staffText.secondary },
  strong: { ...staffType.meta, color: colors.text, fontWeight: weight.semibold },
  alert: { color: colors.errorText },
});

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.promoBannerBorder,
    padding: spacing.lg,
    overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { ...staffType.caption, color: staffText.secondary, flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.xs },
  prefix: { fontSize: 17, fontWeight: weight.bold, color: staffText.muted },
  value: { ...staffType.hero, flexShrink: 1 },
  caption: { ...staffType.meta, color: staffText.secondary, marginTop: 2 },

  stats: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.promoBannerBorder,
  },
  stat: { flex: 1, gap: 2 },
  statDivider: {
    width: StyleSheet.hairlineWidth, height: 32,
    backgroundColor: colors.promoBannerBorder,
    marginHorizontal: spacing.md,
  },
  statValue: { ...staffType.figure, fontSize: 20, lineHeight: 26 },
  statAlert: { color: colors.errorText },
  statLabel: { ...staffType.meta },
});
