import React from 'react';
import GradientButton, { GradientButtonProps } from '../GradientButton';

/**
 * component-button-1 — the primary action button: navy with violet in the
 * top-right corner (`linear-gradient(204.34deg, #AC00FF 5.6%, #283B8F 35.35%)`).
 * Used for "Continue with phone number", "Make a payment", "Pay", etc.
 */
export default function ComponentButton1(props: Omit<GradientButtonProps, 'size' | 'variant'>) {
  return <GradientButton full {...props} size="action" />;
}
