import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, weight, avatarHue } from '../../theme';
import { useIsBranded } from './useIsStaff';
import { initials } from './ListRow';

type Variant = 'soft' | 'solid' | 'brand' | 'muted';

/**
 * Avatar — initials in a circle. One component for what eight screens drew
 * separately in five colour schemes.
 *
 *  soft   violet tint, violet initials — the default for a person in a list
 *  solid  violet fill, white initials — "you" in a ranking
 *  brand  the client app's star-roundel gradient — the signed-in identity
 *  muted  grey — someone suspended or idle
 */
export default function Avatar({
  name, size = 36, variant = 'soft', style,
}: { name?: string; size?: number; variant?: Variant; style?: ViewStyle }) {
  const orgAdmin = useIsBranded();
  const box = { width: size, height: size, borderRadius: radii.full };
  const text = [styles.text, { fontSize: Math.max(10, Math.round(size * 0.34)) }];

  if (variant === 'brand') {
    return (
      <LinearGradient
        colors={colors.rewardIconGradient}
        start={colors.rewardIconGradientStart}
        end={colors.rewardIconGradientEnd}
        style={[styles.base, box, style]}
      >
        <Text style={[text, { color: '#fff' }]}>{initials(name)}</Text>
      </LinearGradient>
    );
  }

  const hue = orgAdmin && variant === 'soft' ? avatarHue(name) : null;
  const fill = hue ? hue.bg : variant === 'solid' ? colors.primary : variant === 'muted' ? colors.bgSunken : colors.primarySoft;
  const ink = hue ? hue.fg : variant === 'solid' ? '#fff' : variant === 'muted' ? colors.textMuted : colors.primaryText;
  return (
    <View style={[styles.base, box, { backgroundColor: fill }, style]}>
      <Text style={[text, { color: ink }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: weight.heavy, letterSpacing: 0.3 },
});
