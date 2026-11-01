import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, shadow, brandTheme } from '../../theme';

type Elevation = 'none' | 'xs' | 'sm' | 'md' | 'lg';

type Props = {
  children: ReactNode;
  elevation?: Elevation;
  padded?: boolean | 'sm' | 'lg';
  radius?: keyof typeof radii;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  tone?: string;          // optional tinted background
  borderless?: boolean;
};

/**
 * The single card primitive. Depth comes from a soft layered shadow plus a
 * near-invisible hairline — never from a hard 1px grey box.
 */
export default function Surface({
  children, elevation = 'sm', padded = true, radius = 'lg', style, onPress, tone, borderless,
}: Props) {
  const pad = padded === false ? 0 : padded === 'sm' ? spacing.md : padded === 'lg' ? spacing.xl : spacing.lg;

  const base: StyleProp<ViewStyle> = [
    styles.base,
    {
      padding: pad,
      borderRadius: radii[radius],
      backgroundColor: tone || colors.bgCard,
      borderWidth: borderless ? 0 : StyleSheet.hairlineWidth,
    },
    shadow[elevation] as ViewStyle,
    !borderless ? { borderColor: brandTheme.border, borderWidth: 1, shadowColor: brandTheme.shadowColor, shadowOpacity: 0.09 } : null,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={base}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderColor: colors.borderLight,
  },
});
