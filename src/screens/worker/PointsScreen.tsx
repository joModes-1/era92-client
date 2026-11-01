import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight } from '../../theme';
import { ReportScreen } from '../manager/reportHelpers';
import { Surface, MetricStrip, SectionHeader } from '../../components/ui';
import { PointsBalanceCard, PointsRows, PointsEntry } from '../client/PointsSheet';

/**
 * My Points — the worker's experience points (server: modules/workerPoints),
 * shown with the same card and rows as the client's Points page so points
 * look the same wherever they appear in the app: the balance on the
 * pink-to-peach card beside the award badge, earned/used figures, then each
 * movement as a row with the wash's picture.
 *
 * Earned on every car they wash, at the number the owner set for that wash
 * type in Points Settings. They rank the leaderboard and decide who the
 * dispatcher gives a car to first.
 */

const ENTRY_LABEL: Record<string, string> = {
  earn: 'Earned', bonus: 'Bonus', reversal: 'Taken back', manual_adjust: 'Adjusted', redeem: 'Used',
};

/** "May 14 at 10:20 AM", as the client's rows read. */
function dateLabel(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
}

function toEntries(history: any[]): PointsEntry[] {
  return history.map((h: any, i: number) => ({
    id: h.id || `${h.created_at}-${i}`,
    title: h.service_name || (h.entry_type === 'earn' ? 'Car washed' : 'Points'),
    subtitle: `${ENTRY_LABEL[h.entry_type] || 'Changed'}${h.job_no ? ` • ${h.job_no}` : ''} • ${dateLabel(h.created_at)}`,
    points: Number(h.points_delta || 0),
  }));
}

export default function PointsScreen() {
  return (
    <ReportScreen
      title="My Points"
      subtitle="Earned on every car you wash"
      load={() => api.myPoints()}
      render={(p) => {
        if (!p) return null;
        const history: any[] = p.history || [];
        return (
          <View style={{ gap: spacing.lg }}>
            <PointsBalanceCard
              balance={Number(p.points_balance || 0)}
              worthUgx={p.value_ugx != null ? Number(p.value_ugx) : undefined}
            />

            {!p.scheme_active ? (
              <Text style={styles.note}>Points are paused at this car wash for now.</Text>
            ) : null}

            <Surface elevation="sm">
              <MetricStrip
                items={[
                  { label: 'Earned all time', value: Number(p.lifetime_earned || 0).toLocaleString(), tone: 'primary' },
                  { label: 'Cars counted', value: Number(p.washes_credited || 0).toLocaleString(), tone: 'accent' },
                ]}
              />
            </Surface>

            <View>
              <SectionHeader title="Points activity" />
              <View style={{ gap: spacing.sm }}>
                <PointsRows entries={toEntries(history)} />
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  note: { fontSize: font.sm, color: colors.textSecondary, fontWeight: weight.semibold },
});
