import type { PillTone } from '../../components/admin/kit';
import { compact, duration, minutesSince, sinceText, weekday, CASH_OVERDUE_HOURS } from './adminData';

export type AlertKind = 'stuck' | 'cash' | 'variance' | 'review';

/** One thing that needs the admin, and the page (and tab) that deals with it. */
export type AlertItem = {
  key: string;
  kind: AlertKind;
  branch?: string;
  tone: PillTone;
  pill: string;
  title: string;
  sub: string;
  go: string;
  params?: Record<string, string>;
};

/** The groups in the order they matter, as the Alerts page lists them. */
export const ALERT_GROUPS: { kind: AlertKind; title: string }[] = [
  { kind: 'stuck', title: 'Stuck cars' },
  { kind: 'cash', title: 'Cash held too long' },
  { kind: 'variance', title: 'Cash shortfalls' },
  { kind: 'review', title: 'Payments to review' },
];

/** What the alert list is built from: the stale report, wallets, variance and exceptions. */
export type AlertSource = { stale?: any; wallets?: any; variance?: any; exceptions?: any[] };

/**
 * Every alert, most urgent first within each kind. The Home shows the top
 * one of each kind; the Alerts page shows them all.
 */
export function buildAlerts(src: AlertSource, inBranch: (name?: string) => boolean = () => true): AlertItem[] {
  const out: AlertItem[] = [];

  const stuck = [...(src.stale?.long_in_progress || []), ...(src.stale?.stale_ready || [])]
    .filter((w: any) => inBranch(w.branch_name))
    .sort((a: any, b: any) => mins(b) - mins(a));
  stuck.forEach((w: any, i: number) => out.push({
    key: `stuck-${w.id || w.job_no || i}`, kind: 'stuck', branch: w.branch_name, tone: 'bad', pill: 'Stuck',
    go: 'Live Jobs', params: { view: 'stuck' },
    title: `${w.plate || w.job_no} idle ${duration(mins(w))}`,
    sub: [w.branch_name, w.minutes_ready ? 'washed, not paid' : w.vehicle_class_name].filter(Boolean).join(' · '),
  }));

  const staff: any[] = src.wallets?.staff || [];
  staff
    .filter((w) => Number(w.owes_ugx || 0) > 0 && inBranch(w.branch_name))
    .filter((w) => !w.last_handover_at || minutesSince(w.last_handover_at) >= CASH_OVERDUE_HOURS * 60)
    .sort((a, b) => Number(b.owes_ugx) - Number(a.owes_ugx))
    .forEach((w) => out.push({
      key: `cash-${w.staff_id}`, kind: 'cash', branch: w.branch_name, tone: 'warn', pill: 'Cash',
      go: 'Cash', params: { tab: 'unhanded' },
      title: `${w.full_name} holds ${compact(Number(w.owes_ugx))}`,
      sub: `${w.branch_name} · ${sinceText(w.last_handover_at)}`,
    }));

  (src.variance?.shifts || [])
    .filter((s: any) => Number(s.variance_ugx) < 0 && inBranch(s.branch_name))
    .sort((a: any, b: any) => Number(a.variance_ugx) - Number(b.variance_ugx))
    .forEach((s: any, i: number) => out.push({
      key: `variance-${s.shift_id || s.id || i}`, kind: 'variance', branch: s.branch_name, tone: 'warn', pill: 'Variance',
      go: 'Cash', params: { tab: 'variances' },
      title: `${s.branch_name} short by ${compact(Math.abs(Number(s.variance_ugx)))}`,
      sub: `Handover from ${weekday(String(s.date).slice(0, 10))} · ${s.worker_name}`,
    }));

  (src.exceptions || [])
    .filter((x: any) => (x.exception_type === 'unverified' || x.exception_type === 'dispute') && !x.review_outcome && inBranch(x.branch_name))
    .forEach((x: any, i: number) => out.push({
      key: `review-${x.exception_type}-${x.id || x.job_no || i}`, kind: 'review', branch: x.branch_name, tone: 'info', pill: 'Review',
      go: 'Live Jobs', params: { view: 'review' },
      title: `${x.job_no} ${x.exception_type === 'dispute' ? 'disputed' : 'payment not confirmed'}`,
      sub: [x.branch_name, x.starter_name].filter(Boolean).join(' · '),
    }));

  return out;
}

/** The Home's short list: the most urgent alert of each kind. */
export function topOfEachKind(all: AlertItem[]): AlertItem[] {
  return ALERT_GROUPS.map((g) => all.find((a) => a.kind === g.kind)).filter(Boolean) as AlertItem[];
}

function mins(w: any) {
  return Number(w.minutes_open || w.minutes_ready || 0);
}
