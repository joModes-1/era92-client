import React from 'react';
import Svg, { Path } from 'react-native-svg';

/**
 * The diagonal orange stripe pattern from the Figma export
 * (`assets/Frame 2085661658.svg` — a 180x46 frame with five evenly-spaced
 * diagonal parallelograms at 50% opacity). Reproduced as react-native-svg
 * rather than loaded as a bitmap so it stays sharp at any size.
 *
 * The `viewBox` is deliberately cropped to a ~72px-wide window (two
 * stripes' worth) rather than the full 180px source: stretching all five
 * stripes into a much narrower display box (`preserveAspectRatio="none"`
 * squashing the whole pattern) thinned each stripe out and opened visible
 * gaps between them, losing the tight, dense look the source has. Cropping
 * instead of squashing keeps each stripe's own width and spacing intact —
 * the patch just shows fewer of them.
 */

const VIEW_W = 72;
const SRC_H = 46;

export default function ScanBarStripes({
  width, height = SRC_H,
}: {
  width: number;
  height?: number;
}) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VIEW_W} ${SRC_H}`}
    >
      <Path d="M18.3245 1H36L18.3245 45H0L18.3245 1Z" fill="#FF721D" fillOpacity={0.5} />
      <Path d="M54.3245 1H72L54.3245 45H36L54.3245 1Z" fill="#FF721D" fillOpacity={0.5} />
      <Path d="M90.3245 1H108L90.3245 45H72L90.3245 1Z" fill="#FF721D" fillOpacity={0.5} />
      <Path d="M126.325 1H144L126.325 45H108L126.325 1Z" fill="#FF721D" fillOpacity={0.5} />
      <Path d="M162.325 0H180L162.325 46H144L162.325 0Z" fill="#FF721D" fillOpacity={0.5} />
    </Svg>
  );
}
