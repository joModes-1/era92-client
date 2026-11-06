import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { colors, soft, jk } from '../../theme';
import AdminScreen from '../../components/admin/AdminScreen';
import {
  Card, Section, Grid2, Stat, Row, Amount, Chip, Chips, Pill, Bar, BarChart, IconChip, TintTone, kitStyles,
} from '../../components/admin/kit';
import { daysAgo, isoLocal, hhmm, compact } from './adminData';

type Range = 1 | 7 | 30;

const RANGES: { value: Range; label: string }[] = [
  { value: 1, label: 'Today' },
  { value: 7, label: 'This week' },
  { value: 30, label: '30 days' },
];

const MORE: { route: string; icon: string; tone: TintTone; title: string; sub: string }[] = [
  { route: 'Performance', icon: 'trophy', tone: 'primary', title: 'Performance', sub: 'Who washed the most' },
  { route: 'Cash Variance', icon: 'balance-scale', tone: 'info', title: 'Cash Variance', sub: 'Expected vs counted' },
  { route: 'Stale Alerts', icon: 'exclamation-triangle', tone: 'warning', title: 'Stale Alerts', sub: 'Cars stuck too long' },
  { route: 'Exceptions', icon: 'clipboard-list', tone: 'error', title: 'Exceptions', sub: 'Cancellations, disputes, handovers' },
];

/**
 * Reports, after the "Lovable" artboard: a period, the revenue for it as
 * gradient columns with the change against the period before, the four
 * figures behind it, which services sold, how branches compare, and the
 * detailed reports one tap away.
 */
export default function ReportsScreen() {
  const navigation = useNavigation<any>();
  const [range, setRange] = useState<Range>(7);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    const now = new Date();
    const to = isoLocal(now);
    const from = daysAgo(range - 1);
    const [trend, today, yesterday, branches, durations] = await Promise.allSettled([
      // Twice the period, so the period before it comes back too.
      api.trend(range * 2),
      api.daily(to),
      api.daily(daysAgo(1), undefined, hhmm(now)),
      api.branches(from, to),
      api.durations(from, to),
    ]);
    const v = (r: PromiseSettledResult<any>, f: any) => (r.status === 'fulfilled' && r.value ? r.value : f);
    setData({
      trend: v(trend, []), today: v(today, null), yesterday: v(yesterday, null),
      branches: v(branches, []), durations: v(durations, []),
    });
  }, [range]);

  useEffect(() => { setData(null); load(); }, [load]);

  // ── Money and washes over the period, against the one before ──
  const trend: any[] = data?.trend || [];
  const current = trend.slice(-range);
  const previous = trend.slice(0, Math.max(0, trend.length - range));
  const sumOf = (rows: any[], k: string) => rows.reduce((t, r) => t + Number(r[k] || 0), 0);

  let revenue = sumOf(current, 'gross_ugx');
  let before = sumOf(previous, 'gross_ugx');
  let washes = sumOf(current, 'washes');
  let free = sumOf(current, 'free_washes');
  let values = current.map((r) => Number(r.gross_ugx || 0));
  let labels = current.map((r, i) => {
    const d = new Date(String(r.day).slice(0, 10) + 'T00:00:00');
    if (range === 7) return d.toLocaleDateString(undefined, { weekday: 'short' });
    return i % 5 === 0 || i === current.length - 1 ? String(d.getDate()) : '';
  });
  if (range === 1) {
    // Today runs by the hour, against yesterday up to this time.
    const s = data?.today?.summary || {};
    revenue = Number(s.gross_ugx || 0);
    before = Number(data?.yesterday?.summary?.gross_ugx || 0);
    washes = Number(s.settled_washes || 0);
    free = Number(s.redemption_count || 0);
    const byHour = new Map<number, number>((data?.today?.by_hour || []).map((h: any) => [Number(h.hour), Number(h.settled || 0)]));
    const hours = Array.from({ length: 12 }, (_, i) => 7 + i);
    values = hours.map((h) => byHour.get(h) || 0);
    labels = hours.map((h) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'a' : 'p'}`);
  }
  const change = before > 0 ? Math.round(((revenue - before) / before) * 100) : null;
  const periodWord = range === 1 ? 'yesterday by now' : `the ${range} days before`;
  const avgTicket = washes > 0 ? Math.round(revenue / washes) : 0;

  // ── Services sold, and how long a wash takes ──
  const dur: any[] = data?.durations || [];
  const durCount = dur.reduce((t, r) => t + Number(r.count || 0), 0);
  const avgWash = durCount > 0
    ? Math.round(dur.reduce((t, r) => t + Number(r.avg_wash_minutes || 0) * Number(r.count || 0), 0) / durCount)
    : null;
  const bySvc = new Map<string, number>();
  dur.forEach((r) => bySvc.set(r.service_name, (bySvc.get(r.service_name) || 0) + Number(r.count || 0)));
  const services = [...bySvc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const branchRows = [...(data?.branches || [])].sort((a: any, b: any) => Number(b.gross_ugx) - Number(a.gross_ugx));
  const rangeWord = range === 1 ? 'today' : range === 7 ? 'this week' : 'last 30 days';

  return (
    <AdminScreen
      title="Reports"
      subtitle={range === 1 ? 'Today so far' : `Last ${range} days`}
      loading={!data}
      onRefresh={load}
    >
      <Chips>
        {RANGES.map((r) => <Chip key={r.value} label={r.label} on={range === r.value} onPress={() => setRange(r.value)} />)}
      </Chips>

      <Card>
        <Text style={[kitStyles.k, { fontSize: 14 }]}>Revenue</Text>
        <View style={[kitStyles.between, { marginTop: 6 }]}>
          <Text style={[kitStyles.n, { fontSize: 26, lineHeight: 32, flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
            UGX {revenue.toLocaleString()}
          </Text>
          {change !== null && change !== 0 ? (
            <Pill tone={change > 0 ? 'ok' : 'bad'} icon={change > 0 ? 'arrow-up' : 'arrow-down'} label={`${Math.abs(change)}%`} />
          ) : null}
        </View>
        <Text style={kitStyles.k}>
          {change === null ? `Nothing in ${periodWord}` : change === 0 ? `Same as ${periodWord}` : `${change > 0 ? 'Up' : 'Down'} on ${periodWord}`}
        </Text>
        <BarChart values={values} labels={labels} height={150} />
      </Card>

      <Grid2>
        <Stat tone="primary" label="Washes" value={String(washes)} sub={rangeWord} />
        <Stat tone="info" label="Average ticket" value={compact(avgTicket)} sub="UGX per wash" />
        <Stat tone="success" label="Free washes" value={String(free)} sub="Points and offers" />
        <Stat tone="warning" label="Avg wash time" value={avgWash === null ? '—' : `${avgWash}m`} sub="Start to done" />
      </Grid2>

      <Section title="Services" />
      <Card>
        {services.length ? services.map(([name, n], i) => {
          const pct = durCount > 0 ? Math.round((n / durCount) * 100) : 0;
          return (
            <View key={name} style={{ marginBottom: i === services.length - 1 ? 0 : 12 }}>
              <View style={[kitStyles.between, { marginBottom: 6 }]}>
                <Text style={{ fontSize: 14, ...jk.semibold, color: colors.text, flexShrink: 1 }} numberOfLines={1}>{name}</Text>
                <Text style={{ fontSize: 14, ...jk.heavy, color: soft.text }}>{pct}%</Text>
              </View>
              <Bar fraction={pct / 100} />
            </View>
          );
        }) : <Text style={kitStyles.k}>No finished washes {rangeWord}.</Text>}
      </Card>

      <Section title="Branch comparison" />
      <Card flush>
        {branchRows.length ? branchRows.map((b: any, i: number) => (
          <Row
            key={b.branch_id}
            leading={<IconChip icon="store" tone="primary" />}
            title={b.branch_name}
            sub={`${Number(b.washes || 0)} washes · avg ${compact(Number(b.avg_ticket || 0))}`}
            trailing={<Amount>{compact(Number(b.gross_ugx || 0))}</Amount>}
            last={i === branchRows.length - 1}
          />
        )) : <Row title="No branches yet" last />}
      </Card>

      <Section title="More reports" />
      <Card flush>
        {MORE.map((m, i) => (
          <Row
            key={m.route}
            leading={<IconChip icon={m.icon} tone={m.tone} size={44} square />}
            title={m.title}
            sub={m.sub}
            chevron
            last={i === MORE.length - 1}
            onPress={() => navigation.navigate(m.route)}
          />
        ))}
      </Card>
    </AdminScreen>
  );
}
