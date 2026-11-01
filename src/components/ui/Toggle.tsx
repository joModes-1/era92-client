import React from 'react';
import { Switch, SwitchProps } from 'react-native';
import { colors } from '../../theme';

/**
 * Toggle — the app's on/off switch: violet track when on, white thumb.
 *
 * A bare Switch with `thumbColor="#fff"` looked right on a phone but not in
 * the web build, where react-native-web ignores `thumbColor` for the on
 * state and paints its own teal default (`activeThumbColor`). Setting both
 * here keeps every switch on brand on every platform.
 */
export default function Toggle(props: SwitchProps) {
  const webOnly = { activeThumbColor: '#fff', activeTrackColor: colors.primary } as any;
  return (
    <Switch
      trackColor={{ false: colors.border, true: colors.primary }}
      thumbColor="#fff"
      ios_backgroundColor={colors.border}
      {...webOnly}
      {...props}
    />
  );
}
