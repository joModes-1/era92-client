import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking } from '../../theme';
import { ReportScreen, today } from './reportHelpers';
import { HeroCard, Surface, SectionHeader, EmptyState, MetricStrip, ListRow, MiniBar, initials } from '../../components/ui';
import Icon from '../../components/Icon';
import { useIsOrgAdmin } from '../../components/ui/useIsStaff';

const ugx = (n: any) => Number(n || 0).toLocaleString();

export default function DailyReportScreen() {
  const orgAdmin = useIsOrgAdmin();
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
            {orgAdmin ? (
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
            ) : (
            <LinearGradient colors={colors.promoBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>Gross takings</Text>
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
                  { label: 'Rewards', value: Number(s.redemption_count || 0) },
                  { label: 'Handovers', value: Number(s.handover_count || 0) },
                ]}
              />
            </LinearGradient>
            )}

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
  // The client home's rewards-banner wash, as on every staff figure card.
  hero: {
    gap: spacing.lg, padding: spacing.lg, borderRadius: 22,
    borderWidth: 1, borderColor: colors.promoBannerBorder, overflow: 'hidden',
  },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.textMuted, marginBottom: 4 },
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
