import React, { useCallback, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { api } from '../../api';
import AdminScreen from '../../components/admin/AdminScreen';
import { useReport } from '../../components/admin/useReport';
import LineIcon from '../../components/admin/LineIcon';
import { useAppAlert } from '../../components/AppAlert';
import { tint } from '../../theme';
import {
  Card, Section, Pill, Row, Chip, Chips, IconChip, Amount, Btn, Btns, TintTone, kitStyles,
} from '../../components/admin/kit';
import { daysAgo, isoLocal, clock } from '../orgadmin/adminData';

type Range = 1 | 7 | 30;
/** How many reviewed exceptions "Reviewed earlier" lists. */
const DONE_SHOWN = 10;
const RANGES: { value: Range; label: string }[] = [
  { value: 1, label: 'Today' },
  { value: 7, label: 'This week' },
  { value: 30, label: '30 days' },
];

// What each type is called, its colour and mark, and what it means.
const TYPE: Record<string, { tone: TintTone; icon: string; chip: string; title: string; explain: string }> = {
  cancellation: {
    tone: 'error', icon: 'ban', chip: 'Cancellations', title: 'Job cancelled',
    explain: 'The wash was started, then cancelled before it was paid for.',
  },
  dispute: {
    tone: 'warning', icon: 'gavel', chip: 'Disputes', title: 'Payment disputed',
    explain: 'The customer disputed the amount or the work done.',
  },
  reversal: {
    tone: 'primary', icon: 'undo', chip: 'Reversals', title: 'Payment reversed',
    explain: 'A settled wash was reversed — the payment was undone.',
  },
  unverified: {
    tone: 'info', icon: 'question', chip: 'Unverified', title: 'Paid without the app',
    explain: "Cash was taken without scanning the customer's phone, so no receipt was confirmed on their end.",
  },
};
const typeOf = (t: string) => TYPE[t] || { tone: 'neutral' as TintTone, icon: 'flag', chip: t, title: (t || 'Other').replace(/_/g, ' '), explain: '' };

const UNVERIFIED_REASON: Record<string, string> = {
  dead_phone: "Customer's phone was dead",
  no_app: 'Customer had no app or code',
  app_error: 'App error while scanning',
};
const HANDOVER_REASON: Record<string, string> = {
  starter_off_shift: 'Starter had gone off shift',
  starter_on_break: 'Starter was on break',
  starter_phone_unusable: "Starter's phone was unusable",
  starter_left_for_day: 'Starter had left for the day',
  other: 'Other reason',
};

function detail(e: any) {
  switch (e.exception_type) {
    case 'unverified': return UNVERIFIED_REASON[e.unverified_reason] || 'No reason recorded';
    case 'cancellation': return e.cancel_reason || 'Cancelled after the wash started';
    case 'dispute': return e.dispute_reason || 'Customer disputed the payment';
    case 'reversal': return e.reverse_reason || 'Payment undone';
    default: return '';
  }
}

function dayTitle(day: string) {
  const today = isoLocal(new Date());
  if (day === today) return 'Today';
  if (day === daysAgo(1)) return 'Yesterday';
  return new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

/**
 * Exceptions, after the "Lovable" artboard: chips by type with counts, then
 * each day's exceptions as rows — a tinted mark, what happened and why, the
 * job and branch, the time. Handovers (one worker started a car, another
 * finished it) sit at the bottom: empty until one happens.
 */
export default function ExceptionsReportScreen() {
  const route = useRoute<any>();
  const [filter, setFilter] = useState<string>('all');
  // A tile elsewhere (e.g. the manager's "Cancelled") can open this on one type.
  useEffect(() => { if (route.params?.filter) setFilter(route.params.filter); }, [route.params]);
  const [range, setRange] = useState<Range>(7);

  const load = useCallback(async () => {
    const to = isoLocal(new Date());
    const from = range === 1 ? to : daysAgo(range - 1);
    const [exc, ho] = await Promise.all([api.exceptions(from, to), api.handovers(from, to).catch(() => null)]);
    return { exceptions: (exc || []) as any[], handovers: (ho?.handovers || []) as any[] };
  }, [range]);
  const { data, error, loading, reload } = useReport<{ exceptions: any[]; handovers: any[] }>(load);

  const alert = useAppAlert();
  const [busy, setBusy] = useState(false);

  const all = (data?.exceptions || []).filter((e) => e.exception_type !== 'handover');
  // Open = still to look at; done = reviewed or dismissed (newest first).
  const rows = all.filter((e) => !e.review_outcome);
  const done = all.filter((e) => e.review_outcome)
    .sort((a, b) => String(b.reviewed_at).localeCompare(String(a.reviewed_at)));
  const reasons = new Map<string, string>(
    (data?.exceptions || []).filter((e) => e.exception_type === 'handover').map((e) => [e.job_no, e.handover_reason])
  );

  const review = async (outcome: 'reviewed' | 'dismissed', list: any[]) => {
    setBusy(true);
    try {
      await api.reviewExceptions(outcome, list.map((e) => ({ wash_id: e.id, exception_type: e.exception_type })));
      await reload();
    } catch (e: any) {
      alert("Couldn't save", e?.message || 'Please try again.');
    }
    setBusy(false);
  };
  const confirm = (outcome: 'reviewed' | 'dismissed', list: any[]) => {
    const n = list.length;
    const what = `${n} exception${n === 1 ? '' : 's'}`;
    alert(
      outcome === 'reviewed' ? `Mark ${what} reviewed?` : `Dismiss ${what}?`,
      outcome === 'reviewed'
        ? 'They move to Reviewed earlier and stop showing as alerts.'
        : 'They leave this list and stop showing as alerts. Use this for ones that need no follow-up.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: outcome === 'reviewed' ? 'Mark reviewed' : 'Dismiss', style: outcome === 'dismissed' ? 'destructive' : 'default', onPress: () => review(outcome, list) },
      ]
    );
  };
  const one = (e: any) => alert(
    `${typeOf(e.exception_type).title} · ${e.job_no}`,
    detail(e),
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Dismiss', style: 'destructive', onPress: () => review('dismissed', [e]) },
      { text: 'Mark reviewed', onPress: () => review('reviewed', [e]) },
    ]
  );
  const counts: Record<string, number> = {};
  rows.forEach((e) => { counts[e.exception_type] = (counts[e.exception_type] || 0) + 1; });
  const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
  const visible = filter === 'all' ? rows : rows.filter((e) => e.exception_type === filter);

  const byDay = new Map<string, any[]>();
  visible.forEach((e) => {
    const day = String(e.started_at || '').slice(0, 10) || 'Undated';
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push(e);
  });
  const days = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const word = range === 1 ? 'today' : range === 7 ? 'this week' : 'in the last 30 days';

  return (
    <AdminScreen
      title="Exceptions"
      subtitle={data ? `${rows.length} to review ${word}` : undefined}
      back
      loading={loading}
      onRefresh={reload}
    >
      <Chips>
        {RANGES.map((r) => <Chip key={r.value} label={r.label} on={range === r.value} onPress={() => setRange(r.value)} />)}
      </Chips>

      {error ? (
        <Card flush><Row leading={<IconChip icon="exclamation-triangle" tone="error" />} title="Couldn't load exceptions" sub={error} last /></Card>
      ) : (
        <>
          {rows.length > 0 ? (
            <Chips>
              <Chip label={`All ${rows.length}`} on={filter === 'all'} onPress={() => setFilter('all')} />
              {types.map((t) => (
                <Chip key={t} label={`${typeOf(t).chip} ${counts[t]}`} on={filter === t} onPress={() => setFilter(filter === t ? 'all' : t)} />
              ))}
            </Chips>
          ) : null}


          {rows.length === 0 ? (
            <Card flush>
              <Row leading={<IconChip icon="check" tone="success" />} title="All clear" sub={`No cancellations, disputes, reversals or unconfirmed payments ${word}`} last />
            </Card>
          ) : days.length === 0 ? (
            <Card flush><Row title="Nothing of this type" sub={`None ${word}`} last /></Card>
          ) : days.map(([day, list]) => (
            <React.Fragment key={day}>
              <Section title={dayTitle(day)} right={<Pill tone="neutral" label={String(list.length)} />} />
              <Card flush>
                {list.map((e, i) => {
                  const m = typeOf(e.exception_type);
                  return (
                    <Row
                      key={`${e.exception_type}-${e.id || i}`}
                      leading={<IconChip icon={m.icon} tone={m.tone} />}
                      title={m.title}
                      sub={`${detail(e)}\n${e.job_no} · ${e.branch_name}${e.starter_name ? ` · ${e.starter_name}` : ''}`}
                      trailing={<Text style={kitStyles.k}>{clock(e.started_at)}</Text>}
                      last={i === list.length - 1}
                      onPress={busy ? undefined : () => one(e)}
                    />
                  );
                })}
              </Card>
            </React.Fragment>
          ))}

          {visible.length > 0 ? (
            <Btns>
              <Btn title="Dismiss all" disabled={busy} onPress={() => confirm('dismissed', visible)} />
              <Btn primary title="Mark reviewed" disabled={busy} onPress={() => confirm('reviewed', visible)} />
            </Btns>
          ) : null}

          {done.length > 0 ? (
            <>
              <Section title="Reviewed earlier" right={<Pill tone="neutral" label={String(done.length)} />} />
              <Card flush>
                {done.slice(0, DONE_SHOWN).map((e, i, arr) => {
                  const m = typeOf(e.exception_type);
                  const when = dayTitle(String(e.reviewed_at).slice(0, 10));
                  return (
                    <Row
                      key={`done-${e.exception_type}-${e.id || i}`}
                      leading={<IconChip icon={m.icon} tone={m.tone} size={36} square />}
                      title={m.title}
                      sub={`${e.job_no} · ${e.review_outcome === 'dismissed' ? 'Dismissed' : 'Reviewed'}${e.reviewed_by_name ? ` by ${e.reviewed_by_name}` : ''} · ${when}`}
                      trailing={e.review_outcome === 'dismissed'
                        ? <Pill tone="neutral" label="Dismissed" />
                        : <LineIcon name="check" size={18} color={tint.success.fg} />}
                      last={i === arr.length - 1}
                    />
                  );
                })}
              </Card>
            </>
          ) : null}

          <Handovers list={data?.handovers || []} reasons={reasons} />
        </>
      )}
    </AdminScreen>
  );
}

/**
 * Jobs one worker started and another finished and got paid for. Empty until
 * a handover actually happens; then each reads "from → to", and only the
 * workers involved get a passed-on / took-over count.
 */
function Handovers({ list, reasons }: { list: any[]; reasons: Map<string, string> }) {
  const byWorker = new Map<string, { gave: number; took: number }>();
  list.forEach((h) => {
    const a = byWorker.get(h.starter_name) || { gave: 0, took: 0 };
    a.gave += 1;
    byWorker.set(h.starter_name, a);
    const b = byWorker.get(h.settler_name) || { gave: 0, took: 0 };
    b.took += 1;
    byWorker.set(h.settler_name, b);
  });
  const workers = [...byWorker.entries()].sort((a, b) => (b[1].gave + b[1].took) - (a[1].gave + a[1].took));

  return (
    <>
      <Section title="Handovers" right={list.length ? <Pill tone="info" label={String(list.length)} /> : undefined} />
      <Card flush>
        {list.length === 0 ? (
          <Row
            leading={<IconChip icon="exchange-alt" tone="primary" />}
            title="No handovers"
            sub="When a worker hands a car to someone else, it shows here as who passed it to whom"
            last
          />
        ) : list.map((h, i) => {
          const why = h.handover_reason || reasons.get(h.job_no);
          return (
            <Row
              key={h.id || i}
              leading={<IconChip icon="exchange-alt" tone="primary" />}
              title={`${h.starter_name} → ${h.settler_name}`}
              sub={`${h.job_no}${why ? ` · ${HANDOVER_REASON[why] || why}` : ''}`}
              trailing={<Amount>{Number(h.amount_ugx || 0).toLocaleString()}</Amount>}
              last={i === list.length - 1}
            />
          );
        })}
      </Card>
      {workers.length > 0 ? (
        <Card flush>
          {workers.map(([name, n], i) => (
            <Row
              key={name}
              leading={<IconChip icon="user" tone="info" />}
              title={name}
              sub={[n.gave ? `Passed on ${n.gave}` : '', n.took ? `Took over ${n.took}` : ''].filter(Boolean).join(' · ')}
              last={i === workers.length - 1}
            />
          ))}
        </Card>
      ) : null}
    </>
  );
}
