import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, font, spacing, weight } from '../theme';
import Icon from './Icon';
import Wordmark from './Wordmark';

/**
 * The app's top chrome, shared by every role's home screen.
 *
 * Generalised out of the worker home's own bar so manager, orgadmin and
 * sysadmin get the same treatment instead of the gradient `ScreenHeader`
 * banner they used to carry — a flat white bar with the wordmark, a
 * context line, an optional right-hand slot, and the drawer button.
 *
 * The right slot is deliberately a `ReactNode` rather than a fixed shape:
 * the worker shows a points pill there, a manager shows nothing or a
 * status chip, and forcing one component on all of them is what made the
 * old header sprout `HeaderStat`/`HeaderAction` variants.
 */
export default function AppTopBar({
  context,
  right,
  onMenu,
  onContextPress,
}: {
  /** The line under the wordmark — branch name, org name, "Platform". */
  context?: string;
  right?: React.ReactNode;
  onMenu?: () => void;
  /** Makes the context line tappable, with a chevron to say so. */
  onContextPress?: () => void;
}) {
  const ContextWrap: any = onContextPress ? TouchableOpacity : View;

  return (
    <View style={s.bar}>
      <View style={{ flex: 1 }}>
        <Wordmark height={16} />
        {context ? (
          <ContextWrap
            style={s.contextRow}
            onPress={onContextPress}
            activeOpacity={0.6}
          >
            <Text style={s.context} numberOfLines={1}>{context}</Text>
            {onContextPress ? (
              <Icon name="chevron-down" size={9} color={colors.textMuted} />
            ) : null}
          </ContextWrap>
        ) : null}
      </View>

      {right}

      {onMenu ? (
        <TouchableOpacity onPress={onMenu} hitSlop={10} style={s.menuBtn} activeOpacity={0.6}>
          <View style={s.menuLine} />
          <View style={s.menuLine} />
          <View style={s.menuLine} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/**
 * The right-slot pill used where a role has one number worth carrying in
 * the chrome — a count of things needing attention, say. Flat tinted
 * rather than gradient: the worker's points pill earns its gradient by
 * being the reward, and giving every role one would spend that emphasis
 * on nothing.
 */
export function TopBarPill({
  icon, label, tone = 'neutral', onPress,
}: {
  icon?: string;
  label: string;
  tone?: 'neutral' | 'warning' | 'error' | 'success';
  onPress?: () => void;
}) {
  const TONE: Record<string, { bg: string; fg: string }> = {
    neutral: { bg: colors.bgSunken, fg: colors.textSecondary },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    error: { bg: colors.errorSoft, fg: colors.error },
    success: { bg: colors.successSoft, fg: colors.success },
  };
  const t = TONE[tone] || TONE.neutral;
  const Wrap: any = onPress ? TouchableOpacity : View;

  return (
    <Wrap style={[s.pill, { backgroundColor: t.bg }]} onPress={onPress} activeOpacity={0.8}>
      {icon ? <Icon name={icon} size={10} color={t.fg} /> : null}
      <Text style={[s.pillText, { color: t.fg }]}>{label}</Text>
    </Wrap>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.bgCard,
  },
  contextRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  context: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.medium },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  pillText: { fontSize: font.xs, fontWeight: weight.heavy },

  menuBtn: { width: 28, height: 28, justifyContent: 'center', gap: 4, alignItems: 'flex-end' },
  menuLine: { width: 17, height: 2, borderRadius: 1, backgroundColor: colors.text },
});
