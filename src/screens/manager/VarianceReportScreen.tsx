import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, spacing, weight, staffType, staffText } from '../../theme';
import { ReportScreen, rangeLabel, today, weekAgo } from './reportHelpers';
import { Surface, SectionHeader, EmptyState, Avatar } from '../../components/ui';
import { HeaderStat } from '../../components/ScreenHeader';

/**
 * Cash Variance — where counted cash didn't match what was expected.
 *
 * Laid out like a cash drawer report (Toast, Square — STAFF-UI-SPEC.md §4):
 * every shift shows Expected, then Counted, then the result with the WORD
 * first — "Short UGX 3,000", "Over UGX 500" — never a bare signed number,
 * which reads both ways (Toast itself defines difference as expected −
 * actual). Above the shifts, one line per worker adds their shifts up, so
 * a pattern shows without a chart of a hundred bars.
 */

const ugx = (n: any) => `UGX ${Math.abs(Number(n || 0)).toLocaleString()}`;
const word = (v: number) => (v < 0 ? 'Short' : v > 0 ? 'Over' : 'Exact');
const toneOf = (v: number) => (v < 0 ? colors.errorText : v > 0 ? colors.successText : staffText.secondary);
const dayLabel = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

export default function VarianceReportScreen() {
  const from = weekAgo();
  const to = today();

  return (
    <ReportScreen
      title="Cash Variance"
      subtitle={rangeLabel(from, to)}
      load={() => api.cashVariance(from, to)}
      headerRail={(data) =>
        !data?.summary ? null : (
          <>
            <HeaderStat label="Shifts short" value={Number(data.summary.shortfall_count || 0)} icon="arrow-down" />
            <HeaderStat label="Shifts over" value={Number(data.summary.surplus_count || 0)} icon="arrow-up" />
          </>
        )
      }
      render={(data) => {
        if (!data?.summary) return null;
        const shifts: any[] = data.shifts || [];
        const net = shifts.reduce((s: number, x: any) => s + Number(x.variance_ugx || 0), 0);

        // Per worker: shifts added up, biggest gap first.
        const byWorker = new Map<string, { name: string; net: number; count: number }>();
        shifts.forEach((s) => {
          const k = s.worker_id || s.worker_name;
          const w = byWorker.get(k) || { name: s.worker_name, net: 0, count: 0 };
          w.net += Number(s.variance_ugx || 0);
          w.count += 1;
          byWorker.set(k, w);
        });
        const workers = [...byWorker.values()].sort((a, b) => Math.abs(b.net) - Math.abs(a.net));

        return (
          <View style={{ gap: spacing.lg }}>
            {/* Net position — the manager's real question, word first */}
            <Surface elevation="sm" padded="lg" style={{ gap: 2 }}>
              <Text style={styles.caption}>All shifts, last 7 days</Text>
              <Text style={[styles.hero, { color: toneOf(net) }]}>
                {net === 0 ? 'Exact' : `${word(net)} ${ugx(net)}`}
              </Text>
              <Text style={styles.sub}>
                {shifts.length === 0
                  ? 'Every closed shift balanced.'
                  : `${shifts.length} shift${shifts.length === 1 ? '' : 's'} didn't match · ${ugx(data.summary.total_shortfall)} short, ${ugx(data.summary.total_surplus)} over`}
              </Text>
            </Surface>

            {shifts.length === 0 ? (
              <Surface elevation="sm" padded="lg">
                <EmptyState icon="balance-scale" title="Every shift balanced" message="No cash differences in the last 7 days." />
              </Surface>
            ) : (
              <>
                <View>
                  <SectionHeader title="By worker" count={workers.length} />
                  <Surface elevation="sm" padded="sm" style={styles.listCard}>
                    {workers.map((w, i) => (
                      <View key={w.name + i} style={[styles.row, i < workers.length - 1 && styles.divider]}>
                        <Avatar name={w.name} size={36} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.name} numberOfLines={1}>{w.name}</Text>
                          <Text style={styles.meta}>{w.count} shift{w.count === 1 ? '' : 's'} didn't match</Text>
                        </View>
                        <Text style={[styles.result, { color: toneOf(w.net) }]}>
                          {w.net === 0 ? 'Exact' : `${word(w.net)} ${ugx(w.net)}`}
                        </Text>
                      </View>
                    ))}
                  </Surface>
                </View>

                <View>
                  <SectionHeader title="By shift" count={shifts.length} />
                  <View style={{ gap: spacing.sm }}>
                    {shifts.map((s: any, i: number) => {
                      const v = Number(s.variance_ugx || 0);
                      const counted = s.counted_cash_ugx;
                      return (
                        <Surface key={s.id || i} elevation="xs" padded="sm" style={{ gap: spacing.sm }}>
                          <View style={styles.shiftHead}>
                            <Text style={styles.name} numberOfLines={1}>{s.worker_name}</Text>
                            <Text style={styles.meta}>{dayLabel(s.date)}{s.branch_name ? ` · ${s.branch_name}` : ''}</Text>
                          </View>
                          <View style={styles.line}>
                            <Text style={styles.lineLabel}>Expected</Text>
                            <Text style={styles.lineValue}>{ugx(s.expected_cash_ugx)}</Text>
                          </View>
                          <View style={styles.line}>
                            <Text style={styles.lineLabel}>Counted</Text>
                            {/* Not counted is never shown as 0 (Toast drawer reports). */}
                            <Text style={styles.lineValue}>{counted == null ? 'Not counted' : ugx(counted)}</Text>
                          </View>
                          <View style={[styles.line, styles.lineTotal]}>
                            <Text style={[styles.lineLabel, { color: colors.text, fontWeight: weight.semibold }]}>Result</Text>
                            <Text style={[styles.result, { color: toneOf(v) }]}>{v === 0 ? 'Exact' : `${word(v)} ${ugx(v)}`}</Text>
                          </View>
                        </Surface>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  caption: { ...staffType.caption, color: staffText.secondary },
  hero: { ...staffType.hero, fontSize: 30, lineHeight: 36 },
  sub: { ...staffType.meta, color: staffText.secondary, marginTop: 2 },

  listCard: { paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, minHeight: 56 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  name: { ...staffType.rowTitle, fontSize: 16 },
  meta: { ...staffType.meta },
  result: { ...staffType.label, ...staffType.tabular, fontWeight: weight.bold },

  shiftHead: { gap: 1 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  lineLabel: { ...staffType.secondary },
  lineValue: { ...staffType.label, ...staffType.tabular, fontWeight: weight.regular },
  lineTotal: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight, paddingTop: spacing.sm,
  },
});
