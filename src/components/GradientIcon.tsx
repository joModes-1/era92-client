import React from 'react';
import { Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import Icon from './Icon';

/**
 * An Icon glyph painted with a gradient instead of a flat colour.
 *
 * Same split as GradientText, for the same reason: `@react-native-masked-
 * view`'s web build is a no-op that drops the gradient entirely, so web
 * paints the gradient as the icon's own CSS background with a bare glyph
 * as an SVG-less text mask via `background-clip: text` is not applicable
 * to an icon font glyph the way it is to real text — but FontAwesome glyphs
 * render through Text under the hood, so the same `backgroundClip: 'text'`
 * trick still applies directly to the rendered icon element on web; native
 * keeps using MaskedView, where it does work.
 */
export default function GradientIcon({
  name, size = 18, colorsArr, start, end, solid = true,
}: {
  name: string;
  size?: number;
  colorsArr: readonly string[];
  start: { x: number; y: number };
  end: { x: number; y: number };
  solid?: boolean;
}) {
  if (Platform.OS === 'web') {
    const angleDeg = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI + 90;
    const stops = colorsArr.join(', ');
    return (
      <Icon
        name={name}
        size={size}
        solid={solid}
        color="transparent"
        style={{
          backgroundImage: `linear-gradient(${angleDeg}deg, ${stops})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          WebkitTextFillColor: 'transparent',
        }}
      />
    );
  }

  return (
    <MaskedView maskElement={<Icon name={name} size={size} solid={solid} color="#000" />}>
      <LinearGradient colors={colorsArr as any} start={start} end={end}>
        <Icon name={name} size={size} solid={solid} color="transparent" />
      </LinearGradient>
    </MaskedView>
  );
}
