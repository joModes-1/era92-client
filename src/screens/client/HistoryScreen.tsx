import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking } from '../../theme';
import Badge from '../../components/Badge';
import { ReportScreen } from './reportHelpers';
import { Surface, SectionHeader, EmptyState, ListRow, MetricStrip } from '../../components/ui';

const ugx = (n: any) => Number(n || 0).toLocaleString();

/** Group visits by month so a long history stays scannable. */
function groupByMonth(rows: any[]) {
  const map = new Map<string, any[]>();
  rows.forEach((w) => {
    const key = w.started_at?.slice(0, 7) || 'unknown';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(w);
  });
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function monthLabel(key: string) {
  if (key === 'unknown') return 'Undated';
  const now = new Date().toISOString().slice(0, 7);
  if (key === now) return 'This month';
  return new Date(key + '-01T00:00:00').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export default function HistoryScreen() {
  return (
    <ReportScreen
      title="Wash History"
      load={() => api.clientHistory()}
      render={(data) => {
        if (!Array.isArray(data)) return null;
        if (data.length === 0) {
          return (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="history" title="No washes yet" message="Once you visit a bay, your history appears here." />
            </Surface>
          );
        }

        const spend = data.reduce((s: number, w: any) => s + Number(w.quoted_amount_ugx || 0), 0);
        const months = groupByMonth(data);

        return (
          <View style={{ gap: spacing.lg }}>
            {/* Lifetime summary up top */}
            <Surface elevation="sm">
              <MetricStrip
                items={[
                  { label: 'Visits', value: data.length, tone: 'primary' },
                  { label: 'Total UGX', value: ugx(spend) },
                  { label: 'Avg UGX', value: ugx(Math.round(spend / data.length)) },
                ]}
              />
            </Surface>

            {months.map(([key, rows]) => (
              <View key={key}>
                <SectionHeader title={monthLabel(key)} count={rows.length} />
                <Surface elevation="sm" padded="sm">
                  {rows.map((w: any, i: number) => (
                    <ListRow
                      key={i}
                      leading="car"
                      leadingTone={w.status === 'settled' ? 'success' : 'neutral'}
                      title={`#${w.job_no}`}
                      subtitle={`${w.vehicle_class_name} · ${w.service_name}`}
                      meta={w.started_at?.slice(0, 10)}
                      value={ugx(w.quoted_amount_ugx)}
                      valueSub="UGX"
                      last={i === rows.length - 1}
                      trailing={
                        w.status !== 'settled'
                          ? <Badge label={w.status} tone="neutral" small />
                          : undefined
                      }
                    />
                  ))}
                </Surface>
              </View>
            ))}
          </View>
        );
      }}
    />
  );
}
