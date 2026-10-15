import React from 'react';
import GradientButton, { GradientButtonProps } from '../GradientButton';
import { colors } from '../../theme';

/**
 * component-button-2 — violet on the left sweeping to navy on the right
 * (`linear-gradient(99.29deg, #AC00FF 3.92%, #283B8F 77.06%)`).
 * Used for "Enter car details" (scan screen) and "Book Service".
 */
export default function ComponentButton2(props: Omit<GradientButtonProps, 'size' | 'variant'>) {
  return (
    <GradientButton
      full
      {...props}
      size="action"
      gradientColors={colors.gradientButton2}
      gradientLocations={colors.gradientButton2Locations}
      gradientAngle={colors.gradientButton2Angle}
    />
  );
}
