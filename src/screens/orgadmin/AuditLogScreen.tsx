import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, Tone } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader from '../../components/ScreenHeader';
import { Surface, SectionHeader, EmptyState, SkeletonList } from '../../components/ui';

const ACTION_META: Record<string, { icon: string; tone: Tone }> = {
  'staff.created': { icon: 'user-plus', tone: 'success' },
  'staff.password_reset': { icon: 'key', tone: 'warning' },
  'staff.reset_password_refused': { icon: 'ban', tone: 'error' },
  'staff.pin_set': { icon: 'lock', tone: 'info' },
  'price.update': { icon: 'coins', tone: 'primary' },
  'loyalty_config.updated': { icon: 'star', tone: 'accent' },
};

const metaFor = (a: string) => ACTION_META[a] || { icon: 'circle', tone: 'neutral' as Tone };

function actionLabel(action: string): string {
  return action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function dayKey(iso: string) {
  return (iso || '').slice(0, 10);
}

function dayLabel(key: string) {
  const t = new Date().toISOString().slice(0, 10);
  if (key === t) return 'Today';
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (key === y) return 'Yesterday';
  if (!key) return 'Undated';
  return new Date(key + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeOf(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function AuditLogScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getAuditLogs({ limit: 50 });
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Audit Log" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={7} showHeader={false} /></ScrollView>
      </View>
    );
  }

  // Group into days so the log reads as a timeline rather than a wall of rows.
  const groups = new Map<string, any[]>();
  logs.forEach((l: any) => {
    const k = dayKey(l.created_at);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(l);
  });
  const days = [...groups.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <View style={styles.container}>
      <ScreenHeader title="Audit Log" subtitle={`${total} events · last 30 days`} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {logs.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="shield-alt" title="No activity recorded" message="Administrative actions will be logged here." />
          </Surface>
        ) : (
          days.map(([day, rows]) => (
            <View key={day}>
              <SectionHeader title={dayLabel(day)} count={rows.length} />
              <Surface elevation="sm">
                {rows.map((log: any, i: number) => {
                  const m = metaFor(log.action);
                  const last = i === rows.length - 1;
                  return (
                    <View key={log.id} style={styles.event}>
                      {/* Timeline spine — connects events within a day */}
                      <View style={styles.spine}>
                        <View style={[styles.node, { backgroundColor: colors[m.tone === 'neutral' ? 'bgSunken' : 'bgSunken'] }]}>
                          <Icon
                            name={m.icon}
                            size={11}
                            color={m.tone === 'neutral' ? colors.textMuted : colors[m.tone]}
                          />
                        </View>
                        {!last ? <View style={styles.line} /> : null}
                      </View>

                      <View style={[styles.content, !last && styles.contentGap]}>
                        <Text style={styles.action}>{actionLabel(log.action)}</Text>
                        <Text style={styles.meta}>
                          {log.actor_name || 'System'} · {timeOf(log.created_at)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </Surface>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  event: { flexDirection: 'row', gap: spacing.md },
  spine: { alignItems: 'center', width: 28 },
  node: {
    width: 28, height: 28, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  line: { flex: 1, width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4 },
  content: { flex: 1, paddingTop: 4, gap: 2 },
  contentGap: { paddingBottom: spacing.lg },
  action: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  meta: { fontSize: font.xs, color: colors.textMuted },
});
