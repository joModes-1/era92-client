import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../theme';

/**
 * The side-menu button every role's header uses: three plain dark lines,
 * right-aligned, no background — the one from the client Home design.
 */
export default function MenuButton({ onPress, style }: { onPress: () => void; style?: ViewStyle }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={10}
      style={[s.btn, style]}
      activeOpacity={0.6}
      accessibilityRole="button"
      accessibilityLabel="Open menu"
    >
      <View style={s.line} />
      <View style={s.line} />
      <View style={s.line} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { width: 28, height: 28, justifyContent: 'center', gap: 4, alignItems: 'flex-end' },
  line: { width: 17, height: 2, borderRadius: 1, backgroundColor: colors.text },
});
