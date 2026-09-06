import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { colors, radii, font, spacing, weight, shadow, tracking } from '../theme';
import Icon from './Icon';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'dark';
type Size = 'sm' | 'md' | 'lg';

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
};

const SIZES: Record<Size, { h: number; px: number; fs: number; icon: number }> = {
  sm: { h: 38, px: 16, fs: font.sm, icon: 12 },
  md: { h: 50, px: 22, fs: font.regular, icon: 14 },
  lg: { h: 56, px: 26, fs: font.lg, icon: 16 },
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
}: Props) {
  const s = SIZES[size];
  const isOff = disabled || loading;
  const base: ViewStyle = {
    minHeight: s.h,
    paddingHorizontal: s.px,
    borderRadius: radii.md,
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
      <LinearGradient
        colors={colors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
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
