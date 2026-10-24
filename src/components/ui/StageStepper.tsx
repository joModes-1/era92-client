import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, weight, staffText } from '../../theme';
import Icon from '../Icon';

/**
 * StageStepper — a job's straight-line stages (Washing → Ready → Paid), the
 * way ServiceTitan and Jobber show a job moving on: done steps ticked, the
 * current one filled, the rest outlined. Each step is written, never colour
 * alone (STAFF-UI-SPEC.md §3).
 */
export default function StageStepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
    >
      {steps.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <React.Fragment key={s}>
            {i > 0 ? <View style={[styles.line, (done || now) && styles.lineOn]} /> : null}
            <View style={styles.step}>
              <View style={[styles.dot, done && styles.dotDone, now && styles.dotNow]}>
                {done ? <Icon name="check" size={9} color="#fff" /> : null}
              </View>
              <Text style={[styles.label, (done || now) && styles.labelOn]} numberOfLines={1}>{s}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { alignItems: 'center', gap: 6, minWidth: 56 },
  dot: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.ink[300], backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotNow: { borderColor: colors.primary, borderWidth: 6 },
  line: { flex: 1, height: 2, backgroundColor: colors.ink[200], marginTop: 8 },
  lineOn: { backgroundColor: colors.primary },
  label: { fontSize: 13, lineHeight: 18, fontWeight: weight.semibold, color: staffText.muted },
  labelOn: { color: colors.text },
});
