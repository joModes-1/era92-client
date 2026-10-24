import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, font, spacing, radii, weight, tracking, Tone, tone as toneMap, staffType, staffText, avatarHue } from '../../theme';
import Icon from '../Icon';
import { useIsStaff, useIsBranded } from './useIsStaff';

/**
 * ListRow — the workhorse. A leading avatar/glyph, a two-line identity block,
 * and a right-aligned value. Rows share one card with hairline separators
 * instead of each becoming its own floating box.
 */
export default function ListRow({
  title, subtitle, meta, value, valueSub, valueTone, leading, leadingTone = 'neutral',
  trailing, onPress, accent, last, style, dense,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  value?: string | number;
  valueSub?: string;
  valueTone?: Tone;
  leading?: string | ReactNode;
  leadingTone?: Tone;
  trailing?: ReactNode;
  onPress?: () => void;
  accent?: string;      // left status bar color
  last?: boolean;
  dense?: boolean;
  style?: ViewStyle;
}) {
  const lc = toneMap[leadingTone];
  // Staff screens: the researched type scale and readable greys
  // (STAFF-UI-SPEC.md); client screens keep their mockup styles.
  const staff = useIsStaff();
  const orgAdmin = useIsBranded();
  const hue = orgAdmin && leadingTone === 'neutral' && typeof leading === 'string' && leading.length <= 2 ? avatarHue(title) : null;
  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, staff && styles.rowStaff, dense && styles.rowDense, !last && styles.rowBorder, style]}
    >
      {accent ? <View style={[styles.accent, { backgroundColor: accent }]} /> : null}

      {/* Two letters are a person (round, like every avatar in the app);
          anything longer is an icon name, drawn in the client home's
          rounded-square row tile so a glyph never passes for a person. */}
      {leading != null ? (
        typeof leading === 'string' ? (
          leading.length <= 2 ? (
            <View style={[styles.avatar, { backgroundColor: hue ? hue.bg : lc.bg }]}>
              <Text style={[styles.avatarText, { color: hue ? hue.fg : lc.text }]}>{leading}</Text>
            </View>
          ) : (
            <View style={[styles.avatar, styles.iconTile, { backgroundColor: lc.bg }]}>
              <Icon name={leading} size={staff ? 16 : 13} color={lc.fg} />
            </View>
          )
        ) : (
          leading
        )
      ) : null}

      <View style={styles.body}>
        <Text style={staff ? styles.titleStaff : styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={staff ? styles.subtitleStaff : styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        {meta ? <Text style={staff ? styles.metaStaff : styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>

      {value != null || valueSub || trailing ? (
        <View style={styles.right}>
          {value != null ? (
            <Text style={[staff ? styles.valueStaff : styles.value, valueTone ? { color: toneMap[valueTone].text } : null]} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {valueSub ? <Text style={staff ? styles.valueSubStaff : styles.valueSub} numberOfLines={1}>{valueSub}</Text> : null}
          {trailing}
        </View>
      ) : null}

      {onPress && !trailing ? <Icon name="chevron-right" size={staff ? 14 : 11} color={staff ? staffText.muted : colors.ink[300]} /> : null}
    </Wrapper>
  );
}

/** Initials helper for avatars. */
export function initials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingRight: 2,
  },
  rowDense: { paddingVertical: spacing.sm + 2 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  accent: { width: 3, alignSelf: 'stretch', borderRadius: radii.full, marginRight: -4 },
  avatar: {
    width: 36, height: 36, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  iconTile: { borderRadius: radii.sm },
  avatarText: { fontSize: font.sm, fontWeight: weight.heavy, letterSpacing: 0.3 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  subtitle: { fontSize: font.sm, color: colors.textSecondary },
  meta: { fontSize: font.xs, color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: 3, maxWidth: '45%' },
  value: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  valueSub: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.medium },
  rowStaff: { minHeight: 56 },
  titleStaff: { ...staffType.rowTitle, fontSize: 16 },
  subtitleStaff: { ...staffType.meta, color: staffText.secondary },
  metaStaff: { ...staffType.meta },
  valueStaff: { ...staffType.label, ...staffType.tabular, fontWeight: weight.bold },
  valueSubStaff: { ...staffType.caption, fontWeight: weight.regular },
});
