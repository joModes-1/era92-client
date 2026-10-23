import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, weight, radii, Tone } from '../../theme';
import { ReportScreen } from './reportHelpers';
import { Surface, EmptyState, ListRow, SectionHeader } from '../../components/ui';

/** Every movement of the client's points, newest first — why the balance is what it is. */

const ENTRY_META: Record<string, { label: string; icon: string; tone: Tone }> = {
  earn: { label: 'Points earned', icon: 'car', tone: 'primary' },
  redeem: { label: 'Points used', icon: 'award', tone: 'accent' },
  refund: { label: 'Points returned', icon: 'undo', tone: 'success' },
  reversal: { label: 'Points taken back', icon: 'undo', tone: 'error' },
  adjust: { label: 'Adjusted by the car wash', icon: 'sliders-h', tone: 'info' },
};

const metaFor = (t: string) =>
  ENTRY_META[t] || { label: (t || 'entry').replace(/_/g, ' '), icon: 'circle', tone: 'neutral' as Tone };

function when(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function LedgerScreen() {
  return (
    <ReportScreen
      title="Points history"
      subtitle="Every points movement"
      load={() => api.clientPointsLedger()}
      render={(data) => {
        if (!Array.isArray(data)) return null;
        if (data.length === 0) {
          return (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="list-alt" title="No activity" message="Points you earn and use will show up here." />
            </Surface>
          );
        }

        return (
          <View>
            <SectionHeader title="Activity" count={data.length} icon="stream" />
            <Surface elevation="sm" padded="sm">
              {data.map((e: any, i: number) => {
                const delta = Number(e.points_delta || 0);
                const m = metaFor(e.entry_type);
                const what = [e.service_name, e.job_no].filter(Boolean).join(' · ');
                return (
                  <ListRow
                    key={i}
                    leading={m.icon}
                    leadingTone={m.tone}
                    title={m.label}
                    subtitle={what || e.reason || undefined}
                    meta={`${when(e.created_at)} · balance ${Number(e.balance_after || 0).toLocaleString()}`}
                    last={i === data.length - 1}
                    trailing={
                      <View style={[styles.pill, { backgroundColor: delta >= 0 ? colors.successSoft : colors.errorSoft }]}>
                        <Text style={[styles.pillText, { color: delta >= 0 ? colors.success : colors.error }]}>
                          {delta > 0 ? '+' : ''}{delta.toLocaleString()}
                        </Text>
                      </View>
                    }
                  />
                );
              })}
            </Surface>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
  pillText: { fontSize: font.xs, fontWeight: weight.heavy },
});
