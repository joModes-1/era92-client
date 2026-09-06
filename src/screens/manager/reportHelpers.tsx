import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import Badge from '../../components/Badge';
import StatCard from '../../components/StatCard';
import ScreenHeader from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import Icon from '../../components/Icon';
import { Surface, SkeletonList, EmptyState } from '../../components/ui';

export const today = () => new Date().toISOString().slice(0, 10);
export const weekAgo = () => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

/** "Aug 24 – Aug 30" style range label for report subtitles. */
export function rangeLabel(from: string, to: string) {
  const fmt = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(from)} – ${fmt(to)}`;
}

export function ReportScreen({
  title,
  subtitle,
  load,
  render,
  headerAction,
  headerRail,
}: {
  title: string;
  subtitle?: string;
  load: () => Promise<any>;
  render: (data: any) => React.ReactNode;
  headerAction?: ReactNode;
  /** Optional live stats rendered into the header gradient. */
  headerRail?: (data: any) => ReactNode;
}) {
  const [data, setData] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await load();
      setData(d);
      setError('');
    } catch (e: any) {
      setError(e?.message || 'Could not load this report.');
    }
    setLoaded(true);
  }, [load]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={title} subtitle={subtitle} action={headerAction}>
        {loaded && !error && headerRail ? headerRail(data) : null}
      </ScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        }
      >
        {!loaded ? (
          <SkeletonList rows={5} />
        ) : error ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState
              icon="exclamation-triangle"
              title="Could not load this report"
              message={error}
              action={<GradientButton title="Try again" onPress={fetchData} icon="redo" full />}
            />
          </Surface>
        ) : (
          render(data)
        )}
      </ScrollView>
    </View>
  );
}

export { Badge, StatCard };

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  // Typography
  sectionTitle: {
    fontSize: font.xs,
    fontWeight: weight.heavy,
    color: colors.textSecondary,
    letterSpacing: tracking.capsWide,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  subTitle: {
    fontSize: font.xs,
    fontWeight: weight.heavy,
    color: colors.textSecondary,
    letterSpacing: tracking.capsWide,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },

  // Card — soft shadow + hairline, never a hard grey box
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadow.sm,
  },
  cardTitle: {
    fontSize: font.xs,
    fontWeight: weight.heavy,
    color: colors.textSecondary,
    letterSpacing: tracking.capsWide,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },

  statsRow: { flexDirection: 'row', gap: spacing.sm },

  // Table
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  tableCell: { flex: 2, fontSize: font.sm, color: colors.text, fontWeight: weight.semibold },
  tableCellCenter: { flex: 1, fontSize: font.sm, textAlign: 'center', color: colors.textSecondary },
  tableCellRight: { flex: 2, fontSize: font.sm, textAlign: 'right', fontWeight: weight.bold, color: colors.text },

  emptyText: { textAlign: 'center', color: colors.textMuted, paddingVertical: spacing.xl, fontSize: font.sm },

  // Legacy aliases kept so older screens keep compiling while they migrate.
  workerName: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  varianceItem: { flexDirection: 'row', justifyContent: 'space-between' },
  varianceName: { fontSize: font.sm, fontWeight: weight.semibold },
  varianceBranch: { fontSize: font.xs, color: colors.textMuted },
  varianceAmount: { fontSize: font.regular, fontWeight: weight.heavy },
  staleItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  staleJob: { fontSize: font.sm, fontWeight: weight.semibold, flex: 1 },
  staleTime: { fontSize: font.sm, color: colors.error, fontWeight: weight.bold },
  exceptionItem: { gap: 4 },
  exceptionJob: { fontSize: font.sm, fontWeight: weight.semibold },
  exceptionDate: { fontSize: font.xs, color: colors.textMuted },
  handoverItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  handoverJob: { fontSize: font.sm, fontWeight: weight.bold },
  handoverDetail: { fontSize: font.sm, color: colors.textSecondary, flex: 1, marginLeft: 8 },
  handoverAmount: { fontSize: font.sm, fontWeight: weight.bold, color: colors.primary },
  cancelItem: { gap: 3 },
  cancelWorker: { fontSize: font.sm, fontWeight: weight.bold },
  cancelCount: { fontSize: font.sm, color: colors.error },
  cancelReason: { fontSize: font.xs, color: colors.textMuted },
  staffItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffName: { fontSize: font.sm, fontWeight: weight.bold },
  staffMeta: { fontSize: font.xs, color: colors.textMuted },
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  errorWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: spacing.sm },
  errorText: { textAlign: 'center', color: colors.error, fontSize: font.regular, fontWeight: weight.semibold },
});
