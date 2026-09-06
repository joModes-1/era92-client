import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, font, spacing, weight, tracking, radii } from '../../theme';
import Icon from '../Icon';

/**
 * SectionHeader — an all-caps tracked eyebrow with an optional count pill and
 * a right-hand action. Gives long scrolls a rhythm the old screens lacked.
 */
export function SectionHeader({
  title, count, action, onAction, style, icon,
}: {
  title: string;
  count?: number | string;
  action?: string;
  onAction?: () => void;
  icon?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.header, style]}>
      {icon ? <Icon name={icon} size={11} color={colors.textMuted} /> : null}
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {count != null ? (
        <View style={styles.countPill}><Text style={styles.countText}>{count}</Text></View>
      ) : null}
      <View style={{ flex: 1 }} />
      {action ? (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * EmptyState — replaces the bare grey "No data" line with something composed.
 */
export function EmptyState({
  icon = 'inbox', title, message, action,
}: { icon?: string; title: string; message?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={20} color={colors.ink[300]} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMsg}>{message}</Text> : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  );
}

/** Thin hairline used to separate stacked content inside a Surface. */
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  title: {
    fontSize: font.xs,
    fontWeight: weight.heavy,
    color: colors.textSecondary,
    letterSpacing: tracking.capsWide,
  },
  countPill: {
    minWidth: 19,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center',
  },
  countText: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textSecondary },
  action: { fontSize: font.sm, fontWeight: weight.bold, color: colors.primary },

  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyIcon: {
    width: 52, height: 52, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  emptyMsg: { fontSize: font.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  emptyAction: { marginTop: spacing.sm, alignSelf: 'stretch' },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight, marginVertical: spacing.md },
});
