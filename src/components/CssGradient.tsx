import React, { useState } from 'react';
import { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cssGradientPoints } from '../utils/cssGradient';

/**
 * A LinearGradient driven by a CSS angle instead of raw start/end points.
 *
 * Raw points don't mean the same thing on web and native: web derives an
 * angle from them after scaling by the box size and spreads the stops over
 * the full CSS gradient line, while Android/iOS spread the stops over the
 * start→end segment. The same points therefore paint differently on a phone.
 * Measuring the box and converting the CSS angle (utils/cssGradient.ts)
 * gives identical results on both.
 */
export default function CssGradient({
  colors, locations, angle, style, children,
}: {
  colors: readonly string[];
  locations?: readonly number[];
  angle: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) {
  const [box, setBox] = useState({ w: 343, h: 46 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== box.w || height !== box.h) setBox({ w: width, h: height });
  };
  const { start, end } = cssGradientPoints(angle, box.w, box.h);
  return (
    <LinearGradient
      colors={colors as any}
      locations={locations as any}
      start={start}
      end={end}
      onLayout={onLayout}
      style={style}
    >
      {children}
    </LinearGradient>
  );
}
