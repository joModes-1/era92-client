import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { colors, radii, font, spacing, weight, tracking } from '../theme';
import Icon from './Icon';

// Minimum breathing room below the status bar. The real inset comes from
// useSafeAreaInsets() — this is only the floor for devices that report 0.
const MIN_TOP = Platform.select({ ios: 8, android: 8, default: 12 }) as number;

// The rebranded client palette: white chrome, deep-navy type, violet kept for
// accents. Staff screens used to open on a full violet→navy gradient band —
// measured at 45–91% saturated brand colour across the top of every page,
// against ~5% on the rebranded client home. Same structure now, client look.
const NAVY = colors.text;
const VIOLET = '#AC00FF';
const VIOLET_TINT = '#F4ECFF';

/**
 * ScreenHeader — white top bar in the client app's style: page title and
 * subtitle on the left, the menu (or an action) on the right, exactly where
 * the client home puts its menu. An optional stat rail sits underneath on
 * light violet-tinted chips.
 */
export default function ScreenHeader({
  title, subtitle, action, children, compact, back,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;   // rail content rendered under the title
  compact?: boolean;
  /** Show a back chevron instead of the drawer toggle, for pushed screens. */
  back?: boolean;
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, compact && styles.headerCompact, { paddingTop: insets.top + MIN_TOP }]}>
      <View style={styles.row}>
        {back ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10} activeOpacity={0.7}>
            <Icon name="chevron-left" size={16} color={NAVY} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {action ? <View style={styles.actionSlot}>{action}</View> : null}

        {back ? null : (
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.menuBtn}
            hitSlop={10}
            activeOpacity={0.6}
            accessibilityLabel="Open menu"
          >
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
          </TouchableOpacity>
        )}
      </View>

      {children ? <View style={styles.rail}>{children}</View> : null}
    </View>
  );
}

/** A light violet-tinted chip for putting live stats in the header rail. */
export function HeaderStat({ label, value, icon }: { label: string; value: string | number; icon?: string }) {
  return (
    <View style={styles.stat}>
      {icon ? (
        <View style={styles.statIcon}>
          <Icon name={icon} size={11} color={VIOLET} />
        </View>
      ) : null}
      {/* flex + auto-shrink: long values like "UGX 617,000" must not spill
          out of the chip or clip the label underneath. */}
      <View style={styles.statText}>
        <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {value}
        </Text>
        <Text style={styles.statLabel} numberOfLines={1}>{label.toUpperCase()}</Text>
      </View>
    </View>
  );
}

/** Round tinted button for the header's action slot (e.g. "+"). */
export function HeaderAction({ icon, onPress }: { icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.circleBtn} hitSlop={8} activeOpacity={0.7}>
      <Icon name={icon} size={13} color={VIOLET} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    // paddingTop is applied inline from the live safe-area inset.
    backgroundColor: colors.bgCard,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerCompact: { paddingBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 30, height: 30, justifyContent: 'center' },
  titleWrap: { flex: 1 },
  title: { fontSize: font.xl, fontWeight: weight.heavy, color: NAVY, letterSpacing: tracking.tight },
  subtitle: { fontSize: font.xs, color: colors.textMuted, marginTop: 1, fontWeight: weight.medium },
  actionSlot: { alignItems: 'flex-end' },
  // Same three lines, same size and corner as the client home's menu.
  menuBtn: { width: 28, height: 28, justifyContent: 'center', gap: 4, alignItems: 'flex-end' },
  menuLine: { width: 17, height: 2, borderRadius: 1, backgroundColor: NAVY },
  circleBtn: {
    width: 32, height: 32, borderRadius: radii.full,
    backgroundColor: VIOLET_TINT,
    alignItems: 'center', justifyContent: 'center',
  },
  rail: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FAF7FF',
    borderWidth: 1,
    borderColor: VIOLET_TINT,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statIcon: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: VIOLET_TINT,
    alignItems: 'center', justifyContent: 'center',
  },
  statText: { flex: 1, minWidth: 0 },
  statValue: { fontSize: font.regular, fontWeight: weight.heavy, color: NAVY, letterSpacing: tracking.tight },
  statLabel: { fontSize: font.micro, fontWeight: weight.bold, color: colors.textMuted, letterSpacing: tracking.caps },
});
