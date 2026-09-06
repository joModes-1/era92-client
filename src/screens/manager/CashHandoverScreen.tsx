import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import Badge from '../../components/Badge';
import ScreenHeader, { HeaderStat } from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import { useAppAlert } from '../../components/AppAlert';
import {
  Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet, initials,
} from '../../components/ui';

const ugx = (n: any) => Number(n || 0).toLocaleString();
const today = () => new Date().toISOString().slice(0, 10);

/** Cash held past a full day is the org admin's risk line, not just a delay. */
const OVERDUE_HOURS = 24;

/** Cash the worker is holding right now — live for open days, final once closed. */
function heldBy(s: any): number {
  return Number(s.status === 'closed' ? s.expected_cash_ugx : s.live_expected_cash_ugx || 0);
}

function ageLabel(hours: number) {
  if (hours < 1) return 'Just started';
  if (hours < 24) return `${Math.floor(hours)}h`;
  const d = Math.floor(hours / 24);
  return `${d} day${d === 1 ? '' : 's'}`;
}

export default function CashHandoverScreen() {
  const alert = useAppAlert();
  const { actor } = useAuth();
  // An org admin oversees several branches and does not stand at a till; a
  // manager is the person who physically takes the notes. Same data, two
  // different jobs — so the org admin gets a read-only position view broken
  // down by branch, and the manager keeps the collect action.
  const isOrgAdmin = actor?.role === 'orgadmin';

  const [shifts, setShifts] = useState<any[]>([]);
  const [position, setPosition] = useState<{ holding: any[]; collected_today: any[] }>({
    holding: [], collected_today: [],
  });
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [target, setTarget] = useState<any>(null);
  const [counted, setCounted] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (isOrgAdmin) {
      try {
        const data = await api.cashPosition();
        setPosition({ holding: data?.holding || [], collected_today: data?.collected_today || [] });
      } catch {}
      return;
    }
    try {
      const data = await api.listShifts({ from: today(), to: today() });
      setShifts(Array.isArray(data) ? data : []);
    } catch {}
  }, [isOrgAdmin]);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openCount = (s: any) => {
    setTarget(s);
    setCounted('');
    setNotes('');
  };

  const submit = async () => {
    if (!target) return;
    const n = parseInt(counted, 10);
    if (isNaN(n) || n < 0) {
      alert('Enter an amount', 'Type how much money you actually received.');
      return;
    }
    setSaving(true);
    try {
      await api.closeShift(target.id, n, notes.trim() || undefined);
      const diff = n - heldBy(target);
      setTarget(null);
      await load();
      alert(
        'Money received',
        diff === 0
          ? `${target.worker_name}'s day is closed and the cash balances exactly.`
          : `${target.worker_name}'s day is closed.\n\n${Math.abs(diff).toLocaleString()} UGX ${diff < 0 ? 'SHORT' : 'EXTRA'} — this shows on the Cash Variance report.`
      );
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (/in-progress|IN_PROGRESS/i.test(msg)) {
        alert('They still have a car', 'This worker has a car still being washed. It must be finished first.');
      } else if (/CANNOT_CLOSE_OWN/i.test(msg)) {
        alert('Not your own day', 'You cannot close your own day. An org admin has to do it.');
      } else {
        alert('Could not close', msg);
      }
    }
    setSaving(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title={isOrgAdmin ? 'Cash Position' : 'Cash Handover'} />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={4} showHeader={false} /></ScrollView>
      </View>
    );
  }

  return isOrgAdmin
    ? <OrgAdminView position={position} refreshing={refreshing} onRefresh={onRefresh} />
    : (
      <ManagerView
        shifts={shifts}
        refreshing={refreshing}
        onRefresh={onRefresh}
        openCount={openCount}
        target={target}
        setTarget={setTarget}
        counted={counted}
        setCounted={setCounted}
        notes={notes}
        setNotes={setNotes}
        saving={saving}
        submit={submit}
      />
    );
}

// ═══════════════════════════════════════════════════════════════
// Org admin — oversight. No collect button: they are not at the till.
// ═══════════════════════════════════════════════════════════════

function OrgAdminView({
  position, refreshing, onRefresh,
}: { position: { holding: any[]; collected_today: any[] }; refreshing: boolean; onRefresh: () => void }) {
  const holding = position.holding.filter((h) => Number(h.held_ugx || 0) > 0);
  const idle = position.holding.filter((h) => Number(h.held_ugx || 0) <= 0);

  const heldTotal = holding.reduce((s, h) => s + Number(h.held_ugx || 0), 0);
  const collectedTotal = position.collected_today.reduce((s, r) => s + Number(r.collected_ugx || 0), 0);
  const overdue = holding.filter((h) => Number(h.hours_held || 0) >= OVERDUE_HOURS);

  // Group by branch — an org admin thinks in branches, not in individual
  // shift rows, and the per-branch subtotal is the number they act on.
  const byBranch = useMemo(() => {
    const map = new Map<string, { name: string; code: string; rows: any[]; total: number; overdue: number }>();
    holding.forEach((h) => {
      const key = h.branch_id;
      if (!map.has(key)) {
        map.set(key, { name: h.branch_name, code: h.branch_code, rows: [], total: 0, overdue: 0 });
      }
      const g = map.get(key)!;
      g.rows.push(h);
      g.total += Number(h.held_ugx || 0);
      if (Number(h.hours_held || 0) >= OVERDUE_HOURS) g.overdue += 1;
    });
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [holding]);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Cash Position" subtitle="Across every branch">
        <HeaderStat label="Out with workers" value={ugx(heldTotal)} icon="hourglass-half" />
        <HeaderStat label="In today" value={ugx(collectedTotal)} icon="check-circle" />
      </ScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {/* The one thing an owner should be told without asking */}
        <Surface
          elevation="sm"
          tone={overdue.length > 0 ? colors.errorSoft : heldTotal > 0 ? colors.warningSoft : colors.successSoft}
          borderless
          style={styles.banner}
        >
          <Icon
            name={overdue.length > 0 ? 'exclamation-triangle' : heldTotal > 0 ? 'hourglass-half' : 'check-circle'}
            size={14}
            color={overdue.length > 0 ? colors.error : heldTotal > 0 ? colors.warning : colors.success}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.bannerTitle,
                { color: overdue.length > 0 ? colors.error : heldTotal > 0 ? colors.warning : colors.success },
              ]}
            >
              {overdue.length > 0
                ? `UGX ${ugx(overdue.reduce((s, h) => s + Number(h.held_ugx || 0), 0))} held over 24 hours`
                : heldTotal > 0
                ? `UGX ${ugx(heldTotal)} still with ${holding.length} worker${holding.length === 1 ? '' : 's'}`
                : 'No cash outstanding'}
            </Text>
            <Text style={styles.bannerSub}>
              {overdue.length > 0
                ? `${overdue.length} worker${overdue.length === 1 ? '' : 's'} — your branch managers collect this`
                : heldTotal > 0
                ? 'Normal — managers collect at the end of each day'
                : 'Every worker has handed in'}
            </Text>
          </View>
        </Surface>

        {/* Money out, grouped by branch */}
        {byBranch.length > 0 && (
          <View>
            <SectionHeader title="Money still with workers" count={holding.length} icon="hourglass-half" />
            <View style={{ gap: spacing.sm }}>
              {byBranch.map((g) => (
                <Surface key={g.code} elevation="sm" style={styles.branchCard}>
                  <View style={styles.branchHead}>
                    <View style={styles.codeTag}><Text style={styles.codeTagText}>{g.code}</Text></View>
                    <Text style={styles.branchName} numberOfLines={1}>{g.name}</Text>
                    <Text style={styles.branchTotal}>{ugx(g.total)}</Text>
                  </View>

                  {g.rows
                    .slice()
                    .sort((a, b) => Number(b.held_ugx) - Number(a.held_ugx))
                    .map((h) => {
                      const hrs = Number(h.hours_held || 0);
                      const late = hrs >= OVERDUE_HOURS;
                      return (
                        <View key={h.id} style={styles.workerRow}>
                          <View style={[styles.avatarSm, late && styles.avatarLate]}>
                            <Text style={[styles.avatarSmText, late && { color: colors.error }]}>
                              {initials(h.worker_name)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.workerName} numberOfLines={1}>{h.worker_name}</Text>
                            <Text style={styles.workerMeta} numberOfLines={1}>
                              {Number(h.settled_count || 0)} car{Number(h.settled_count) === 1 ? '' : 's'} · holding {ageLabel(hrs)}
                            </Text>
                          </View>
                          {late && <Badge label="Over 24h" tone="error" small />}
                          <Text style={styles.workerAmount}>{ugx(h.held_ugx)}</Text>
                        </View>
                      );
                    })}

                  {g.overdue > 0 && (
                    <Text style={styles.branchWarn}>
                      {g.overdue} of these {g.overdue === 1 ? 'has' : 'have'} been held over a day — ask this branch's manager.
                    </Text>
                  )}
                </Surface>
              ))}
            </View>
          </View>
        )}

        {/* Money in, today, per branch */}
        <View>
          <SectionHeader title="Handed in today" count={position.collected_today.length} icon="check-circle" />
          {position.collected_today.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="coins" title="Nothing handed in yet" message="Collections appear here as managers record them." />
            </Surface>
          ) : (
            <Surface elevation="sm" padded="lg" style={{ gap: spacing.md }}>
              {position.collected_today.map((r: any, i: number) => {
                const v = Number(r.variance_ugx || 0);
                return (
                  <View key={i} style={styles.collectRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.collectBranch} numberOfLines={1}>{r.branch_name}</Text>
                      <Text style={styles.collectMeta}>
                        {r.handovers} handover{Number(r.handovers) === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.collectAmount}>{ugx(r.collected_ugx)}</Text>
                      {v !== 0 && (
                        <Text style={[styles.collectVar, { color: v < 0 ? colors.error : colors.warning }]}>
                          {Math.abs(v).toLocaleString()} {v < 0 ? 'short' : 'extra'}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </Surface>
          )}
        </View>

        {/* Workers who are on shift but have taken nothing — context, not alarm */}
        {idle.length > 0 && (
          <View>
            <SectionHeader title="On shift, no cash yet" count={idle.length} icon="user-clock" />
            <Surface elevation="sm" padded="lg">
              <Text style={styles.idleText} numberOfLines={3}>
                {idle.map((h) => h.worker_name).join(', ')}
              </Text>
            </Surface>
          </View>
        )}

        <View style={styles.hint}>
          <Icon name="info-circle" size={11} color={colors.textMuted} />
          <Text style={styles.hintText}>
            This is a view only. Branch managers physically receive the cash and record it on their own
            Cash Handover screen — that keeps one person accountable per handover.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Manager — the person who actually takes the money.
// ═══════════════════════════════════════════════════════════════

function ManagerView({
  shifts, refreshing, onRefresh, openCount,
  target, setTarget, counted, setCounted, notes, setNotes, saving, submit,
}: any) {
  const pending = shifts.filter((s: any) => s.status !== 'closed');
  const received = shifts.filter((s: any) => s.status === 'closed');
  const owed = pending.reduce((sum: number, s: any) => sum + heldBy(s), 0);
  const collected = received.reduce((sum: number, s: any) => sum + Number(s.counted_cash_ugx || 0), 0);

  const renderPending = (s: any) => {
    const held = heldBy(s);
    return (
      <Surface key={s.id} elevation="sm" style={styles.card}>
        <View style={styles.head}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials(s.worker_name)}</Text>
          </View>
          <View style={styles.who}>
            <Text style={styles.name} numberOfLines={1}>{s.worker_name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {Number(s.settled_count || 0)} car{Number(s.settled_count) === 1 ? '' : 's'} · {s.branch_name}
            </Text>
          </View>
          <Badge
            label={s.status === 'pending_close' ? 'Ready to hand in' : 'Still working'}
            tone={s.status === 'pending_close' ? 'warning' : 'success'}
            dot
            small
          />
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>SHOULD HAND IN</Text>
          <Text style={styles.amountValue}>UGX {ugx(held)}</Text>
        </View>

        <GradientButton
          title="I received the money"
          onPress={() => openCount(s)}
          icon="hand-holding-usd"
          full
        />
      </Surface>
    );
  };

  const renderReceived = (s: any) => {
    const variance = Number(s.variance_ugx || 0);
    return (
      <Surface key={s.id} elevation="sm" style={styles.card}>
        <View style={styles.head}>
          <View style={[styles.avatar, styles.avatarDone]}>
            <Icon name="check" size={13} color={colors.success} />
          </View>
          <View style={styles.who}>
            <Text style={styles.name} numberOfLines={1}>{s.worker_name}</Text>
            <Text style={styles.meta}>Handed in UGX {ugx(s.counted_cash_ugx)}</Text>
          </View>
          {variance === 0 ? (
            <Badge label="Balanced" tone="success" small />
          ) : (
            <Badge
              label={`${Math.abs(variance).toLocaleString()} ${variance < 0 ? 'short' : 'extra'}`}
              tone={variance < 0 ? 'error' : 'warning'}
              small
            />
          )}
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Cash Handover" subtitle="Today">
        <HeaderStat label="Still to collect" value={ugx(owed)} icon="hourglass-half" />
        <HeaderStat label="Collected" value={ugx(collected)} icon="check-circle" />
      </ScreenHeader>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {shifts.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="coins" title="Nobody has worked today" message="Worker days appear here as they start." />
          </Surface>
        ) : (
          <>
            {pending.length > 0 && (
              <View>
                <SectionHeader title="Money still with workers" count={pending.length} icon="hourglass-half" />
                <View style={{ gap: spacing.sm }}>{pending.map(renderPending)}</View>
              </View>
            )}

            {received.length > 0 && (
              <View>
                <SectionHeader title="Money received" count={received.length} icon="check-circle" />
                <View style={{ gap: spacing.sm }}>{received.map(renderReceived)}</View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <FormSheet
        visible={!!target}
        onClose={() => setTarget(null)}
        title="Count the money"
        subtitle={target?.worker_name}
        submitLabel="Confirm received"
        onSubmit={submit}
        submitting={saving}
      >
        {target ? (
          <Surface elevation="none" tone={colors.bgSunken} borderless style={styles.expected}>
            <Text style={styles.expectedLabel}>THEY SHOULD HAND IN</Text>
            <Text style={styles.expectedValue}>UGX {ugx(heldBy(target))}</Text>
          </Surface>
        ) : null}

        <Field
          label="Money you actually received"
          required
          prefix="UGX"
          value={counted}
          onChangeText={setCounted}
          keyboardType="numeric"
          placeholder="0"
        />

        {/* Live difference so a shortfall is obvious before confirming */}
        {counted !== '' && target ? (
          (() => {
            const diff = (parseInt(counted, 10) || 0) - heldBy(target);
            const tone = diff === 0 ? colors.success : diff < 0 ? colors.error : colors.warning;
            const bg = diff === 0 ? colors.successSoft : diff < 0 ? colors.errorSoft : colors.warningSoft;
            return (
              <View style={[styles.diff, { backgroundColor: bg }]}>
                <Icon
                  name={diff === 0 ? 'check-circle' : diff < 0 ? 'arrow-down' : 'arrow-up'}
                  size={12}
                  color={tone}
                />
                <Text style={[styles.diffText, { color: tone }]}>
                  {diff === 0
                    ? 'Balances exactly'
                    : `${Math.abs(diff).toLocaleString()} UGX ${diff < 0 ? 'short' : 'extra'}`}
                </Text>
              </View>
            );
          })()
        ) : null}

        <Field
          label="Note"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Short by 2,000 — will bring tomorrow"
          multiline
          hint="Recorded against this handover."
          style={{ marginBottom: 0 }}
        />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bannerTitle: { fontSize: font.regular, fontWeight: weight.heavy, letterSpacing: tracking.tight },
  bannerSub: { fontSize: font.xs, color: colors.textSecondary, marginTop: 1 },

  branchCard: { gap: spacing.sm },
  branchHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeTag: { backgroundColor: colors.ink[900], borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  codeTagText: { fontSize: font.micro, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.caps },
  branchName: { flex: 1, fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  branchTotal: { fontSize: font.regular, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },

  workerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight,
  },
  avatarSm: {
    width: 28, height: 28, borderRadius: radii.full, backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLate: { backgroundColor: colors.errorSoft },
  avatarSmText: { fontSize: font.micro, fontWeight: weight.black, color: colors.primary },
  workerName: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  workerMeta: { fontSize: font.micro, color: colors.textMuted, marginTop: 1 },
  workerAmount: { fontSize: font.sm, fontWeight: weight.black, color: colors.text, minWidth: 58, textAlign: 'right' },
  branchWarn: { fontSize: font.micro, color: colors.error, fontWeight: weight.semibold, lineHeight: 15 },

  collectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  collectBranch: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.text },
  collectMeta: { fontSize: font.micro, color: colors.textMuted, marginTop: 1 },
  collectAmount: { fontSize: font.regular, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  collectVar: { fontSize: font.micro, fontWeight: weight.heavy, marginTop: 1 },

  idleText: { fontSize: font.xs, color: colors.textSecondary, lineHeight: 18 },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs },
  hintText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },

  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 38, height: 38, borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarDone: { backgroundColor: colors.successSoft },
  avatarText: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.primary },
  who: { flex: 1, gap: 2 },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  meta: { fontSize: font.xs, color: colors.textMuted },

  amountRow: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    backgroundColor: colors.bgSunken, borderRadius: radii.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
  },
  amountLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  amountValue: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },

  expected: { alignItems: 'center', gap: 3, marginBottom: spacing.lg },
  expectedLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  expectedValue: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },

  diff: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderRadius: radii.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    marginTop: -spacing.sm, marginBottom: spacing.lg,
  },
  diffText: { fontSize: font.sm, fontWeight: weight.heavy },
});
