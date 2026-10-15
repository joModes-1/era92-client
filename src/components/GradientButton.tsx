import React, { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator, ViewStyle, LayoutChangeEvent } from 'react-native';
import { colors, radii, font, spacing, weight, shadow, tracking } from '../theme';
import Icon from './Icon';
import { cssGradientPoints } from '../utils/cssGradient';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'dark';
type Size = 'sm' | 'md' | 'lg' | 'action';

export type GradientButtonProps = Props;

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: string;
  iconRight?: string;
  full?: boolean;
  /** Overrides the primary variant's gradient (colors + angle) for one
   *  call site, rather than changing what every other `action`-size button
   *  renders. Only used when `variant` is the default 'primary'. */
  gradientColors?: readonly string[];
  gradientLocations?: readonly number[];
  gradientStart?: { x: number; y: number };
  gradientEnd?: { x: number; y: number };
  /** CSS gradient angle (deg); converted to points for the button's real size. */
  gradientAngle?: number;
};

const SIZES: Record<Size, { h: number; px: number; fs: number; icon: number; r?: number }> = {
  sm: { h: 38, px: 16, fs: font.sm, icon: 12 },
  md: { h: 50, px: 22, fs: font.regular, icon: 14 },
  lg: { h: 56, px: 26, fs: font.lg, icon: 16 },
  // The design's primary action: 48px tall, 20px side padding, 12px
  // radius — measured off the Figma frame (327 Fill × 48). Its own size
  // rather than a change to `lg`, which 20-odd other screens rely on.
  action: { h: 48, px: 20, fs: font.lg, icon: 16, r: radii.md },
};

function Content({ icon, iconRight, iconColor, textStyle, title, iconSize }: any) {
  return (
    <View style={styles.content}>
      {icon ? <Icon name={icon} size={iconSize} color={iconColor} /> : null}
      <Text style={textStyle} numberOfLines={1}>{title}</Text>
      {iconRight ? <Icon name={iconRight} size={iconSize} color={iconColor} /> : null}
    </View>
  );
}

export default function GradientButton({
  title, onPress, variant = 'primary', size = 'md', loading, disabled, style, icon, iconRight, full,
  gradientColors, gradientLocations, gradientStart, gradientEnd, gradientAngle,
}: Props) {
  const s = SIZES[size];
  const isOff = disabled || loading;
  const isAction = size === 'action';
  // Real rendered size, so a CSS angle can be turned into the right
  // start/end points for this box (see utils/cssGradient.ts).
  const [box, setBox] = useState({ w: 343, h: s.h });
  const onBoxLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
  };
  const angled = isAction || gradientAngle !== undefined;
  const actionPoints = cssGradientPoints(gradientAngle ?? colors.gradientButtonAngle, box.w, box.h);
  const base: ViewStyle = {
    minHeight: s.h,
    paddingHorizontal: s.px,
    // 16px by default, matching the input fields in the same flow — in the
    // design the button and the field it sits under share one corner
    // radius. A size can override it (the action button is 12px).
    borderRadius: s.r ?? radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: full ? 'stretch' : undefined,
  };
  const label = [styles.label, { fontSize: s.fs }];

  // Ghost — text only
  if (variant === 'ghost') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isOff}
        activeOpacity={0.6}
        style={[base, { paddingHorizontal: spacing.md, minHeight: s.h - 8 }, isOff && styles.off, style]}
      >
        {loading
          ? <ActivityIndicator color={colors.primary} size="small" />
          : <Content {...{ icon, iconRight, iconSize: s.icon }} iconColor={colors.primary} textStyle={[label, { color: colors.primary }]} title={title} />}
      </TouchableOpacity>
    );
  }

  // Secondary — outlined
  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isOff}
        activeOpacity={0.7}
        style={[base, styles.secondary, isOff && styles.off, style]}
      >
        {loading
          ? <ActivityIndicator color={colors.primary} size="small" />
          : <Content {...{ icon, iconRight, iconSize: s.icon }} iconColor={colors.primary} textStyle={[label, { color: colors.primary }]} title={title} />}
      </TouchableOpacity>
    );
  }

  // Solid fills
  const SOLID: Partial<Record<Variant, string>> = {
    danger: colors.error,
    success: colors.success,
    dark: colors.ink[900],
  };
  if (SOLID[variant]) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isOff}
        activeOpacity={0.85}
        style={[base, { backgroundColor: SOLID[variant] }, shadow.sm, isOff && styles.off, style]}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Content {...{ icon, iconRight, iconSize: s.icon }} iconColor="#fff" textStyle={[label, { color: '#fff' }]} title={title} />}
      </TouchableOpacity>
    );
  }

  // Primary — brand gradient with a colored glow
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isOff}
      activeOpacity={0.88}
      style={[full && { alignSelf: 'stretch' }, !isOff && shadow.brand, isOff && styles.off, style]}
    >
      {/* The `action` size carries the design's CSS gradient, converted to
          points for this button's real size; every other size keeps the
          long-standing brand gradient. A call site can still override any
          of it (gradientColors/Locations/Start/End). */}
      <LinearGradient
        colors={(gradientColors ?? (isAction ? colors.gradientButton : colors.gradient)) as any}
        locations={(gradientLocations ?? (isAction ? colors.gradientButtonLocations : undefined)) as any}
        start={gradientStart ?? (angled ? actionPoints.start : { x: 0, y: 0 })}
        end={gradientEnd ?? (angled ? actionPoints.end : { x: 1, y: 1 })}
        onLayout={onBoxLayout}
        style={base}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Content {...{ icon, iconRight, iconSize: s.icon }} iconColor="#fff" textStyle={[label, { color: '#fff' }]} title={title} />}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { fontWeight: weight.bold, textAlign: 'center', letterSpacing: 0.1 },
  secondary: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.bgCard,
  },
  off: { opacity: 0.45 },
});
