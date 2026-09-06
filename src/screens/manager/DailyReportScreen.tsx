import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking } from '../../theme';
import { ReportScreen, today } from './reportHelpers';
import { Surface, SectionHeader, EmptyState, MetricStrip, ListRow, MiniBar, initials } from '../../components/ui';
import Icon from '../../components/Icon';

const ugx = (n: any) => Number(n || 0).toLocaleString();

export default function DailyReportScreen() {
  const date = today();
  const pretty = new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <ReportScreen
      title="Daily Report"
      subtitle={pretty}
      load={() => api.daily(date)}
      render={(data) => {
        if (!data?.summary) {
          return <EmptyState icon="chart-bar" title="Nothing recorded today" message="Figures appear as washes are settled." />;
        }
        const s = data.summary;
        const workers = data.by_worker || [];
        const topWorker = Math.max(...workers.map((w: any) => Number(w.cash_taken_ugx || 0)), 1);

        return (
          <View style={{ gap: spacing.lg }}>
            {/* Hero: the one number that matters today */}
            <Surface elevation="md" padded="lg" style={styles.hero}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>GROSS TAKINGS</Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.currency}>UGX</Text>
                    <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
                      {ugx(s.gross_ugx)}
                    </Text>
                  </View>
                </View>
                <View style={styles.heroIcon}>
                  <Icon name="coins" size={16} color={colors.primary} />
                </View>
              </View>

              <View style={styles.heroDivider} />

              <MetricStrip
                items={[
                  { label: 'Washes', value: Number(s.settled_washes || 0) },
                  { label: 'Rewards', value: Number(s.redemption_count || 0), tone: 'accent' },
                  { label: 'Handovers', value: Number(s.handover_count || 0), tone: 'info' },
                ]}
              />
            </Surface>

            {/* Per-worker contribution */}
            {workers.length > 0 && (
              <View>
                <SectionHeader title="By worker" count={workers.length} icon="users" />
                <Surface elevation="sm" padded="sm">
                  {workers.map((w: any, i: number) => (
                    <ListRow
                      key={i}
                      leading={initials(w.worker_name)}
                      leadingTone={i === 0 ? 'primary' : 'neutral'}
                      title={w.worker_name}
                      subtitle={`${Number(w.started || 0)} started`}
                      value={ugx(w.cash_taken_ugx)}
                      valueSub="UGX"
                      last={i === workers.length - 1}
                      trailing={
                        <View style={styles.barWrap}>
                          <MiniBar
                            value={Number(w.cash_taken_ugx || 0)}
                            max={topWorker}
                            color={i === 0 ? colors.primary : colors.ink[300]}
                          />
                        </View>
                      }
                    />
                  ))}
                </Surface>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  hero: { gap: spacing.lg },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: {
    fontSize: font.xs, fontWeight: weight.heavy,
    color: colors.textMuted, letterSpacing: tracking.capsWide, marginBottom: 6,
  },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  currency: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.textMuted },
  amount: { fontSize: font.hero, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  heroIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  heroDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight },
  barWrap: { width: 54, marginTop: 4 },
});
