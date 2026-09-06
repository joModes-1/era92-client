import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, font, spacing, radii, weight, tracking, Tone, tone as toneMap } from '../../theme';
import Icon from '../Icon';

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
  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, dense && styles.rowDense, !last && styles.rowBorder, style]}
    >
      {accent ? <View style={[styles.accent, { backgroundColor: accent }]} /> : null}

      {leading != null ? (
        typeof leading === 'string' ? (
          leading.length <= 2 ? (
            <View style={[styles.avatar, { backgroundColor: lc.bg }]}>
              <Text style={[styles.avatarText, { color: lc.fg }]}>{leading}</Text>
            </View>
          ) : (
            <View style={[styles.avatar, { backgroundColor: lc.bg }]}>
              <Icon name={leading} size={13} color={lc.fg} />
            </View>
          )
        ) : (
          leading
        )
      ) : null}

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>

      {value != null || valueSub || trailing ? (
        <View style={styles.right}>
          {value != null ? (
            <Text style={[styles.value, valueTone ? { color: toneMap[valueTone].fg } : null]} numberOfLines={1}>
              {value}
            </Text>
          ) : null}
          {valueSub ? <Text style={styles.valueSub} numberOfLines={1}>{valueSub}</Text> : null}
          {trailing}
        </View>
      ) : null}

      {onPress && !trailing ? <Icon name="chevron-right" size={11} color={colors.ink[300]} /> : null}
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
    width: 34, height: 34, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: font.sm, fontWeight: weight.heavy, letterSpacing: 0.3 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  subtitle: { fontSize: font.sm, color: colors.textSecondary },
  meta: { fontSize: font.xs, color: colors.textMuted },
  right: { alignItems: 'flex-end', gap: 3 },
  value: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  valueSub: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.medium },
});
