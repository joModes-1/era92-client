import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, Tone } from '../../theme';
import { ReportScreen } from '../manager/reportHelpers';
import Icon from '../../components/Icon';
import { Surface, SectionHeader, EmptyState, ListRow, MetricStrip } from '../../components/ui';

/**
 * My Points — the worker's experience points (server: modules/workerPoints).
 * Earned on every car they wash, at the number the owner set for that wash
 * type in Points Settings. They rank the leaderboard and decide who the
 * dispatcher gives a car to first.
 */

const KIND: Record<string, { label: string; icon: string; tone: Tone }> = {
  earn: { label: 'Car washed', icon: 'car', tone: 'primary' },
  bonus: { label: 'Bonus', icon: 'gift', tone: 'success' },
  reversal: { label: 'Wash reversed', icon: 'undo', tone: 'error' },
  manual_adjust: { label: 'Adjusted', icon: 'sliders-h', tone: 'neutral' },
  redeem: { label: 'Redeemed', icon: 'award', tone: 'accent' },
};

function when(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
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
            <Surface elevation="sm" style={styles.card}>
              <View style={styles.badge}><Icon name="award" size={20} color="#AC00FF" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.kicker}>YOUR POINTS</Text>
                <Text style={styles.value}>{Number(p.points_balance || 0).toLocaleString()}</Text>
                {p.value_ugx != null ? (
                  <Text style={styles.worth}>Worth UGX {Number(p.value_ugx).toLocaleString()}</Text>
                ) : null}
              </View>
            </Surface>

            <Surface elevation="sm">
              <MetricStrip
                items={[
                  { label: 'All time', value: Number(p.lifetime_earned || 0).toLocaleString(), tone: 'primary' },
                  { label: 'Cars counted', value: Number(p.washes_credited || 0).toLocaleString(), tone: 'accent' },
                ]}
              />
            </Surface>

            {!p.scheme_active ? (
              <Text style={styles.paused}>Points are paused at this car wash for now.</Text>
            ) : null}

            <View>
              <SectionHeader title="History" count={history.length} icon="stream" />
              {history.length === 0 ? (
                <Surface elevation="sm" padded="lg">
                  <EmptyState icon="award" title="No points yet" message="You earn points every time a car you washed is paid." />
                </Surface>
              ) : (
                <Surface elevation="sm" padded="sm">
                  {history.map((h: any, i: number) => {
                    const m = KIND[h.entry_type] || { label: h.entry_type, icon: 'circle', tone: 'neutral' as Tone };
                    const d = Number(h.points_delta || 0);
                    return (
                      <ListRow
                        key={h.id}
                        leading={m.icon}
                        leadingTone={m.tone}
                        title={m.label}
                        subtitle={[h.job_no, h.reason].filter(Boolean).join(' · ') || undefined}
                        meta={when(h.created_at)}
                        last={i === history.length - 1}
                        trailing={
                          <Text style={[styles.delta, { color: d >= 0 ? colors.success : colors.error }]}>
                            {d > 0 ? '+' : ''}{d.toLocaleString()}
                          </Text>
                        }
                      />
                    );
                  })}
                </Surface>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#F4ECFF', alignItems: 'center', justifyContent: 'center' },
  kicker: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  value: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  worth: { fontSize: font.sm, color: colors.textSecondary, fontWeight: weight.semibold },
  paused: { fontSize: font.sm, color: colors.warning, textAlign: 'center' },
  delta: { fontSize: font.sm, fontWeight: weight.heavy },
});
