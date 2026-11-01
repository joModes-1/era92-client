import React from 'react';
import { View, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, spacing } from '../../theme';
import { ReportScreen, today } from './reportHelpers';
import { HeroCard, Surface, SectionHeader, EmptyState, ListRow, MiniBar, initials } from '../../components/ui';

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
            <HeroCard
              label="Gross takings"
              prefix="UGX"
              value={ugx(s.gross_ugx)}
              stats={[
                { label: 'Washes', value: Number(s.settled_washes || 0) },
                { label: 'Rewards', value: Number(s.redemption_count || 0) },
                { label: 'Handovers', value: Number(s.handover_count || 0) },
              ]}
            />

            {/* Per-worker contribution */}
            {workers.length > 0 && (
              <View>
                <SectionHeader title="By worker" count={workers.length} icon="users" />
                <Surface elevation="sm" padded="sm" style={{ paddingHorizontal: spacing.md }}>
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
                            color={i === 0 ? colors.primary : colors.primaryTint}
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
  barWrap: { width: 54, marginTop: 4 },
});
