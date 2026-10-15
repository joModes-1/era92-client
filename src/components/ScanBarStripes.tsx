import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * The five diagonal stripes from the Figma export
 * (`assets/Frame 2085661658.svg`). That frame is a 180x46 crop of the
 * 327px-wide scan button starting 73.5px in, so in the real design the
 * stripes span ~22.5%–77.5% of the bar, at native size, behind the label.
 * Rendered at that native size — never squashed or cropped.
 */
export const STRIPES_W = 180;
export const STRIPES_H = 46;

export default function ScanBarStripes() {
  return (
    <Svg width={STRIPES_W} height={STRIPES_H} viewBox={`0 0 ${STRIPES_W} ${STRIPES_H}`}>
      <Path d="M18.3245 1H36L18.3245 45H0L18.3245 1Z" fill="#FF721D" fillOpacity={0.5} />
      <Path d="M54.3245 1H72L54.3245 45H36L54.3245 1Z" fill="#FF721D" fillOpacity={0.5} />
      <Path d="M90.3245 1H108L90.3245 45H72L90.3245 1Z" fill="#FF721D" fillOpacity={0.5} />
      <Path d="M126.325 1H144L126.325 45H108L126.325 1Z" fill="#FF721D" fillOpacity={0.5} />
      <Path d="M162.325 0H180L162.325 46H144L162.325 0Z" fill="#FF721D" fillOpacity={0.5} />
    </Svg>
  );
}
