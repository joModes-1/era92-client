import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight, radii, Tone } from '../../theme';
import { ReportScreen } from './reportHelpers';
import { Surface, EmptyState, ListRow, SectionHeader } from '../../components/ui';

const ENTRY_META: Record<string, { label: string; icon: string; tone: Tone }> = {
  earn: { label: 'Wash earned', icon: 'car', tone: 'primary' },
  reward_granted: { label: 'Free wash earned', icon: 'gift', tone: 'success' },
  redeem: { label: 'Free wash redeemed', icon: 'star', tone: 'accent' },
  adjustment: { label: 'Manual adjustment', icon: 'sliders-h', tone: 'info' },
  reversal: { label: 'Reversed', icon: 'undo', tone: 'error' },
  correction: { label: 'Corrected', icon: 'wrench', tone: 'warning' },
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
      title="Loyalty Ledger"
      subtitle="Every reward movement"
      load={() => api.clientLedger()}
      render={(data) => {
        if (!Array.isArray(data)) return null;
        if (data.length === 0) {
          return (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="list-alt" title="No activity" message="Your wash and reward history will show up here." />
            </Surface>
          );
        }

        return (
          <View>
            <SectionHeader title="Activity" count={data.length} icon="stream" />
            <Surface elevation="sm" padded="sm">
              {data.map((e: any, i: number) => {
                const washDelta = Number(e.wash_delta || 0);
                const creditDelta = Number(e.credit_delta || 0);
                const m = metaFor(e.entry_type);

                const deltas: { text: string; up: boolean }[] = [];
                if (washDelta !== 0) deltas.push({ text: `${washDelta > 0 ? '+' : ''}${washDelta} wash`, up: washDelta > 0 });
                if (creditDelta !== 0) deltas.push({ text: `${creditDelta > 0 ? '+' : ''}${creditDelta} credit`, up: creditDelta > 0 });

                return (
                  <ListRow
                    key={i}
                    leading={m.icon}
                    leadingTone={m.tone}
                    title={m.label}
                    subtitle={e.reason || undefined}
                    meta={when(e.created_at)}
                    last={i === data.length - 1}
                    trailing={
                      <View style={styles.deltas}>
                        {deltas.length === 0 ? (
                          <Text style={styles.none}>—</Text>
                        ) : (
                          deltas.map((d, k) => (
                            <View
                              key={k}
                              style={[styles.pill, { backgroundColor: d.up ? colors.successSoft : colors.errorSoft }]}
                            >
                              <Text style={[styles.pillText, { color: d.up ? colors.success : colors.error }]}>
                                {d.text}
                              </Text>
                            </View>
                          ))
                        )}
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
  deltas: { alignItems: 'flex-end', gap: 4 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.full },
  pillText: { fontSize: font.xs, fontWeight: weight.heavy },
  none: { fontSize: font.sm, color: colors.textMuted, fontWeight: weight.bold },
});
