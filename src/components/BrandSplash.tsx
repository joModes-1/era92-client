import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CssGradient from './CssGradient';
import CarWashLogo from './CarWashLogo';
import Era92Logo from './Era92Logo';
import { font, weight } from '../theme';

/**
 * The branded splash from the Figma frame: violet in the top-left falling
 * to navy, the 92CarWash lockup centred, "Product of era92" at the bottom.
 *
 * Android's own splash (drawn by the OS before any JS runs) can only show a
 * solid colour and one centred icon, so this takes over the moment it is
 * dismissed. The native splash background is the same navy, so the hand-off
 * reads as one screen. `visible` going false fades it out, then `onHidden`
 * lets the parent unmount it.
 */
export default function BrandSplash({ visible, onHidden }: { visible: boolean; onHidden: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) return;
    Animated.timing(opacity, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => onHidden());
  }, [visible, opacity, onHidden]);

  // Sizes taken as fractions of the screen width, as in the frame, so the
  // layout holds on small and large phones alike.
  const logoW = Math.min(width * 0.72, 340);
  const era92W = Math.min(width * 0.2, 96);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Angle, stops and colours fitted to the Figma frame (228 colour
          samples, average error under 3/255 per channel). */}
      <CssGradient
        colors={['#9800E0', '#1B3C8E']}
        locations={[0.04, 0.46]}
        angle={145}
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
      >
        <View style={s.center}>
          <CarWashLogo height={logoW * (33 / 239)} color="#fff" />
        </View>
        <View style={[s.footer, { paddingBottom: insets.bottom + 40 }]}>
          <Text style={s.productOf}>Product of</Text>
          <Era92Logo height={era92W * (32 / 65)} color="#fff" />
        </View>
      </CssGradient>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  productOf: { color: '#fff', fontSize: font.xs, fontWeight: weight.medium },
});
