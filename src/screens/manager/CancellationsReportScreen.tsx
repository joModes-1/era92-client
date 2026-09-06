import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking } from '../../theme';
import { ReportScreen, rangeLabel, today, weekAgo } from './reportHelpers';
import { Surface, SectionHeader, EmptyState, ListRow, MiniBar, initials } from '../../components/ui';
import Badge from '../../components/Badge';

/** A high cancel rate is the signal worth flagging, not the raw count. */
function rateTone(pct: number) {
  if (pct >= 20) return 'error' as const;
  if (pct >= 10) return 'warning' as const;
  return 'neutral' as const;
}

export default function CancellationsReportScreen() {
  const from = weekAgo();
  const to = today();

  return (
    <ReportScreen
      title="Cancellations"
      subtitle={rangeLabel(from, to)}
      load={() => api.cancellations(from, to)}
      render={(data) => {
        if (!Array.isArray(data)) return null;
        if (data.length === 0) {
          return (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="check-circle" title="No cancellations" message="Every started wash was seen through." />
            </Surface>
          );
        }

        const ranked = [...data].sort((a, b) => Number(b.rate_pct || 0) - Number(a.rate_pct || 0));
        const maxRate = Math.max(...ranked.map((c) => Number(c.rate_pct || 0)), 1);

        return (
          <View style={{ gap: spacing.lg }}>
            <SectionHeader title="By worker" count={ranked.length} icon="times-circle" />

            {ranked.map((c: any, i: number) => {
              const pct = Number(c.rate_pct || 0);
              const t = rateTone(pct);
              return (
                <Surface key={i} elevation="sm" style={styles.card}>
                  <View style={styles.top}>
                    <View style={styles.who}>
                      <Text style={styles.name} numberOfLines={1}>{c.full_name}</Text>
                      <Text style={styles.count}>
                        {Number(c.count || 0)} cancelled
                      </Text>
                    </View>
                    <View style={styles.rateCol}>
                      <Text
                        style={[
                          styles.rate,
                          { color: t === 'error' ? colors.error : t === 'warning' ? colors.warning : colors.text },
                        ]}
                      >
                        {pct}%
                      </Text>
                      <Text style={styles.rateLabel}>RATE</Text>
                    </View>
                  </View>

                  <MiniBar
                    value={pct}
                    max={maxRate}
                    color={t === 'error' ? colors.error : t === 'warning' ? colors.warning : colors.ink[300]}
                  />

                  {c.cancel_reason ? (
                    <View style={styles.reasonWrap}>
                      <Text style={styles.reasonLabel}>MOST COMMON REASON</Text>
                      <Text style={styles.reason} numberOfLines={2}>{c.cancel_reason}</Text>
                    </View>
                  ) : null}
                </Surface>
              );
            })}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  who: { flex: 1, gap: 2 },
  name: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  count: { fontSize: font.xs, color: colors.textMuted, fontWeight: weight.medium },
  rateCol: { alignItems: 'flex-end' },
  rate: { fontSize: font.xxl, fontWeight: weight.black, letterSpacing: tracking.display },
  rateLabel: { fontSize: font.micro, fontWeight: weight.bold, color: colors.textMuted, letterSpacing: tracking.caps },
  reasonWrap: {
    backgroundColor: colors.bgSunken,
    borderRadius: 10,
    padding: spacing.md,
    gap: 3,
  },
  reasonLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.caps },
  reason: { fontSize: font.sm, color: colors.textSecondary, lineHeight: 17 },
});
