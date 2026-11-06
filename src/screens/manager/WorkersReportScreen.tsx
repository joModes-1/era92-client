import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, weight, soft, staffType, jk } from '../../theme';
import AdminScreen from '../../components/admin/AdminScreen';
import { useReport } from '../../components/admin/useReport';
import {
  Card, Section, Grid2, Stat, Pill, Row, Chip, Chips, Bar, Banner, IconChip, kitStyles,
} from '../../components/admin/kit';
import { daysAgo, isoLocal, compact } from '../orgadmin/adminData';

type Range = 1 | 7 | 30;
const RANGES: { value: Range; label: string }[] = [
  { value: 1, label: 'Today' },
  { value: 7, label: 'This week' },
  { value: 30, label: '30 days' },
];

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/**
 * Performance, after the "Lovable" artboard: who washed the most as a
 * gradient banner, the team's totals, then a leaderboard — rank, initials,
 * washes with a bar against the leader, branch and cash taken. Anyone with
 * nothing in the period is listed quietly underneath.
 */
export default function WorkersReportScreen() {
  const [range, setRange] = useState<Range>(7);
  const load = useCallback(async () => {
    const to = isoLocal(new Date());
    const from = range === 1 ? to : daysAgo(range - 1);
    const [workers, staff, durations] = await Promise.allSettled([api.workers(from, to), api.listStaff(), api.durations(from, to)]);
    const v = (r: PromiseSettledResult<any>, f: any) => (r.status === 'fulfilled' && r.value ? r.value : f);
    if (workers.status === 'rejected') throw workers.reason;
    return { workers: v(workers, []) as any[], staff: v(staff, []) as any[], durations: v(durations, []) as any[] };
  }, [range]);
  const { data, error, loading, reload } = useReport<{ workers: any[]; staff: any[]; durations: any[] }>(load);

  const branchOf = (id: string) => (data?.staff || []).find((s) => s.id === id)?.branch_name || '';
  const ranked = [...(data?.workers || [])]
    .filter((w) => Number(w.washes_started || 0) > 0)
    .sort((a, b) => Number(b.washes_started) - Number(a.washes_started));
  const idle = (data?.workers || []).filter((w) => Number(w.washes_started || 0) === 0);
  const top = ranked[0];
  const max = Math.max(1, Number(top?.washes_started || 0));
  const total = ranked.reduce((t, w) => t + Number(w.washes_started || 0), 0);
  const cash = ranked.reduce((t, w) => t + Number(w.cash_taken_ugx || 0), 0);
  const dur = data?.durations || [];
  const n = dur.reduce((t, r) => t + Number(r.count || 0), 0);
  const avgWash = n ? Math.round(dur.reduce((t, r) => t + Number(r.avg_wash_minutes || 0) * Number(r.count || 0), 0) / n) : null;
  const word = range === 1 ? 'today' : range === 7 ? 'this week' : 'in the last 30 days';

  return (
    <AdminScreen title="Performance" subtitle="Who washed the most" back loading={loading} onRefresh={reload}>
      <Chips>
        {RANGES.map((r) => <Chip key={r.value} label={r.label} on={range === r.value} onPress={() => setRange(r.value)} />)}
      </Chips>

      {error ? (
        <Card flush><Row leading={<IconChip icon="exclamation-triangle" tone="error" />} title="Couldn't load performance" sub={error} last /></Card>
      ) : (
        <>
          {top ? (
            <Banner icon="trophy">
              <Text style={s.bannerKicker}>TOP WASHER</Text>
              <Text style={s.bannerName} numberOfLines={1}>{top.full_name}</Text>
              <Text style={s.bannerSub} numberOfLines={1}>
                {top.washes_started} washes{branchOf(top.id) ? ` · ${branchOf(top.id)}` : ''}
              </Text>
            </Banner>
          ) : null}

          <Grid2>
            <Stat tone="primary" label="Total washes" value={String(total)} sub={word} />
            <Stat tone="success" label="Avg wash time" value={avgWash === null ? '—' : `${avgWash}m`} sub="Start to done" />
            <Stat tone="warning" label="Cash taken" value={compact(cash)} sub="UGX by the team" />
            <Stat tone="info" label="Washing" value={String(ranked.length)} sub={`staff active ${word}`} />
          </Grid2>

          <Section title="Leaderboard" />
          <Card flush>
            {ranked.length === 0 ? (
              <Row leading={<IconChip icon="moon" tone="neutral" />} title="No washes yet" sub={`Nobody started a wash ${word}`} last />
            ) : ranked.map((w, i) => {
              const started = Number(w.washes_started || 0);
              const unverified = Number(w.unverified_count || 0);
              return (
                <View key={w.id} style={[s.lr, i === ranked.length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={s.rank}>{i + 1}</Text>
                  <View style={s.av}><Text style={s.avText}>{initials(w.full_name || '?')}</Text></View>
                  <View style={{ flex: 1 }}>
                    <View style={kitStyles.between}>
                      <Text style={s.name} numberOfLines={1}>{w.full_name}</Text>
                      <Text style={s.count}>{started}</Text>
                    </View>
                    <Bar fraction={started / max} style={{ marginVertical: 8 }} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Pill tone="warn" icon="coins" label={compact(Number(w.cash_taken_ugx || 0))} />
                      {branchOf(w.id) ? <Text style={kitStyles.k}>{branchOf(w.id)}</Text> : null}
                      {unverified ? <Pill tone="bad" label={`${unverified} unconfirmed`} /> : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </Card>

          {idle.length > 0 ? (
            <>
              <Section title="No washes this period" right={<Pill tone="neutral" label={String(idle.length)} />} />
              <Card flush>
                {idle.map((w, i) => (
                  <Row
                    key={w.id}
                    leading={<View style={[s.av, s.avIdle]}><Text style={[s.avText, { color: colors.textSecondary }]}>{initials(w.full_name || '?')}</Text></View>}
                    title={w.full_name}
                    sub={branchOf(w.id) || undefined}
                    last={i === idle.length - 1}
                  />
                ))}
              </Card>
            </>
          ) : null}
        </>
      )}
    </AdminScreen>
  );
}

const s = StyleSheet.create({
  bannerKicker: { fontSize: 12, ...jk.bold, letterSpacing: 0.6, color: 'rgba(255,255,255,0.9)' },
  bannerName: { fontSize: 22, ...jk.heavy, color: '#fff', marginVertical: 2 },
  bannerSub: { fontSize: 13, ...jk.medium, color: 'rgba(255,255,255,0.92)' },
  lr: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: soft.line },
  rank: { width: 18, fontSize: 14, ...jk.semibold, color: colors.textSecondary, textAlign: 'center' },
  av: { width: 44, height: 44, borderRadius: 22, backgroundColor: soft.bg, alignItems: 'center', justifyContent: 'center' },
  avIdle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.bgSunken },
  avText: { fontSize: 14, ...jk.bold, color: soft.text },
  name: { flex: 1, fontSize: 15, ...jk.bold, color: colors.text },
  count: { fontSize: 15, ...jk.heavy, color: colors.text, ...staffType.tabular },
});
