import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking, radii } from '../../theme';
import { ReportScreen, rangeLabel, today, weekAgo } from './reportHelpers';
import { Surface, SectionHeader, EmptyState, ListRow, initials } from '../../components/ui';
import { HeaderStat } from '../../components/ScreenHeader';
import Icon from '../../components/Icon';

export default function HandoversReportScreen() {
  const from = weekAgo();
  const to = today();

  return (
    <ReportScreen
      title="Handovers"
      subtitle={rangeLabel(from, to)}
      load={() => api.handovers(from, to)}
      headerRail={(data) => {
        const list = data?.handovers || [];
        if (list.length === 0) return null;
        const value = list.reduce((s: number, h: any) => s + Number(h.amount_ugx || 0), 0);
        return (
          <>
            <HeaderStat label="Handovers" value={list.length} icon="handshake" />
            <HeaderStat label="Value" value={`UGX ${value.toLocaleString()}`} icon="coins" />
          </>
        );
      }}
      render={(data) => {
        if (!data) return null;
        const list = data.handovers || [];
        const rates = data.rates || [];

        return (
          <View style={{ gap: spacing.lg }}>
            <View>
              <SectionHeader title="Transfers" count={list.length} icon="exchange-alt" />
              {list.length === 0 ? (
                <Surface elevation="sm" padded="lg">
                  <EmptyState icon="handshake" title="No handovers" message="Every wash was settled by whoever started it." />
                </Surface>
              ) : (
                <Surface elevation="sm" padded="sm">
                  {list.map((h: any, i: number) => (
                    <ListRow
                      key={i}
                      leading="exchange-alt"
                      leadingTone="info"
                      title={`#${h.job_no}`}
                      subtitle={undefined}
                      value={`UGX ${Number(h.amount_ugx || 0).toLocaleString()}`}
                      last={i === list.length - 1}
                      trailing={
                        <View style={styles.flow}>
                          <Text style={styles.flowName} numberOfLines={1}>{h.starter_name}</Text>
                          <Icon name="arrow-right" size={8} color={colors.textMuted} />
                          <Text style={styles.flowName} numberOfLines={1}>{h.settler_name}</Text>
                        </View>
                      }
                    />
                  ))}
                </Surface>
              )}
            </View>

            {rates.length > 0 && (
              <View>
                <SectionHeader title="Rate by worker" count={rates.length} icon="users" />
                <Surface elevation="sm" padded="sm">
                  {rates.map((r: any, i: number) => {
                    const received = Number(r.received || 0);
                    const given = Number(r.given || 0);
                    return (
                      <ListRow
                        key={i}
                        leading={initials(r.full_name)}
                        title={r.full_name}
                        last={i === rates.length - 1}
                        trailing={
                          <View style={styles.rateRow}>
                            <View style={[styles.ratePill, { backgroundColor: colors.infoSoft }]}>
                              <Icon name="arrow-down" size={8} color={colors.info} />
                              <Text style={[styles.rateText, { color: colors.info }]}>{received}</Text>
                            </View>
                            <View style={[styles.ratePill, { backgroundColor: colors.bgSunken }]}>
                              <Icon name="arrow-up" size={8} color={colors.textSecondary} />
                              <Text style={[styles.rateText, { color: colors.textSecondary }]}>{given}</Text>
                            </View>
                          </View>
                        }
                      />
                    );
                  })}
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
  flow: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: 150 },
  flowName: { fontSize: font.micro, color: colors.textMuted, fontWeight: weight.semibold, flexShrink: 1 },
  rateRow: { flexDirection: 'row', gap: 6 },
  ratePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.full,
  },
  rateText: { fontSize: font.xs, fontWeight: weight.heavy },
});
