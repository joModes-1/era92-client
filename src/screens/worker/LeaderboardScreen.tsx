import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, spacing, weight, staffType, staffText } from '../../theme';
import { ReportScreen } from '../manager/reportHelpers';
import Icon from '../../components/Icon';
import { Surface, EmptyState, Avatar, Segmented } from '../../components/ui';

/**
 * Leaderboard — the branch's workers ranked by points this week, this month,
 * or all time.
 *
 * Relative, not a full table (STAFF-UI-SPEC.md §3): research on workplace
 * leaderboards finds that showing people their neighbours motivates while a
 * public bottom of the table demotivates (Duolingo leagues, relative
 * leaderboard studies). So: your standing first, the top three, then the
 * people just above and below you — never the whole tail.
 */

type Period = 'week' | 'month' | 'all';
const LABEL: Record<Period, string> = { week: 'This week', month: 'This month', all: 'All time' };
const RESETS: Record<Period, string> = {
  week: 'A new week starts on Monday',
  month: 'A new month starts on the 1st',
  all: 'Every point you have earned',
};
// Gold, silver, bronze — each medal also carries its rank number beside it,
// so the order never depends on telling the three metals apart.
const MEDAL = ['#E0A100', '#9AA3B5', '#C27A45'];

export default function LeaderboardScreen() {
  const { actor } = useAuth();
  const [period, setPeriod] = useState<Period>('week');
  // A new function when the period changes, so the screen reloads for it.
  const load = useCallback(() => api.leaderboard(period), [period]);

  return (
    <ReportScreen
      title="Leaderboard"
      subtitle="Points earned at your branch"
      load={load}
      render={(rows) => {
        const list: any[] = (Array.isArray(rows) ? rows : []).filter((r) => Number(r.points) > 0 || r.id === actor?.id);
        const me = list.find((r) => r.id === actor?.id);

        // Top three, then you and your neighbours; a gap marker between.
        const shown = new Set<number>();
        list.forEach((r, i) => { if (i < 3) shown.add(i); });
        const meIndex = list.findIndex((r) => r.id === actor?.id);
        if (meIndex >= 0) [meIndex - 1, meIndex, meIndex + 1].forEach((i) => { if (i >= 0 && i < list.length) shown.add(i); });
        const indexes = [...shown].sort((a, b) => a - b);

        return (
          <View style={{ gap: spacing.lg }}>
            <View style={{ gap: spacing.sm }}>
              <Segmented
                options={(['week', 'month', 'all'] as Period[]).map((p) => ({ value: p, label: LABEL[p] }))}
                value={period}
                onChange={setPeriod}
              />
              <Text style={styles.resets}>{RESETS[period]}</Text>
            </View>

            {/* Your own standing first — the question a worker opens this
                screen to answer. */}
            {me ? (
              // The My Points card's pink → peach wash, so standing and
              // points read as one family.
              <LinearGradient colors={['#FCE4F4', '#FFF1E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.meCard}>
                <View>
                  <Text style={styles.caption}>Your rank</Text>
                  <Text style={styles.meRank}>#{me.rank}</Text>
                </View>
                <View style={styles.meFacts}>
                  <Text style={styles.meValue}>{Number(me.points).toLocaleString()}</Text>
                  <Text style={styles.meLabel}>points</Text>
                </View>
                <View style={styles.meFacts}>
                  <Text style={styles.meValue}>{Number(me.washes || 0).toLocaleString()}</Text>
                  <Text style={styles.meLabel}>cars</Text>
                </View>
              </LinearGradient>
            ) : null}

            {list.length === 0 ? (
              <Surface elevation="sm" padded="lg">
                <EmptyState icon="trophy" title="No points yet" message="Points appear here as cars are washed and paid." />
              </Surface>
            ) : (
              <Surface elevation="sm" padded="sm">
                {indexes.map((idx, k) => {
                  const r = list[idx];
                  const mine = r.id === actor?.id;
                  const medal = r.rank <= 3 && Number(r.points) > 0;
                  const gap = k > 0 && idx - indexes[k - 1] > 1;
                  return (
                    <React.Fragment key={r.id}>
                      {gap ? <Text style={styles.gap}>···</Text> : null}
                      <View style={[styles.row, mine && styles.rowMe]}>
                        <View style={styles.rankBox}>
                          {medal ? <Icon name="medal" size={17} color={MEDAL[r.rank - 1]} /> : null}
                          <Text style={styles.rank}>{r.rank}</Text>
                        </View>
                        <Avatar name={r.full_name} size={36} variant={mine ? 'solid' : 'soft'} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name} numberOfLines={1}>{mine ? 'You' : r.full_name}</Text>
                          <Text style={styles.meta}>{Number(r.washes || 0).toLocaleString()} cars</Text>
                        </View>
                        <Text style={styles.points}>{Number(r.points).toLocaleString()}</Text>
                      </View>
                    </React.Fragment>
                  );
                })}
              </Surface>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  resets: { ...staffType.meta, textAlign: 'center' },
  caption: { ...staffType.caption, color: staffText.secondary },

  meCard: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xl, padding: spacing.lg, borderRadius: radii.xl },
  meRank: { ...staffType.hero, color: colors.primaryText },
  meFacts: { flex: 1, paddingBottom: 4 },
  meValue: { ...staffType.figure },
  meLabel: { ...staffType.meta },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, minHeight: 56,
  },
  rowMe: { backgroundColor: colors.primarySoft, borderRadius: radii.md },
  rankBox: { width: 40, flexDirection: 'row', alignItems: 'center', gap: 4 },
  rank: { ...staffType.label, ...staffType.tabular, color: staffText.secondary },
  name: { ...staffType.rowTitle, fontSize: 16 },
  meta: { ...staffType.meta },
  points: { ...staffType.label, ...staffType.tabular, fontWeight: weight.bold },
  gap: { ...staffType.label, color: staffText.muted, textAlign: 'center', paddingVertical: 2 },
});
