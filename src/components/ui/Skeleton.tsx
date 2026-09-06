import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle } from 'react-native';
import { colors, radii, spacing } from '../../theme';

/** A single shimmering placeholder block. */
export function Skeleton({ width, height = 12, radius = radii.xs, style }: {
  width?: number | string; height?: number; radius?: number; style?: ViewStyle;
}) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius, backgroundColor: colors.bgSunken, opacity },
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton list — what a report shows while loading. */
export function SkeletonList({ rows = 4, showHeader = true }: { rows?: number; showHeader?: boolean }) {
  return (
    <View style={{ gap: spacing.md }}>
      {showHeader && (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Skeleton width={90} height={26} />
            <Skeleton width={54} height={26} />
            <Skeleton width={70} height={26} />
          </View>
        </View>
      )}
      <View style={styles.card}>
        {Array.from({ length: rows }).map((_, i) => (
          <View key={i} style={[styles.skRow, i < rows - 1 && styles.skRowBorder]}>
            <Skeleton width={34} height={34} radius={radii.full} />
            <View style={{ flex: 1, gap: 7 }}>
              <Skeleton width={`${55 + ((i * 13) % 30)}%`} height={11} />
              <Skeleton width={`${32 + ((i * 17) % 25)}%`} height={9} />
            </View>
            <Skeleton width={52} height={13} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  skRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
});
