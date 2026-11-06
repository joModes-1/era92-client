import React, { ReactNode, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, weight, soft, jk } from '../../theme';
import { SkeletonList } from '../ui';
import { IconBtn } from './kit';

/**
 * The admin pages' shell, after the "Lovable, top header removed" artboard:
 * no big title — one slim line saying what you're looking at (the date, "6
 * cars in the bays right now"), the page's own round buttons and the round
 * menu button, then the scrolling body. The page name still reaches screen
 * readers. Navigation stays in the side menu; the drawer pads the bottom.
 */
export default function AdminScreen({
  title, subtitle, right, loading, onRefresh, back, children,
}: {
  title: string;
  /** The slim line. Falls back to the title. */
  subtitle?: string;
  right?: ReactNode;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  /** Show a round back button (pages opened from another page). */
  back?: boolean;
  children: ReactNode;
}) {
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const pull = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh().catch(() => {});
    setRefreshing(false);
  };
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.slim}>
        {back && navigation.canGoBack?.() ? (
          <IconBtn icon="chevron-left" label="Back" onPress={() => navigation.goBack()} />
        ) : null}
        <Text style={styles.lbl} numberOfLines={1} accessibilityRole="header" accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}>
          {subtitle || title}
        </Text>
        <View style={styles.rt}>
          {right}
          <IconBtn icon="bars" label="Open menu" onPress={() => navigation.openDrawer?.()} />
        </View>
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.bdy}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={pull} tintColor={colors.primary} colors={[colors.primary]} /> : undefined}
      >
        {loading ? <SkeletonList rows={5} /> : children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: soft.page },
  slim: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 22, paddingHorizontal: 18, paddingBottom: 6 },
  lbl: { flex: 1, fontSize: 14, ...jk.semibold, color: colors.textSecondary },
  rt: { flexDirection: 'row', gap: 10 },
  bdy: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 28, gap: 16 },
});
