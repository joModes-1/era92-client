import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { api } from '../../api';
import { colors, radii, spacing, weight, Tone, tone as toneMap, staffType, staffText, orgBg } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader from '../../components/ScreenHeader';
import { Surface, EmptyState, SkeletonList } from '../../components/ui';

/**
 * Audit Log — who changed what, written as sentences (STAFF-UI-SPEC.md §5,
 * from GitHub's and Atlassian's audit logs and Shopify's Timeline):
 *
 *  - each entry is a sentence with the person first — "Grace N. changed a
 *    price: UGX 20,000 → 25,000" — not an event key like "Price Update";
 *  - grouped by day, with filter chips by kind (prices, points, staff,
 *    money, settings);
 *  - the same person doing the same thing several times in a row collapses
 *    into one line ("×5"), so routine saves don't bury the rest;
 *  - tap an entry to see exactly what changed, before → after.
 */

type Kind = 'all' | 'prices' | 'points' | 'staff' | 'money' | 'settings';
const KINDS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'prices', label: 'Prices' },
  { value: 'points', label: 'Points' },
  { value: 'staff', label: 'Staff' },
  { value: 'money', label: 'Money' },
  { value: 'settings', label: 'Settings' },
];

const ugx = (n: any) => `UGX ${Number(n || 0).toLocaleString()}`;
const parse = (v: any) => {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return null; }
};

function kindOf(action: string): Kind {
  if (action.startsWith('price')) return 'prices';
  if (action.includes('points')) return 'points';
  if (action.startsWith('staff') || action.startsWith('orgadmin')) return 'staff';
  if (action.startsWith('wallet') || /correct|reverse|dispute|wash/.test(action)) return 'money';
  return 'settings';
}

const KIND_META: Record<Kind, { icon: string; tone: Tone }> = {
  all: { icon: 'circle', tone: 'neutral' },
  prices: { icon: 'tags', tone: 'primary' },
  points: { icon: 'star', tone: 'accent' },
  staff: { icon: 'user', tone: 'info' },
  money: { icon: 'coins', tone: 'success' },
  settings: { icon: 'sliders-h', tone: 'neutral' },
};

/** The entry as a sentence, from what the server recorded before and after. */
function sentence(log: any): string {
  const who = log.actor_name || 'The system';
  const before = parse(log.before) || {};
  const after = parse(log.after) || {};
  switch (log.action) {
    case 'price.update':
      return before.price_ugx != null
        ? `${who} changed a price${after.branch_id ? ' for one branch' : ''}: ${ugx(before.price_ugx)} → ${ugx(after.price_ugx)}`
        : `${who} set a new price${after.branch_id ? ' for one branch' : ''}: ${ugx(after.price_ugx)}`;
    case 'client_points_config.updated':
    case 'worker_points_config.updated': {
      const whose = log.action.startsWith('client') ? 'client' : 'worker';
      if (before.active != null && after.active != null && before.active !== after.active) {
        return `${who} turned ${whose} points ${after.active ? 'on' : 'off'}`;
      }
      if (before.point_value_ugx != null && after.point_value_ugx != null && Number(before.point_value_ugx) !== Number(after.point_value_ugx)) {
        return `${who} changed what a ${whose} point is worth: ${ugx(before.point_value_ugx)} → ${ugx(after.point_value_ugx)}`;
      }
      return `${who} changed the ${whose} points settings`;
    }
    case 'dispatch_config.updated':
      return after.accept_window_seconds != null && before.accept_window_seconds != null
        && Number(after.accept_window_seconds) !== Number(before.accept_window_seconds)
        ? `${who} changed how long a car waits before it is assigned: ${before.accept_window_seconds}s → ${after.accept_window_seconds}s`
        : `${who} changed how cars are handed to workers`;
    case 'client_points.adjusted': {
      const p = Number(after.points ?? after.points_delta ?? 0);
      return `${who} ${p >= 0 ? 'added' : 'took off'} ${Math.abs(p).toLocaleString()} points for a client${after.reason ? ` — "${after.reason}"` : ''}`;
    }
    case 'staff.created':
      return `${who} added a new ${after.role || 'staff member'}${after.username ? ` (${after.username})` : ''}`;
    case 'orgadmin.created':
      return `${who} added an org admin`;
    case 'staff.pin_set':
      return `${who} set a staff member's PIN`;
    case 'staff.password_reset':
      return `${who} reset a staff member's password`;
    case 'staff.reset_password_refused':
      return `${who} was refused a password reset`;
    case 'wallet.cash_handover':
      return `${who} confirmed receiving ${ugx(after.amount_ugx)} in cash from a worker`;
    case 'wallet.adjusted': {
      const amt = Number(after.amount_ugx || 0);
      return `${who} ${amt >= 0 ? 'added' : 'took'} ${ugx(Math.abs(amt))} ${amt >= 0 ? 'to' : 'off'} a worker's wallet${after.reason ? ` — "${after.reason}"` : ''}`;
    }
    case 'loyalty_config.updated':
      return `${who} changed the loyalty settings`;
    case 'org.created': return `${who} created the organisation`;
    case 'org.suspended': return `${who} suspended the organisation`;
    case 'org.activated': return `${who} reactivated the organisation`;
    case 'org.payment_recorded': return `${who} recorded a payment${after.amount_ugx ? ` of ${ugx(after.amount_ugx)}` : ''}`;
    case 'org.subscription_updated': return `${who} changed the subscription`;
    default:
      if (/reverse/.test(log.action)) return `${who} reversed a wash`;
      if (/correct/.test(log.action)) return `${who} corrected a wash's price`;
      if (/dispute/.test(log.action)) return `${who} resolved a dispute`;
      return `${who}: ${log.action.replace(/[._]/g, ' ')}`;
  }
}

/** Before → after, one line per field that changed. */
function changes(log: any): string[] {
  const before = parse(log.before) || {};
  const after = parse(log.after) || {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const show = (v: any) => (v == null ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v));
  return keys
    // Internal ids mean nothing to an owner reading the log.
    .filter((k) => !/(^id$|_id$)/.test(k))
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map((k) => `${k.replace(/_/g, ' ')}: ${show(before[k])} → ${show(after[k])}`);
}

const dayKey = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toDateString();
};
function dayLabel(key: string) {
  if (!key) return 'Undated';
  if (key === new Date().toDateString()) return 'Today';
  if (key === new Date(Date.now() - 86400000).toDateString()) return 'Yesterday';
  return new Date(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

export default function AuditLogScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [kind, setKind] = useState<Kind>('all');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getAuditLogs({ limit: 200 });
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
      <View style={[styles.container, orgBg()]}>
        <ScreenHeader title="Audit Log" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={7} showHeader={false} /></ScrollView>
      </View>
    );
  }

  const counts = new Map<Kind, number>();
  logs.forEach((l) => { const k = kindOf(l.action); counts.set(k, (counts.get(k) || 0) + 1); });
  const visible = kind === 'all' ? logs : logs.filter((l) => kindOf(l.action) === kind);

  // Collapse runs: same person, same action, same day, one after another.
  type Entry = { first: any; items: any[] };
  const entries: Entry[] = [];
  visible.forEach((l) => {
    const prev = entries[entries.length - 1];
    if (prev && prev.first.action === l.action && prev.first.actor_id === l.actor_id
      && dayKey(prev.first.created_at) === dayKey(l.created_at)) prev.items.push(l);
    else entries.push({ first: l, items: [l] });
  });
  const days: [string, Entry[]][] = [];
  entries.forEach((e) => {
    const k = dayKey(e.first.created_at);
    const last = days[days.length - 1];
    if (last && last[0] === k) last[1].push(e);
    else days.push([k, [e]]);
  });

  return (
    <View style={[styles.container, orgBg()]}>
      <ScreenHeader title="Audit Log" subtitle={`${total.toLocaleString()} changes · last 30 days`} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipScroll}>
          {KINDS.filter((k) => k.value === 'all' || counts.get(k.value)).map((k) => {
            const on = kind === k.value;
            const n = k.value === 'all' ? logs.length : counts.get(k.value) || 0;
            return (
              <TouchableOpacity
                key={k.value}
                onPress={() => setKind(k.value)}
                style={[styles.chip, on && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{k.label} {n}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {visible.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="shield-alt" title="Nothing recorded" message="Changes to prices, points, staff and money are logged here." />
          </Surface>
        ) : (
          days.map(([day, list]) => (
            <View key={day}>
              <Text style={styles.day}>{dayLabel(day)}</Text>
              <Surface elevation="sm" padded="sm" style={styles.listCard}>
                {list.map((e, i) => {
                  const m = KIND_META[kindOf(e.first.action)];
                  const many = e.items.length > 1;
                  const isOpen = open === e.first.id;
                  const diff = changes(e.first);
                  const lastTime = timeOf(e.items[e.items.length - 1].created_at);
                  return (
                    <TouchableOpacity
                      key={e.first.id}
                      activeOpacity={0.75}
                      onPress={() => setOpen(isOpen ? null : e.first.id)}
                      style={[styles.entry, i < list.length - 1 && styles.divider]}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                    >
                      <View style={[styles.entryIcon, { backgroundColor: toneMap[m.tone].bg }]}>
                        <Icon name={m.icon} size={16} color={toneMap[m.tone].fg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.entryText}>
                          {sentence(e.first)}
                          {many ? <Text style={styles.times}>{`  ×${e.items.length}`}</Text> : null}
                        </Text>
                        <Text style={styles.entryTime}>
                          {many ? `${lastTime} – ${timeOf(e.first.created_at)}` : timeOf(e.first.created_at)}
                        </Text>
                        {isOpen ? (
                          <View style={styles.detail}>
                            {diff.length > 0
                              ? diff.map((line) => <Text key={line} style={styles.detailLine}>{line}</Text>)
                              : <Text style={styles.detailLine}>No before/after details were recorded.</Text>}
                            {many ? <Text style={styles.detailNote}>Showing the latest of {e.items.length} changes.</Text> : null}
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
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
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  chipScroll: { marginHorizontal: -spacing.lg },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  chip: {
    minHeight: 40, paddingHorizontal: spacing.md, justifyContent: 'center',
    borderRadius: radii.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...staffType.label, ...staffType.tabular, fontSize: 14, color: staffText.secondary },
  chipTextOn: { color: '#fff' },

  day: { ...staffType.caption, marginTop: spacing.sm, marginBottom: spacing.sm, marginLeft: 2 },
  listCard: { paddingHorizontal: spacing.md },
  entry: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  entryIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  entryText: { ...staffType.secondary, color: colors.text },
  times: { fontWeight: weight.bold, color: staffText.secondary },
  entryTime: { ...staffType.meta, ...staffType.tabular, marginTop: 2 },
  detail: {
    marginTop: spacing.sm, padding: spacing.sm, gap: 2,
    backgroundColor: colors.bg, borderRadius: radii.sm,
  },
  detailLine: { ...staffType.meta, color: staffText.secondary },
  detailNote: { ...staffType.meta, fontStyle: 'italic' },
});
