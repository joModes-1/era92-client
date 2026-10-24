import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme';

/**
 * CountdownBar — the time left before a waiting car is handed to the next
 * worker, drawn as a bar that drains along the card's bottom edge (Uber
 * Eats' "line moves to the left"); the caller writes the seconds beside it.
 *
 * 6 dp so it reads in sunlight, and both fills keep at least 3:1 against
 * the track (WCAG 1.4.11): brand violet, then a dark amber — not red, since
 * a car moving on is not the worker's failure — once it is urgent. It steps
 * once a second with no animation, which also suits reduce-motion.
 */
export default function CountdownBar({ fraction, urgent }: { fraction: number; urgent?: boolean }) {
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: urgent ? colors.warningText : colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, backgroundColor: colors.bgSunken, overflow: 'hidden' },
  fill: { height: 6 },
});
