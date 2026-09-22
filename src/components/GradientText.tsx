import React from 'react';
import { Text, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

/**
 * Text painted with a gradient instead of a flat colour.
 *
 * `@react-native-masked-view`'s web build (js/MaskedView.web.js) is a total
 * no-op — it renders only the mask element and drops the gradient entirely,
 * which is why a naive MaskedView-only approach keeps showing flat black
 * (or whatever the mask element's own colour is) on web no matter what the
 * gradient underneath was. Real masking only works there via CSS's own
 * `background-clip: text`, which RN-Web passes through as a plain style
 * property; native has no such CSS and keeps using MaskedView, where it
 * does work.
 */
export default function GradientText({
  text, style, colorsArr, locations, start, end, numberOfLines,
}: {
  text: string;
  style: any;
  colorsArr: readonly string[];
  locations?: readonly number[];
  start: { x: number; y: number };
  end: { x: number; y: number };
  numberOfLines?: number;
}) {
  if (Platform.OS === 'web') {
    const angleDeg = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI + 90;
    const stops = locations
      ? colorsArr.map((c, i) => `${c} ${(locations[i] * 100).toFixed(1)}%`).join(', ')
      : colorsArr.join(', ');
    return (
      <Text
        numberOfLines={numberOfLines}
        style={[
          style,
          {
            backgroundImage: `linear-gradient(${angleDeg}deg, ${stops})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          } as any,
        ]}
      >
        {text}
      </Text>
    );
  }

  return (
    <MaskedView maskElement={<Text style={style} numberOfLines={numberOfLines}>{text}</Text>}>
      <LinearGradient colors={colorsArr as any} locations={locations as any} start={start} end={end}>
        <Text style={[style, { opacity: 0 }]} numberOfLines={numberOfLines}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}
