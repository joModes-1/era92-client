import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight } from '../../theme';
import { ReportScreen } from '../manager/reportHelpers';
import Icon from '../../components/Icon';
import { Surface, EmptyState, initials } from '../../components/ui';

/** Leaderboard — the branch's workers ranked by points earned this week, this month, or all time. */

type Period = 'week' | 'month' | 'all';
const LABEL: Record<Period, string> = { week: 'This week', month: 'This month', all: 'All time' };
const MEDAL = ['#F5B300', '#A7AFC0', '#C9814B'];

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
        return (
          <View style={{ gap: spacing.lg }}>
            <View style={styles.tabs}>
              {(['week', 'month', 'all'] as Period[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[styles.tab, period === p && styles.tabOn]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, period === p && styles.tabTextOn]}>{LABEL[p]}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {me ? (
              <Text style={styles.meLine}>
                You're <Text style={styles.strong}>#{me.rank}</Text> · {Number(me.points).toLocaleString()} pts · {Number(me.washes || 0)} cars
              </Text>
            ) : null}

            {list.length === 0 ? (
              <Surface elevation="sm" padded="lg">
                <EmptyState icon="trophy" title="No points yet" message="Points appear here as cars are washed and paid." />
              </Surface>
            ) : (
              <Surface elevation="sm" padded="sm">
                {list.map((r: any, i: number) => {
                  const mine = r.id === actor?.id;
                  return (
                    <View key={r.id} style={[styles.row, mine && styles.rowMe, i === list.length - 1 && { borderBottomWidth: 0 }]}>
                      <View style={styles.rankBox}>
                        {r.rank <= 3 && Number(r.points) > 0
                          ? <Icon name="medal" size={15} color={MEDAL[r.rank - 1]} />
                          : <Text style={styles.rank}>{r.rank}</Text>}
                      </View>
                      <View style={[styles.avatar, mine && styles.avatarMe]}>
                        <Text style={[styles.initials, mine && { color: '#fff' }]}>{initials(r.full_name)}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name} numberOfLines={1}>{mine ? 'You' : r.full_name}</Text>
                        <Text style={styles.meta}>{Number(r.washes || 0)} cars</Text>
                      </View>
                      <Text style={styles.points}>{Number(r.points).toLocaleString()} pts</Text>
                    </View>
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
  tabs: { flexDirection: 'row', backgroundColor: colors.bgSunken, borderRadius: 999, padding: 4 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 999, alignItems: 'center' },
  tabOn: { backgroundColor: colors.bgCard },
  tabText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
  tabTextOn: { color: '#AC00FF' },
  meLine: { fontSize: font.sm, color: colors.textSecondary, textAlign: 'center' },
  strong: { fontWeight: weight.heavy, color: colors.text },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowMe: { backgroundColor: '#FAF7FF', borderRadius: radii.md },
  rankBox: { width: 22, alignItems: 'center' },
  rank: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.textMuted },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F4ECFF', alignItems: 'center', justifyContent: 'center' },
  avatarMe: { backgroundColor: '#AC00FF' },
  initials: { fontSize: font.micro, fontWeight: weight.black, color: '#AC00FF' },
  name: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  meta: { fontSize: font.micro, color: colors.textMuted, marginTop: 1 },
  points: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.text },
});
