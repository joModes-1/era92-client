import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, radii, weight, tracking, Tone } from '../../theme';
import { ReportScreen, rangeLabel, today, weekAgo } from './reportHelpers';
import { Surface, SectionHeader, EmptyState, ListRow } from '../../components/ui';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';

// `explain` is shown as a one-line footnote wherever this type appears, so a
// manager never has to guess what a badge means from the word alone.
const TYPE_META: Record<string, { tone: Tone; icon: string; label: string; explain: string }> = {
  cancellation: {
    tone: 'error', icon: 'times-circle', label: 'Cancellation',
    explain: 'The wash was started, then cancelled before it was paid for.',
  },
  dispute: {
    tone: 'warning', icon: 'gavel', label: 'Dispute',
    explain: 'The customer disputed the amount or the work done.',
  },
  reversal: {
    tone: 'accent', icon: 'undo', label: 'Reversal',
    explain: 'A settled wash was reversed — the payment was undone.',
  },
  unverified: {
    tone: 'info', icon: 'question-circle', label: 'Unverified',
    explain: 'Cash was taken without scanning the customer\'s phone — no receipt was confirmed on their end.',
  },
  handover: {
    tone: 'primary', icon: 'exchange-alt', label: 'Handover',
    explain: 'One worker started the car; a different worker collected the payment.',
  },
};

const UNVERIFIED_REASON_LABEL: Record<string, string> = {
  dead_phone: 'Customer\'s phone was dead',
  no_app: 'Customer had no app / code',
  app_error: 'App error during scanning',
};

const HANDOVER_REASON_LABEL: Record<string, string> = {
  starter_off_shift: 'Starter had gone off shift',
  starter_on_break: 'Starter was on break',
  starter_phone_unusable: 'Starter\'s phone was unusable',
  starter_left_for_day: 'Starter had left for the day',
  other: 'Other reason',
};

const metaFor = (t: string) =>
  TYPE_META[t] || { tone: 'neutral' as Tone, icon: 'flag', label: (t || 'other').replace(/_/g, ' '), explain: '' };

/** Group exceptions by calendar day so the list reads as a timeline. */
function groupByDay(rows: any[]) {
  const map = new Map<string, any[]>();
  rows.forEach((r) => {
    const day = r.started_at?.slice(0, 10) || 'Unknown';
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(r);
  });
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function dayLabel(day: string) {
  if (day === 'Unknown') return 'Undated';
  const t = today();
  if (day === t) return 'Today';
  const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (day === y) return 'Yesterday';
  return new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function ExceptionsReportScreen() {
  const [filter, setFilter] = useState<string>('all');
  const from = weekAgo();
  const to = today();

  return (
    <ReportScreen
      title="Exceptions"
      subtitle={rangeLabel(from, to)}
      load={() => api.exceptions(from, to)}
      render={(data) => {
        if (!Array.isArray(data)) return null;
        if (data.length === 0) {
          return (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="check-circle" title="All clear" message="No exceptions were raised in this period." />
            </Surface>
          );
        }

        // Counts per type drive the filter chips.
        const counts: Record<string, number> = {};
        data.forEach((e: any) => { counts[e.exception_type] = (counts[e.exception_type] || 0) + 1; });
        const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

        const visible = filter === 'all' ? data : data.filter((e: any) => e.exception_type === filter);
        const days = groupByDay(visible);

        return (
          <View style={{ gap: spacing.lg }}>
            {/* Type breakdown — reads as a summary, doubles as a filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
              style={styles.chipScroll}
            >
              <Chip label="All" count={data.length} active={filter === 'all'} onPress={() => setFilter('all')} />
              {types.map((t) => {
                const m = metaFor(t);
                return (
                  <Chip
                    key={t}
                    label={m.label}
                    count={counts[t]}
                    tone={m.tone}
                    active={filter === t}
                    onPress={() => setFilter(filter === t ? 'all' : t)}
                  />
                );
              })}
            </ScrollView>

            {/* What the active filter's badge actually means, once, rather
                than trusting a single word on every card to be self-evident. */}
            {filter !== 'all' && metaFor(filter).explain ? (
              <View style={styles.explainRow}>
                <Icon name="info-circle" size={11} color={colors.textMuted} />
                <Text style={styles.explainText}>{metaFor(filter).explain}</Text>
              </View>
            ) : null}

            {days.length === 0 ? (
              <EmptyState icon="filter" title="Nothing matches" message="No exceptions of this type in the period." />
            ) : (
              days.map(([day, rows]) => (
                <View key={day}>
                  <SectionHeader title={dayLabel(day)} count={rows.length} />
                  <Surface elevation="sm" padded="sm">
                    {rows.map((e: any, i: number) => {
                      const m = metaFor(e.exception_type);
                      // A per-row detail beats a static blurb repeated on
                      // every card of the same type — this is the actual
                      // reason recorded for THIS job, when one was given.
                      const detail =
                        e.exception_type === 'unverified'
                          ? UNVERIFIED_REASON_LABEL[e.unverified_reason] || 'No reason recorded'
                          : e.exception_type === 'handover'
                          ? `${e.starter_name} → ${e.settler_name}${e.handover_reason ? ` · ${HANDOVER_REASON_LABEL[e.handover_reason] || e.handover_reason}` : ''}`
                          : undefined;

                      return (
                        <ListRow
                          key={i}
                          leading={m.icon}
                          leadingTone={m.tone}
                          title={`#${e.job_no}`}
                          subtitle={e.exception_type === 'handover' ? undefined : e.starter_name}
                          meta={detail}
                          last={i === rows.length - 1}
                          trailing={<Badge label={m.label} tone={m.tone} small />}
                        />
                      );
                    })}
                  </Surface>
                </View>
              ))
            )}
          </View>
        );
      }}
    />
  );
}

function Chip({
  label, count, active, tone: t = 'neutral', onPress,
}: { label: string; count: number; active: boolean; tone?: Tone; onPress: () => void }) {
  const accent = t === 'neutral' ? colors.primary : undefined;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
      <View style={[styles.chipCount, active && styles.chipCountActive]}>
        <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chipScroll: { marginHorizontal: -spacing.lg },
  chips: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.ink[900], borderColor: colors.ink[900] },
  chipText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary, letterSpacing: 0.1 },
  chipTextActive: { color: '#fff' },
  chipCount: {
    minWidth: 18, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: radii.full, backgroundColor: colors.bgSunken, alignItems: 'center',
  },
  chipCountActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  chipCountText: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textSecondary },
  chipCountTextActive: { color: '#fff' },

  explainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, marginTop: -spacing.sm, paddingHorizontal: spacing.xs },
  explainText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 16 },
});
