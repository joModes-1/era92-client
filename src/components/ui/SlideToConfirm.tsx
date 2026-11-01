import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, ActivityIndicator, LayoutChangeEvent } from 'react-native';
import { colors, spacing, weight, staffText } from '../../theme';
import Icon from '../Icon';
import CssGradient from '../CssGradient';

const KNOB = 52;
const INSET = 4;
const HOLD_MS = 1200;
// Uber Base's sliding button completes at 80% of the track.
const THRESHOLD = 0.8;

/**
 * SlideToConfirm — for a worker's irreversible steps (finish washing,
 * payment collected), so a pocket or a wet thumb can't fire them by accident.
 * Built to Uber's Base "sliding button" (STAFF-UI-SPEC.md §2): label "Slide
 * to …", a rectangular knob with one arrow, completes at 80% of the drag and
 * snaps back if let go short.
 *
 * Pressing and holding anywhere on it for 1.2 s does the same — the
 * no-drag alternative WCAG 2.5.1 / 2.5.7 require, and easier with gloves.
 * Screen readers get a plain button.
 */
export default function SlideToConfirm({
  label, accessibilityLabel, onConfirm, tone = 'brand', loading = false, disabled = false,
}: {
  /** "Slide to finish washing" */
  label: string;
  /** Read by screen readers instead of the label; defaults to the label without "Slide to". */
  accessibilityLabel?: string;
  onConfirm: () => void;
  tone?: 'brand' | 'success';
  loading?: boolean;
  disabled?: boolean;
}) {
  const [width, setWidth] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const hold = useRef(new Animated.Value(0)).current;
  const fired = useRef(false);
  const max = Math.max(0, width - KNOB - INSET * 2);

  // The responder is built once; it reads the live values through this ref.
  const live = useRef({ max, onConfirm, blocked: disabled || loading });
  live.current = { max, onConfirm, blocked: disabled || loading };

  const fire = () => {
    if (fired.current) return;
    fired.current = true;
    hold.stopAnimation();
    Animated.timing(x, { toValue: live.current.max, duration: 120, useNativeDriver: false }).start();
    live.current.onConfirm();
  };
  const reset = () => {
    fired.current = false;
    Animated.spring(x, { toValue: 0, useNativeDriver: false, bounciness: 6 }).start();
    Animated.timing(hold, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  // Ready again once the action has finished.
  useEffect(() => {
    if (!loading) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const responder = useMemo(() => {
    let dragging = false;
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !live.current.blocked && !fired.current,
      onMoveShouldSetPanResponder: () => !live.current.blocked && !fired.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragging = false;
        Animated.timing(hold, { toValue: 1, duration: HOLD_MS, useNativeDriver: false })
          .start(({ finished }) => { if (finished && !dragging) fire(); });
      },
      onPanResponderMove: (_, g) => {
        if (!dragging && Math.abs(g.dx) > 8) {
          dragging = true;
          hold.stopAnimation();
          hold.setValue(0);
        }
        if (dragging) x.setValue(Math.min(live.current.max, Math.max(0, g.dx)));
      },
      onPanResponderRelease: (_, g) => {
        if (fired.current) return;
        hold.stopAnimation();
        if (dragging && g.dx >= live.current.max * THRESHOLD) fire();
        else reset();
      },
      onPanResponderTerminate: () => { if (!fired.current) reset(); },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const labelOpacity = x.interpolate({ inputRange: [0, Math.max(1, max * 0.6)], outputRange: [1, 0], extrapolate: 'clamp' });
  const holdWidth = hold.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const knobColor = tone === 'success' ? colors.success : colors.primary;
  const a11y = accessibilityLabel || label.replace(/^slide (to |when )?/i, '').replace(/^./, (c) => c.toUpperCase());

  const content = (
    <>
      <Animated.View style={[styles.holdFill, { width: holdWidth }]} pointerEvents="none" />
      <Animated.Text style={[styles.label, { opacity: labelOpacity }]} numberOfLines={1}>{label}</Animated.Text>
      <Animated.View style={[styles.knob, { transform: [{ translateX: x }] }]}>
        {loading ? <ActivityIndicator color={knobColor} /> : <Icon name="arrow-right" size={18} color={knobColor} />}
      </Animated.View>
    </>
  );

  return (
    <View style={(disabled && !loading) ? styles.disabled : undefined}>
      <View
        onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        {...responder.panHandlers}
        accessible
        accessibilityRole="button"
        accessibilityLabel={a11y}
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'activate' && !disabled && !loading) fire(); }}
        style={styles.trackWrap}
      >
        {tone === 'brand' ? (
          <CssGradient
            colors={colors.gradientButton}
            locations={[0.05, 0.75]}
            angle={100}
            style={styles.track}
          >
            {content}
          </CssGradient>
        ) : (
          <View style={[styles.track, { backgroundColor: colors.success }]}>{content}</View>
        )}
      </View>
      <Text style={styles.hint}>or press and hold</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trackWrap: { borderRadius: 16, overflow: 'hidden' },
  track: {
    height: KNOB + INSET * 2,
    borderRadius: 16,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  holdFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  label: {
    textAlign: 'center',
    paddingLeft: KNOB,
    paddingRight: spacing.md,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: weight.semibold,
    color: '#fff',
    // No text selection while dragging on the web build.
    userSelect: 'none',
  } as any,
  knob: {
    position: 'absolute',
    left: INSET,
    top: INSET,
    width: KNOB,
    height: KNOB,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: { fontSize: 13, lineHeight: 18, color: staffText.muted, textAlign: 'center', marginTop: 6 },
  disabled: { opacity: 0.5 },
});
