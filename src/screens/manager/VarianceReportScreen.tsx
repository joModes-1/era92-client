import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, radii, weight, tracking } from '../../theme';
import { ReportScreen, rangeLabel, today, weekAgo } from './reportHelpers';
import { Surface, SectionHeader, EmptyState, ListRow, VarianceChart, initials } from '../../components/ui';
import { HeaderStat } from '../../components/ScreenHeader';
import Icon from '../../components/Icon';

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
            <HeaderStat label="Over" value={Number(data.summary.surplus_count || 0)} icon="arrow-up" />
            <HeaderStat label="Short" value={Number(data.summary.shortfall_count || 0)} icon="arrow-down" />
          </>
        )
      }
      render={(data) => {
        if (!data?.summary) return null;
        const shifts = data.shifts || [];
        const net = shifts.reduce((s: number, x: any) => s + Number(x.variance_ugx || 0), 0);
        const isShort = net < 0;

        return (
          <View style={{ gap: spacing.lg }}>
            {/* Net position — the manager's real question */}
            <Surface elevation="md" padded="lg" style={styles.hero}>
              <View style={styles.heroRow}>
                <View
                  style={[
                    styles.heroIcon,
                    { backgroundColor: net === 0 ? colors.successSoft : isShort ? colors.errorSoft : colors.successSoft },
                  ]}
                >
                  <Icon
                    name={net === 0 ? 'equals' : isShort ? 'arrow-down' : 'arrow-up'}
                    size={14}
                    color={net === 0 ? colors.success : isShort ? colors.error : colors.success}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroLabel}>NET VARIANCE</Text>
                  <Text
                    style={[styles.heroValue, { color: net === 0 ? colors.text : isShort ? colors.error : colors.success }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.6}
                  >
                    {net > 0 ? '+' : ''}{net.toLocaleString()}
                  </Text>
                  <Text style={styles.heroSub}>
                    across {shifts.length} shift{shifts.length === 1 ? '' : 's'} · UGX
                  </Text>
                </View>
              </View>
            </Surface>

            {shifts.length === 0 ? (
              <Surface elevation="sm" padded="lg">
                <EmptyState icon="balance-scale" title="Every shift balanced" message="No cash discrepancies in this period." />
              </Surface>
            ) : (
              <>
                {/* At a glance: who ran short vs over, and by how much */}
                <View>
                  <SectionHeader title="Over / short by worker" icon="chart-bar" />
                  <Surface elevation="sm" padded="lg">
                    <VarianceChart shifts={shifts} />
                  </Surface>
                </View>

                <View>
                  <SectionHeader title="By shift" count={shifts.length} icon="receipt" />
                <Surface elevation="sm" padded="sm">
                  {shifts.map((s: any, i: number) => {
                    const v = Number(s.variance_ugx || 0);
                    const short = v < 0;
                    return (
                      <ListRow
                        key={i}
                        accent={v === 0 ? undefined : short ? colors.error : colors.success}
                        leading={initials(s.worker_name)}
                        leadingTone={v === 0 ? 'neutral' : short ? 'error' : 'success'}
                        title={s.worker_name}
                        subtitle={s.branch_name}
                        meta={s.date}
                        value={`${v > 0 ? '+' : ''}${v.toLocaleString()}`}
                        valueSub={short ? 'short' : v > 0 ? 'over' : 'balanced'}
                        valueTone={v === 0 ? undefined : short ? 'error' : 'success'}
                        last={i === shifts.length - 1}
                      />
                    );
                  })}
                  </Surface>
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
  hero: {},
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroIcon: {
    width: 42, height: 42, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  heroLabel: {
    fontSize: font.xs, fontWeight: weight.heavy,
    color: colors.textMuted, letterSpacing: tracking.capsWide,
  },
  heroValue: { fontSize: font.display, fontWeight: weight.black, letterSpacing: tracking.display, marginTop: 2 },
  heroSub: { fontSize: font.xs, color: colors.textMuted, marginTop: 1 },
});
