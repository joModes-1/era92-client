import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, font, spacing, weight, radii, typography, staffType, staffText, orgTheme } from '../../theme';
import Icon from '../Icon';
import { useIsStaff, useIsBranded } from './useIsStaff';

/**
 * SectionHeader — the heading above a group, written the way the client
 * home writes "Recent washes": sentence case, ink, a size above the rows it
 * introduces. The old tracked all-caps eyebrow with a leading glyph made
 * every staff screen read as a column of shouted labels.
 *
 * `icon` is still accepted so existing call sites keep compiling, but it is
 * no longer drawn — the heading's words carry it.
 */
export function SectionHeader({
  title, count, action, onAction, style,
}: {
  title: string;
  count?: number | string;
  action?: string;
  onAction?: () => void;
  /** @deprecated Not rendered; kept for call-site compatibility. */
  icon?: string;
  style?: ViewStyle;
}) {
  const staff = useIsStaff();
  const orgAdmin = useIsBranded();
  return (
    <View style={[styles.header, style]}>
      <Text style={staff ? styles.titleStaff : styles.title} numberOfLines={1}>{title}</Text>
      {count != null ? (
        <View style={[styles.countPill, staff && styles.countPillStaff, orgAdmin && styles.countPillOrg]}><Text style={[styles.countText, staff && styles.countTextStaff, orgAdmin && styles.countTextOrg]}>{count}</Text></View>
      ) : null}
      <View style={{ flex: 1 }} />
      {action ? (
        <TouchableOpacity onPress={onAction} hitSlop={10} disabled={!onAction} activeOpacity={0.6}>
          <Text style={[styles.action, staff && styles.actionStaff, !onAction && styles.actionStatic]}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * EmptyState — a composed "nothing here" rather than a bare grey line.
 *
 * `compact` lays it out as a single row for empties that sit inside a busy
 * page (no cars waiting, nothing owed) — the stacked version is right for a
 * screen whose whole purpose is that list, but in the middle of a dashboard
 * it took half the viewport to say "none".
 */
export function EmptyState({
  icon = 'inbox', title, message, action, compact,
}: { icon?: string; title: string; message?: string; action?: ReactNode; compact?: boolean }) {
  const staff = useIsStaff();
  if (compact) {
    return (
      <View style={styles.compact}>
        <View style={styles.compactIcon}>
          <Icon name={icon} size={14} color={colors.ink[400]} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={staff ? styles.compactTitleStaff : styles.compactTitle}>{title}</Text>
          {message ? <Text style={staff ? styles.compactMsgStaff : styles.compactMsg}>{message}</Text> : null}
        </View>
        {action}
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={18} color={colors.ink[400]} />
      </View>
      <Text style={staff ? styles.emptyTitleStaff : styles.emptyTitle}>{title}</Text>
      {message ? <Text style={staff ? styles.emptyMsgStaff : styles.emptyMsg}>{message}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

/** Thin hairline used to separate stacked content inside a Surface. */
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

/**
 * Hint — a quiet footnote that explains a rule ("mobile money washes owe
 * nothing"). One definition for what a dozen screens each drew by hand.
 */
export function Hint({ children, icon = 'info-circle', style }: { children: ReactNode; icon?: string; style?: ViewStyle }) {
  const staff = useIsStaff();
  return (
    <View style={[styles.hint, style]}>
      <Icon name={icon} size={staff ? 14 : 12} color={colors.textMuted} style={{ marginTop: 2 }} />
      <Text style={[styles.hintText, staff && styles.hintTextStaff]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  title: { ...typography.section, flexShrink: 1 },
  titleStaff: { ...staffType.section, flexShrink: 1 },
  countPill: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
  },
  countText: { fontSize: font.xs, fontWeight: weight.bold, color: colors.textSecondary },
  action: { fontSize: font.sm, fontWeight: weight.bold, color: colors.primaryText },
  actionStatic: { color: colors.textMuted, fontWeight: weight.semibold },
  countPillOrg: { backgroundColor: orgTheme.countPill },
  countTextOrg: { color: '#fff' },
  countPillStaff: { backgroundColor: colors.primarySoft },
  countTextStaff: { fontSize: 12, lineHeight: 16, fontWeight: weight.semibold, color: colors.primaryText, ...staffType.tabular },
  actionStaff: { fontSize: 14, lineHeight: 20, fontWeight: weight.semibold },

  empty: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.xs + 2, paddingHorizontal: spacing.lg },
  emptyIcon: {
    width: 44, height: 44, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text, textAlign: 'center' },
  emptyMsg: { fontSize: font.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  emptyAction: { marginTop: spacing.md, alignSelf: 'stretch' },
  emptyTitleStaff: { ...staffType.rowTitle, textAlign: 'center' },
  emptyMsgStaff: { ...staffType.secondary, textAlign: 'center', maxWidth: 320 },

  compact: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  compactIcon: {
    width: 36, height: 36, borderRadius: radii.sm,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  compactTitle: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  compactMsg: { fontSize: font.sm, color: colors.textMuted, lineHeight: 17 },
  compactTitleStaff: { ...staffType.rowTitle },
  compactMsgStaff: { ...staffType.secondary },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight, marginVertical: spacing.md },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: spacing.xs },
  hintText: { flex: 1, fontSize: font.sm, color: colors.textMuted, lineHeight: 18 },
  hintTextStaff: { fontSize: 13, lineHeight: 18, color: staffText.muted },
});
