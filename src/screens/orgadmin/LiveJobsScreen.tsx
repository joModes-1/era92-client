import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Linking } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../../api';
import AdminScreen from '../../components/admin/AdminScreen';
import BranchSheet, { BranchOption } from '../../components/admin/BranchSheet';
import {
  Card, Section, Pill, PillTone, Chip, Chips, Btn, Btns, IconBtn, IconChip, Bar, Row, MetaRow, kitStyles,
} from '../../components/admin/kit';
import { daysAgo, isoLocal, duration, minutesSince, clock } from './adminData';

/** A car washing longer than this is "stuck" — the same line the stale report draws. */
const STUCK_WASH_MIN = 30;
/** Used for the progress bar when a service has no finished washes to average yet. */
const FALLBACK_WASH_MIN = 25;

type Filter = 'all' | 'waiting' | 'washing' | 'ready' | 'stuck' | 'review';

/**
 * Live jobs, after the "Lovable" artboard: filter chips with counts, then a
 * card per car — plate, a status pill, what it is, a progress bar, where /
 * who / how long, and the price. Progress is time so far against that
 * service's average wash time (last 30 days). Stuck cars come first with a
 * call to the worker and the branch manager; Review lists payments to check.
 */
export default function LiveJobsScreen() {
  const route = useRoute<any>();
  const [filter, setFilter] = useState<Filter>('all');
  // An alert opens this page on its own filter (Stuck or Review).
  useEffect(() => { if (route.params?.view) setFilter(route.params.view); }, [route.params]);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    const today = isoLocal(new Date());
    const [washing, ready, waiting, stale, exc, staff, list, durations] = await Promise.allSettled([
      api.listWashes('status=in_progress'),
      api.listWashes('status=ready'),
      api.listWashes('status=requested'),
      api.stale(),
      api.exceptions(daysAgo(7), today),
      api.listStaff(),
      api.listBranches(),
      api.durations(daysAgo(30), today),
    ]);
    const v = (r: PromiseSettledResult<any>, f: any) => (r.status === 'fulfilled' && r.value ? r.value : f);
    setBranches((v(list, []) as any[]).map((b) => ({ id: b.id, name: b.name })));
    setData({
      washing: v(washing, []), ready: v(ready, []), waiting: v(waiting, []),
      stale: v(stale, {}), exceptions: v(exc, []), staff: v(staff, []), durations: v(durations, []),
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const branchName = branches.find((b) => b.id === branchId)?.name || null;
  const here = (w: any) => !branchId || w.branch_id === branchId || (!w.branch_id && w.branch_name === branchName);

  const staff: any[] = data?.staff || [];
  const phoneOf = (id?: string) => staff.find((s) => s.id === id)?.phone || null;
  const managerPhone = (bid?: string) =>
    staff.find((s) => s.branch_id === bid && s.role === 'manager' && s.status === 'active' && s.phone)?.phone || null;
  const call = (phone: string) => Linking.openURL(`tel:${phone}`).catch(() => {});

  // Average wash minutes per service, weighted by how many washes each class had.
  const avgBy = new Map<string, number>();
  {
    const acc = new Map<string, { m: number; n: number }>();
    (data?.durations || []).forEach((r: any) => {
      const a = acc.get(r.service_name) || { m: 0, n: 0 };
      a.m += Number(r.avg_wash_minutes || 0) * Number(r.count || 0);
      a.n += Number(r.count || 0);
      acc.set(r.service_name, a);
    });
    acc.forEach((a, k) => { if (a.n > 0) avgBy.set(k, a.m / a.n); });
  }
  const expected = (w: any) => avgBy.get(w.service_name) || FALLBACK_WASH_MIN;

  const staleReady = new Set((data?.stale?.stale_ready || []).map((w: any) => w.id));
  const washing: any[] = (data?.washing || []).filter(here);
  const ready: any[] = (data?.ready || []).filter(here);
  const waiting: any[] = (data?.waiting || []).filter(here);
  const stuck = [
    ...washing.filter((w) => minutesSince(w.started_at) > STUCK_WASH_MIN),
    ...ready.filter((w) => staleReady.has(w.id)),
  ].sort((a, b) => minutesSince(b.started_at) - minutesSince(a.started_at));
  const stuckIds = new Set(stuck.map((w) => w.id));
  const review: any[] = (data?.exceptions || []).filter(
    (x: any) => (x.exception_type === 'unverified' || x.exception_type === 'dispute') && !x.review_outcome && (!branchName || x.branch_name === branchName)
  );
  const activeCount = washing.length + ready.length + waiting.length;

  const money = (n: any) => (Number(n) > 0 ? `UGX ${Number(n).toLocaleString()}` : '');

  const jobCard = (w: any, o: { tone: PillTone; icon: string; label: string; fraction: number; meta: { icon: string; text: string }[]; right: string }) => (
    <Card key={w.id}>
      <View style={kitStyles.between}>
        <Text style={kitStyles.plate} numberOfLines={1}>{w.plate || w.job_no}</Text>
        <Pill tone={o.tone} icon={o.icon} label={o.label} />
      </View>
      <Text style={kitStyles.meta} numberOfLines={1}>{[w.vehicle_class_name, w.service_name].filter(Boolean).join(' · ')}</Text>
      <Bar fraction={o.fraction} />
      <MetaRow items={o.meta} />
      <View style={kitStyles.divider} />
      <View style={kitStyles.between}>
        <Text style={kitStyles.name}>{money(w.amount_ugx || w.quoted_amount_ugx) || w.job_no}</Text>
        <Text style={kitStyles.k}>{o.right}</Text>
      </View>
    </Card>
  );

  const washingCard = (w: any) => {
    const m = minutesSince(w.started_at);
    const f = Math.min(0.95, m / expected(w));
    return jobCard(w, {
      tone: 'blue', icon: 'tint', label: 'Washing', fraction: f,
      meta: [
        { icon: 'map-marker-alt', text: w.branch_name },
        { icon: 'user', text: w.started_by_name || '' },
        { icon: 'clock', text: duration(m) },
      ],
      right: `${Math.round(f * 100)}% done`,
    });
  };

  const readyCard = (w: any) => jobCard(w, {
    tone: 'ok', icon: 'check', label: 'Ready', fraction: 1,
    meta: [
      { icon: 'map-marker-alt', text: w.branch_name },
      { icon: 'user', text: w.started_by_name || '' },
      { icon: 'clock', text: `Washed ${clock(w.wash_done_at)}` },
    ],
    right: 'Waiting to pay',
  });

  const waitingCard = (w: any) => jobCard(w, {
    tone: 'warn', icon: 'clock', label: 'Waiting', fraction: 0,
    meta: [
      { icon: 'map-marker-alt', text: w.branch_name },
      { icon: 'user', text: w.client_name || '' },
      { icon: 'clock', text: `Waiting ${duration(minutesSince(w.created_at))}` },
    ],
    right: 'Not started',
  });

  const stuckCard = (w: any) => {
    const isReady = w.status === 'ready';
    const idle = isReady ? minutesSince(w.wash_done_at) : minutesSince(w.started_at);
    const workerPhone = phoneOf(w.started_by_worker_id);
    const mgrPhone = managerPhone(w.branch_id);
    return (
      <Card key={w.id}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <IconChip icon="exclamation-triangle" tone="error" />
          <View style={{ flex: 1 }}>
            <Text style={kitStyles.plate} numberOfLines={1}>{w.plate || w.job_no}</Text>
            <Text style={[kitStyles.k, { fontSize: 13, marginTop: 3 }]}>
              {isReady ? 'Washed and ready, not paid yet' : `Washing longer than ${STUCK_WASH_MIN} minutes`}
            </Text>
          </View>
          <Pill tone="bad" label={duration(idle)} />
        </View>
        <View style={{ marginLeft: 52 }}>
          <MetaRow items={[
            { icon: 'map-marker-alt', text: w.branch_name },
            { icon: 'user', text: w.started_by_name || '' },
            { icon: 'clock', text: isReady ? `Washed ${clock(w.wash_done_at)}` : `Started ${clock(w.started_at)}` },
          ]} />
        </View>
        {workerPhone || mgrPhone ? (
          <View style={{ marginTop: 14 }}>
            <Btns>
              {workerPhone ? <Btn icon="phone" title="Call worker" onPress={() => call(workerPhone)} /> : null}
              {mgrPhone ? <Btn primary icon="phone" title="Call manager" onPress={() => call(mgrPhone)} /> : null}
            </Btns>
          </View>
        ) : null}
      </Card>
    );
  };

  const reviewCard = (x: any) => {
    const dispute = x.exception_type === 'dispute';
    return (
      <Card key={`${x.exception_type}-${x.id}`}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <IconChip icon={dispute ? 'gavel' : 'question'} tone={dispute ? 'error' : 'primary'} />
          <View style={{ flex: 1 }}>
            <Text style={kitStyles.plate} numberOfLines={1}>{x.job_no}</Text>
            <Text style={[kitStyles.k, { fontSize: 13, marginTop: 3 }]}>
              {dispute
                ? `Customer disputed the payment${x.dispute_reason ? `: ${x.dispute_reason}` : ''}`
                : `Paid without the customer's app${x.unverified_reason ? ` (${String(x.unverified_reason).replace(/_/g, ' ')})` : ''}`}
            </Text>
          </View>
          <Pill tone={dispute ? 'bad' : 'info'} label={dispute ? 'Dispute' : 'Review'} />
        </View>
        <View style={{ marginLeft: 52 }}>
          <MetaRow items={[
            { icon: 'map-marker-alt', text: x.branch_name },
            { icon: 'user', text: x.starter_name || '' },
            { icon: 'car', text: x.vehicle_class_name || '' },
          ]} />
        </View>
      </Card>
    );
  };

  const nothing = (title: string, sub: string) => (
    <Card flush><Row leading={<IconChip icon="check" tone="success" />} title={title} sub={sub} last /></Card>
  );

  const show = (f: Filter) => filter === 'all' || filter === f;
  const calmWashing = washing.filter((w) => !stuckIds.has(w.id));
  const calmReady = ready.filter((w) => !stuckIds.has(w.id));

  return (
    <AdminScreen
      title="Live jobs"
      loading={!data}
      onRefresh={load}
    >
      <Chips>
        <Chip label={branchName || 'All branches'} caret onPress={() => setPicking(true)} />
      </Chips>
      <Chips>
        <Chip label={`All ${activeCount}`} on={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`Stuck ${stuck.length}`} on={filter === 'stuck'} onPress={() => setFilter('stuck')} />
        <Chip label={`Waiting ${waiting.length}`} on={filter === 'waiting'} onPress={() => setFilter('waiting')} />
        <Chip label={`Washing ${calmWashing.length}`} on={filter === 'washing'} onPress={() => setFilter('washing')} />
        <Chip label={`Ready ${calmReady.length}`} on={filter === 'ready'} onPress={() => setFilter('ready')} />
        <Chip label={`Review ${review.length}`} on={filter === 'review'} onPress={() => setFilter('review')} />
      </Chips>

      {filter === 'review' ? (
        <>
          <Section title="Payments to check this week" />
          {review.length ? review.map(reviewCard) : nothing('Nothing to check', 'Every payment this week was confirmed')}
        </>
      ) : (
        <>
          {show('stuck') && stuck.length > 0 ? (
            <>
              <Section title="Stuck" right={<Pill tone="bad" label={`${stuck.length}`} />} />
              {stuck.map(stuckCard)}
            </>
          ) : filter === 'stuck' ? nothing('No stuck cars', 'Every car is moving') : null}

          {show('washing') && calmWashing.length > 0 ? (
            <>
              {filter === 'all' ? <Section title="Washing" /> : null}
              {calmWashing.map(washingCard)}
            </>
          ) : filter === 'washing' ? nothing('No cars washing', 'Started washes show up here') : null}

          {show('ready') && calmReady.length > 0 ? (
            <>
              {filter === 'all' ? <Section title="Ready, waiting to pay" /> : null}
              {calmReady.map(readyCard)}
            </>
          ) : filter === 'ready' ? nothing('No cars waiting to pay', 'Washed cars show up here until they are paid') : null}

          {show('waiting') && waiting.length > 0 ? (
            <>
              {filter === 'all' ? <Section title="Waiting for a worker" /> : null}
              {waiting.map(waitingCard)}
            </>
          ) : filter === 'waiting' ? nothing('Nobody waiting', 'Bookings show up here the moment a customer scans in') : null}

          {filter === 'all' && activeCount === 0 ? nothing('No cars right now', 'Bookings show up here the moment a customer scans in') : null}
        </>
      )}

      <BranchSheet visible={picking} onClose={() => setPicking(false)} branches={branches} value={branchId} onPick={setBranchId} />
    </AdminScreen>
  );
}
