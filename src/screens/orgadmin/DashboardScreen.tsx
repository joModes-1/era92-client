import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { tint } from '../../theme';
import AdminScreen from '../../components/admin/AdminScreen';
import BranchSheet, { BranchOption } from '../../components/admin/BranchSheet';
import HomeTop from './HomeTop';
import {
  Card, Section, Row, Pill, PillTone, Amount, Btn, IconBtn, IconChip, BarChart, SplitBar, Met, kitStyles,
} from '../../components/admin/kit';
import { isoLocal, daysAgo, hhmm, compact, ugx } from './adminData';
import { buildAlerts, topOfEachKind } from './alerts';

/** The opening hours the by-hour chart spans; a wash outside them widens it. */
const OPEN_FROM = 7;
const OPEN_TO = 18;

/**
 * The org admin's Home, after the "Era92 admin mobile app" design: today's
 * four figures, what needs a decision, how the money came in, the day by
 * hour, each branch at a glance and the latest cash handed in.
 */
export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [branchList, setBranchList] = useState<BranchOption[]>([]);
  const [d, setD] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const now = new Date();
    const today = isoLocal(now);
    const b = branchId || undefined;
    const [day, lastWeek, wallets, stale, exc, variance, branches, list] = await Promise.allSettled([
      api.daily(today, b),
      // Today so far against the same weekday last week up to the same time.
      api.daily(daysAgo(7), b, hhmm(now)),
      api.listWallets(b),
      api.stale(),
      api.exceptions(daysAgo(7), today),
      api.cashVariance(daysAgo(7), today),
      api.branches(today, today),
      api.listBranches(),
    ]);
    const v = (r: PromiseSettledResult<any>) => (r.status === 'fulfilled' ? r.value : null);
    if (v(list)) setBranchList((v(list) as any[]).map((x) => ({ id: x.id, name: x.name })));
    setD({
      day: v(day), lastWeek: v(lastWeek), wallets: v(wallets), stale: v(stale),
      exceptions: v(exc) || [], variance: v(variance), branches: v(branches) || [],
    });
  }, [branchId]);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const branchName = branchList.find((b) => b.id === branchId)?.name || null;
  const inBranch = (name?: string) => !branchName || name === branchName;

  // ── Today's four figures ──
  const sum = d?.day?.summary || {};
  const washes = Number(sum.settled_washes || 0);
  const before = Number(d?.lastWeek?.summary?.settled_washes || 0);
  const delta = before > 0 ? Math.round(((washes - before) / before) * 100) : null;
  const lastWeekday = new Date(Date.now() - 7 * 86400000).toLocaleDateString(undefined, { weekday: 'short' });
  const gross = Number(sum.gross_ugx || 0);
  const staff: any[] = d?.wallets?.staff || [];
  const holders = staff.filter((w) => Number(w.owes_ugx || 0) > 0);
  const held = holders.reduce((t, w) => t + Number(w.owes_ugx || 0), 0);

  // ── What needs a decision: the top alert of each kind; the rest live on Alerts ──
  const alerts = buildAlerts(d || {}, inBranch);
  const attention = topOfEachKind(alerts);
  const hiddenCount = alerts.length - attention.length;
  const stuck = alerts.filter((a) => a.kind === 'stuck');

  // ── How the money came in ──
  const cashIn = Number(sum.cash_ugx || 0);
  const mobileIn = Number(sum.mobile_money_ugx || 0);
  const otherIn = Math.max(0, gross - cashIn - mobileIn);

  // ── The day by hour ──
  const byHour = new Map<number, number>((d?.day?.by_hour || []).map((h: any) => [Number(h.hour), Number(h.settled || 0)]));
  const hours = [...byHour.keys()];
  const from = Math.min(OPEN_FROM, ...hours);
  const to = Math.max(OPEN_TO, ...hours);
  const hourList = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const hourValues = hourList.map((h) => byHour.get(h) || 0);
  const peak = Math.max(...hourValues, 0);
  const peakHour = hourList[hourValues.indexOf(peak)];

  // ── Branches ──
  const branchRows = (d?.branches || []).filter((b: any) => inBranch(b.branch_name)).map((b: any) => {
    const stuckHere = stuck.filter((a) => a.branch === b.branch_name).length;
    const n = Number(b.washes || 0);
    let pill: { tone: PillTone; label: string } = n > 0 ? { tone: 'ok', label: 'Clear' } : { tone: 'neutral', label: 'Quiet' };
    if (stuckHere) pill = { tone: 'bad', label: `${stuckHere} stuck` };
    else if (Number(b.total_variance || 0) < 0) pill = { tone: 'warn', label: 'Variance' };
    else if (Number(b.disputes || 0) > 0) pill = { tone: 'info', label: `${b.disputes} dispute${Number(b.disputes) > 1 ? 's' : ''}` };
    return { key: b.branch_id, name: b.branch_name, sub: `${n} wash${n === 1 ? '' : 'es'} · ${compact(Number(b.gross_ugx || 0))}`, pill };
  });

  const todayLong = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AdminScreen
      title="Home"
      subtitle={todayLong}
      loading={!loaded}
      onRefresh={load}
      right={<IconBtn icon="bell" label="Alerts" badge={alerts.length} onPress={() => navigation.navigate('Alerts')} />}
    >
      <HomeTop
        d={{
          branchLabel: branchName || 'All branches',
          onPickBranch: () => setPicking(true),
          gross, washes, washDelta: delta, lastWeekday,
          held, holders: holders.length,
          free: Number(sum.redemption_count || 0), freeValue: Number(sum.redemption_value_ugx || 0),
        }}
      />

      <Section
        title="Needs attention"
        right={alerts.length ? <Pill tone="bad" label={`${alerts.length} alert${alerts.length === 1 ? '' : 's'}`} /> : <Pill tone="ok" label="Clear" />}
      />
      <Card flush>
        {attention.length === 0 ? (
          <Row leading={<IconChip icon="check" tone="success" />} title="Nothing needs you right now" sub="No stuck cars, cash held too long or payments to check" last />
        ) : attention.map((a, i) => {
          const more = alerts.filter((x) => x.kind === a.kind).length - 1;
          return (
            <Row
              key={a.key}
              leading={<Pill tone={a.tone} label={a.pill} />}
              title={a.title}
              sub={more > 0 ? `${a.sub} · ${more} more` : a.sub}
              chevron
              last={i === attention.length - 1}
              onPress={() => navigation.navigate(a.go, a.params)}
            />
          );
        })}
      </Card>
      {hiddenCount > 0 ? (
        <Btn primary title={`See all ${alerts.length} alerts`} onPress={() => navigation.navigate('Alerts')} />
      ) : null}

      <Section title="Payments today" />
      <Card>
        <View style={[kitStyles.between, { alignItems: 'baseline' }]}>
          <Text style={kitStyles.n}>{ugx(gross)}</Text>
          <Text style={kitStyles.k}>UGX total</Text>
        </View>
        <SplitBar parts={[
          { value: cashIn, color: tint.warning.fg },
          { value: mobileIn, color: tint.info.fg },
          { value: otherIn, color: tint.primary.fg },
        ]} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Met tone="warning" label="Cash" value={compact(cashIn)} />
          <Met tone="info" label="Mobile money" value={compact(mobileIn)} />
        </View>
        <Text style={[kitStyles.k, { marginTop: 12 }]}>Mobile money is settled automatically.</Text>
      </Card>

      <Section title="Washes by hour" />
      <Card>
        <BarChart values={hourValues} labels={hourList.map(hourLabel)} height={96} />
        <Text style={[kitStyles.k, { textAlign: 'center', marginTop: 14, fontSize: 13 }]}>
          {peak > 0 ? `Busiest at ${hourLabel(peakHour)} with ${peak} wash${peak === 1 ? '' : 'es'}` : 'No washes yet today'}
        </Text>
      </Card>

      {branchRows.length > 0 ? (
        <>
          <Section title="Branches" />
          <Card flush>
            {branchRows.map((b: any, i: number) => (
              <Row
                key={b.key}
                leading={<IconChip icon="store" tone="primary" />}
                title={b.name}
                sub={b.sub}
                trailing={<Pill tone={b.pill.tone} label={b.pill.label} />}
                last={i === branchRows.length - 1}
                onPress={() => navigation.navigate('Branches')}
              />
            ))}
          </Card>
        </>
      ) : null}

      <BranchSheet visible={picking} onClose={() => setPicking(false)} branches={branchList} value={branchId} onPick={setBranchId} />
    </AdminScreen>
  );
}

/** 7 → "7a", 13 → "1p": the design's hour labels. */
function hourLabel(h: number) {
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${h < 12 ? 'a' : 'p'}`;
}
