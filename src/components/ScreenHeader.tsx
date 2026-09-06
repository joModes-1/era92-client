import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../theme';
import Icon from './Icon';

// Minimum breathing room below the status bar. The real inset comes from
// useSafeAreaInsets() — this is only the floor for devices that report 0.
const MIN_TOP = Platform.select({ ios: 12, android: 12, default: 16 }) as number;

/**
 * ScreenHeader — brand gradient with a soft radial bloom, left-aligned title
 * (titles read better left-aligned than centred at this size), and an
 * optional stat/action rail that sits over the gradient.
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
    <LinearGradient
      colors={[colors.pink[600], colors.primary, colors.accent]}
      locations={[0, 0.52, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.header, compact && styles.headerCompact, { paddingTop: insets.top + MIN_TOP }]}
    >
      {/* light bloom so the gradient doesn't read as a flat band */}
      <View pointerEvents="none" style={styles.bloom} />

      <View style={styles.row}>
        {back ? (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.menuBtn}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <Icon name="chevron-left" size={16} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
            style={styles.menuBtn}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, { width: 12 }]} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
        )}

        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        <View style={styles.actionSlot}>{action}</View>
      </View>

      {children ? <View style={styles.rail}>{children}</View> : null}
    </LinearGradient>
  );
}

/** A glass pill for putting live stats in the header rail. */
export function HeaderStat({ label, value, icon }: { label: string; value: string | number; icon?: string }) {
  return (
    <View style={styles.glass}>
      {icon ? <Icon name={icon} size={11} color="rgba(255,255,255,0.9)" /> : null}
      {/* flex + auto-shrink: long values like "UGX 617,000" must not spill
          out of the pill or clip the label underneath. */}
      <View style={styles.glassText}>
        <Text
          style={styles.glassValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
        <Text style={styles.glassLabel} numberOfLines={1}>{label.toUpperCase()}</Text>
      </View>
    </View>
  );
}

/** Circular translucent button for the header's action slot. */
export function HeaderAction({ icon, onPress }: { icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.circleBtn} hitSlop={8} activeOpacity={0.7}>
      <Icon name={icon} size={14} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    // paddingTop is applied inline from the live safe-area inset.
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: radii.xxl,
    borderBottomRightRadius: radii.xxl,
    overflow: 'hidden',
    ...shadow.md,
  },
  headerCompact: { paddingBottom: spacing.md },
  bloom: {
    position: 'absolute',
    top: -110,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuBtn: { width: 34, height: 34, justifyContent: 'center', gap: 4 },
  hamburgerLine: { width: 18, height: 2, borderRadius: 2, backgroundColor: '#fff' },
  titleWrap: { flex: 1 },
  title: {
    fontSize: font.xl,
    fontWeight: weight.heavy,
    color: '#fff',
    letterSpacing: tracking.tight,
  },
  subtitle: {
    fontSize: font.sm,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 1,
    fontWeight: weight.medium,
  },
  actionSlot: { minWidth: 34, alignItems: 'flex-end' },
  circleBtn: {
    width: 34, height: 34, borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.3)',
  },
  rail: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  glass: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    borderRadius: radii.md,
    paddingVertical: spacing.sm + 1,
    paddingHorizontal: spacing.md,
  },
  glassText: { flex: 1, minWidth: 0 },
  glassValue: { fontSize: font.regular, fontWeight: weight.heavy, color: '#fff', letterSpacing: tracking.tight },
  glassLabel: { fontSize: font.micro, fontWeight: weight.bold, color: 'rgba(255,255,255,0.75)', letterSpacing: tracking.caps },
});
