import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import { Skeleton, Surface, EmptyState } from '../../components/ui';

/**
 * Shared chrome for the two QR hand-off screens. Both are "hold your phone up"
 * moments, so they share one calm, centred layout with a modal-style back
 * affordance rather than the app drawer header.
 */
export default function ScanScreenShell({
  eyebrow, title, loading, hasToken, children, footer,
}: {
  eyebrow?: string;
  title: string;
  loading: boolean;
  hasToken: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn} activeOpacity={0.7}>
          <Icon name="chevron-down" size={14} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          {eyebrow ? <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow.toUpperCase()}</Text> : null}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {loading ? (
          <Surface elevation="md" padded="lg" style={{ alignItems: 'center', gap: spacing.lg, alignSelf: 'stretch' }}>
            <Skeleton width={130} height={26} radius={radii.full} />
            <Skeleton width={196} height={196} radius={radii.lg} />
            <Skeleton width="100%" height={10} />
          </Surface>
        ) : !hasToken ? (
          <Surface elevation="sm" padded="lg" style={{ alignSelf: 'stretch' }}>
            <EmptyState
              icon="exclamation-triangle"
              title="Could not load a code"
              message="Go back and try again in a moment."
            />
          </Surface>
        ) : (
          children
        )}

        {footer}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  headerText: { flex: 1, alignItems: 'center' },
  eyebrow: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  title: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, alignItems: 'center', gap: spacing.lg },
});
