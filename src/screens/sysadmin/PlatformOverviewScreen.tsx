import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import { ReportScreen, styles as reportStyles } from './reportHelpers';
import { Surface, SectionHeader, MetricStrip, ProgressBar, EmptyState } from '../../components/ui';
import Icon from '../../components/Icon';

const ugx = (n: any) => Number(n || 0).toLocaleString();

export default function PlatformOverviewScreen() {
  return (
    <ReportScreen
      title="Platform Overview"
      subtitle="System-wide"
      load={() => api.platformStats()}
      render={(data) => {
        if (!data || data.error) {
          return <EmptyState icon="chart-pie" title="No platform data" message="Statistics will appear once orgs are active." />;
        }

        const totalOrgs = Number(data.total_orgs || 0);
        const activeOrgs = Number(data.active_orgs || 0);

        return (
          <View style={{ gap: spacing.lg }}>
            {/* Revenue hero — dark card sets platform-level apart from org-level */}
            <LinearGradient
              colors={[colors.ink[800], colors.ink[950]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <View style={styles.bloom} pointerEvents="none" />

              <View style={styles.heroHead}>
                <Text style={styles.heroKicker}>GROSS THIS MONTH</Text>
                <Icon name="chart-line" size={14} color="rgba(255,255,255,0.6)" />
              </View>

              <View style={styles.amountRow}>
                <Text style={styles.currency}>UGX</Text>
                <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                  {ugx(data.gross_this_month)}
                </Text>
              </View>

              <View style={styles.heroFoot}>
                <Icon name="car" size={11} color="rgba(255,255,255,0.6)" />
                <Text style={styles.heroFootText}>
                  {Number(data.washes_this_month || 0).toLocaleString()} washes this month
                </Text>
              </View>
            </LinearGradient>

            {/* Tenancy health */}
            <View>
              <SectionHeader title="Tenancy" icon="building" />
              <Surface elevation="sm" style={{ gap: spacing.lg }}>
                <MetricStrip
                  items={[
                    { label: 'Organizations', value: totalOrgs, tone: 'primary' },
                    { label: 'Active', value: activeOrgs, tone: 'success' },
                    { label: 'Branches', value: Number(data.active_branches || 0), tone: 'info' },
                  ]}
                />
                <ProgressBar
                  value={activeOrgs}
                  max={Math.max(totalOrgs, 1)}
                  label="ACTIVE ORGANIZATIONS"
                  caption={`${totalOrgs > 0 ? Math.round((activeOrgs / totalOrgs) * 100) : 0}%`}
                />
              </Surface>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadow.md,
  },
  bloom: {
    position: 'absolute', top: -80, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(233,30,99,0.18)',
  },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  heroKicker: { fontSize: font.micro, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.55)', letterSpacing: tracking.capsWide },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  currency: { fontSize: font.regular, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.55)' },
  amount: { fontSize: font.hero, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  heroFoot: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)',
  },
  heroFootText: { fontSize: font.sm, color: 'rgba(255,255,255,0.7)', fontWeight: weight.medium },
});
