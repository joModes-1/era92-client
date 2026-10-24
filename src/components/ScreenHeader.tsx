import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, DrawerActions } from '@react-navigation/native';
import { colors, radii, font, spacing, weight, tracking, staffType } from '../theme';
import Icon from './Icon';
import { useIsStaff } from './ui/useIsStaff';

// Minimum breathing room below the status bar. The real inset comes from
// useSafeAreaInsets() — this is only the floor for devices that report 0.
const MIN_TOP = Platform.select({ ios: 8, android: 8, default: 12 }) as number;

// The rebranded client palette: white chrome, deep-navy type, violet kept for
// accents. Staff screens used to open on a full violet→navy gradient band —
// measured at 45–91% saturated brand colour across the top of every page,
// against ~5% on the rebranded client home. Same structure now, client look.
const NAVY = colors.text;
const VIOLET = colors.primary;
const VIOLET_TINT = colors.primarySoft;

/**
 * ScreenHeader — the header of every screen that is not a role's Home.
 *
 * The app's header rule: a role's Home carries the brand (logo, the
 * context line, the role's one key item — AppTopBar / HomeTopBar); every
 * other screen carries its own title instead, because what a person needs
 * there is "where am I" and "how do I get back", which a logo answers
 * neither of. So, left to right: a back arrow, the page title (and a
 * subtitle), an optional action, and the menu — where the Home screens put
 * it too.
 *
 * The back arrow on a menu (drawer) page returns to that role's Home, the
 * drawer's first page — the same place Android's own back button goes. A
 * pushed screen (`back`) steps back one screen instead, and has no menu.
 * An optional stat rail sits underneath.
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
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  // Staff screens use the researched staff type scale (STAFF-UI-SPEC.md);
  // the client app keeps its mockup styles.
  const staff = useIsStaff();

  // The role's Home is the first page of its drawer. Read off the live
  // navigator so every role's menu decides it, not a list kept here.
  const state = navigation.getState?.();
  const homeRoute: string | undefined = state?.type === 'drawer' ? state.routes?.[0]?.name : undefined;
  const toHome = !back && !!homeRoute && route.name !== homeRoute;

  return (
    <View style={[styles.header, compact && styles.headerCompact, { paddingTop: insets.top + MIN_TOP }]}>
      <View style={styles.row}>
        {back || toHome ? (
          <TouchableOpacity
            onPress={() => (back ? navigation.goBack() : navigation.navigate(homeRoute))}
            style={styles.backBtn}
            hitSlop={10}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={back ? 'Go back' : 'Back to Home'}
          >
            <Icon name="chevron-left" size={17} color={NAVY} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.titleWrap}>
          <Text style={staff ? styles.titleStaff : styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={staff ? styles.subtitleStaff : styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
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
  const staff = useIsStaff();
  return (
    <View style={[styles.stat, staff && styles.statStaff]}>
      {icon ? (
        <View style={[styles.statIcon, staff && styles.statIconStaff]}>
          <Icon name={icon} size={staff ? 14 : 11} color={VIOLET} />
        </View>
      ) : null}
      {/* flex + auto-shrink: long values like "UGX 617,000" must not spill
          out of the chip or clip the label underneath. */}
      <View style={styles.statText}>
        <Text style={[styles.statValue, staff && styles.statValueStaff]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {value}
        </Text>
        <Text style={[styles.statLabel, staff && styles.statLabelStaff]} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

/** Round tinted button for the header's action slot (e.g. "+"). */
export function HeaderAction({ icon, onPress, label }: { icon: string; onPress: () => void; label?: string }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.circleBtn}
      hitSlop={8}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label || (icon === 'plus' ? 'Add' : icon)}
    >
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
  titleStaff: { ...staffType.title },
  subtitleStaff: { ...staffType.meta },
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
  // A neutral fill: the header is chrome, and a row of violet-tinted chips
  // under every report title spent the brand colour on furniture.
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  statIcon: {
    width: 26, height: 26, borderRadius: radii.sm,
    backgroundColor: VIOLET_TINT,
    alignItems: 'center', justifyContent: 'center',
  },
  statText: { flex: 1, minWidth: 0 },
  statValue: { fontSize: font.regular, fontWeight: weight.heavy, color: NAVY, letterSpacing: tracking.tight },
  statLabel: { fontSize: font.xs, fontWeight: weight.medium, color: colors.textMuted },
  // Staff: a soft violet wash instead of grey, the icon on white.
  statStaff: { backgroundColor: VIOLET_TINT },
  statIconStaff: { backgroundColor: '#fff' },
  statValueStaff: { fontSize: 16, lineHeight: 22, fontWeight: weight.bold, letterSpacing: 0, ...staffType.tabular },
  statLabelStaff: { ...staffType.caption },
});
