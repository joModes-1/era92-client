import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking, radii } from '../../theme';
import { ReportScreen } from './reportHelpers';
import { Surface, SectionHeader, EmptyState, ListRow } from '../../components/ui';
import Badge from '../../components/Badge';

/** Escalating urgency by wait time — colour carries the severity. */
function urgency(mins: number) {
  if (mins >= 60) return { tone: 'error' as const, label: 'CRITICAL' };
  if (mins >= 30) return { tone: 'warning' as const, label: 'OVERDUE' };
  return { tone: 'info' as const, label: 'WATCH' };
}

function elapsed(mins: number) {
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function StaleReportScreen() {
  return (
    <ReportScreen
      title="Stale Alerts"
      subtitle="Jobs sitting too long"
      load={() => api.stale()}
      render={(data) => {
        if (!data) return null;
        const ready = data.stale_ready || [];
        const open = data.long_in_progress || [];
        const total = ready.length + open.length;

        if (total === 0) {
          return (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="check-circle" title="Nothing is stale" message="Every job is moving within its threshold." />
            </Surface>
          );
        }

        return (
          <View style={{ gap: spacing.lg }}>
            {/* Alert banner sets the tone before any list */}
            <Surface elevation="sm" tone={colors.errorSoft} borderless style={styles.banner}>
              <View style={styles.bannerDot} />
              <Text style={styles.bannerText}>
                {total} job{total === 1 ? '' : 's'} need{total === 1 ? 's' : ''} attention right now
              </Text>
            </Surface>

            {ready.length > 0 && (
              <View>
                <SectionHeader title="Ready, not collected" count={ready.length} icon="hourglass-half" />
                <Surface elevation="sm" padded="sm">
                  {ready.map((w: any, i: number) => {
                    const mins = Number(w.minutes_ready || 0);
                    const u = urgency(mins);
                    return (
                      <ListRow
                        key={i}
                        accent={colors[u.tone === 'error' ? 'error' : u.tone === 'warning' ? 'warning' : 'info']}
                        leading="check-circle"
                        leadingTone={u.tone}
                        title={`#${w.job_no}`}
                        subtitle={w.vehicle_class_name}
                        value={elapsed(mins)}
                        valueTone={u.tone}
                        valueSub="waiting"
                        last={i === ready.length - 1}
                      />
                    );
                  })}
                </Surface>
              </View>
            )}

            {open.length > 0 && (
              <View>
                <SectionHeader title="Still washing" count={open.length} icon="soap" />
                <Surface elevation="sm" padded="sm">
                  {open.map((w: any, i: number) => {
                    const mins = Number(w.minutes_open || 0);
                    const u = urgency(mins);
                    return (
                      <ListRow
                        key={i}
                        accent={colors.washing}
                        leading="soap"
                        leadingTone="warning"
                        title={`#${w.job_no}`}
                        subtitle={w.vehicle_class_name}
                        value={elapsed(mins)}
                        valueTone={u.tone}
                        valueSub="open"
                        last={i === open.length - 1}
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  bannerText: { flex: 1, fontSize: font.sm, fontWeight: weight.bold, color: colors.error, letterSpacing: 0.1 },
});
