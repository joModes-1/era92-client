import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import { ReportScreen } from './reportHelpers';
import Icon from '../../components/Icon';
import { Surface, EmptyState, ProgressBar, StampRow, MetricStrip } from '../../components/ui';

export default function LoyaltyScreen() {
  return (
    <ReportScreen
      title="Loyalty"
      subtitle="Your rewards"
      load={() => api.clientLoyalty()}
      render={(data) => {
        if (data?.error) return null;
        if (!data) {
          return (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="gift" title="No loyalty activity yet" message="Get your first wash to start earning rewards." />
            </Surface>
          );
        }

        const credits = Number(data.free_wash_credits || 0);
        const done = Number(data.wash_count || 0);
        const required = Number(data.washes_required || 7);
        const remaining = Math.max(0, required - done);

        return (
          <View style={{ gap: spacing.lg }}>
            {/* Reward card — reads as something you own, not a stat box */}
            <LinearGradient
              colors={credits > 0 ? [colors.accent, colors.primary] : [colors.ink[800], colors.ink[900]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.bloom} pointerEvents="none" />

              <View style={styles.cardTop}>
                <Text style={styles.cardKicker}>FREE WASH CREDITS</Text>
                <Icon name="gift" size={16} color="rgba(255,255,255,0.8)" />
              </View>

              <Text style={styles.cardValue}>{credits}</Text>
              <Text style={styles.cardSub}>
                {credits > 0
                  ? `Saved and ready. Ask the attendant to use ${credits === 1 ? 'it' : 'one'} on your next visit.`
                  : 'Keep washing to unlock your next free one.'}
              </Text>

              {/* Punch card sits on the reward itself */}
              <View style={styles.cardStamps}>
                <StampRowLight filled={done} total={required} />
              </View>
            </LinearGradient>

            {/* Progress */}
            <Surface elevation="sm" style={{ gap: spacing.md }}>
              <ProgressBar
                value={done}
                max={required}
                label="PROGRESS TO NEXT FREE WASH"
                caption={`${done} / ${required}`}
                height={9}
              />
              <Text style={styles.progressNote}>
                {remaining === 0
                  ? 'You have earned a free wash — ask the attendant to use it.'
                  : `${remaining} more ${remaining === 1 ? 'wash' : 'washes'} to go.`}
              </Text>
            </Surface>

            {/* Lifetime figures */}
            <Surface elevation="sm">
              <MetricStrip
                items={[
                  { label: 'Lifetime washes', value: Number(data.lifetime_washes || 0), tone: 'primary' },
                  { label: 'Rewards redeemed', value: Number(data.lifetime_redeemed || 0), tone: 'accent' },
                ]}
              />
            </Surface>
          </View>
        );
      }}
    />
  );
}

/** Stamp row tuned for a dark/gradient background. */
function StampRowLight({ filled, total }: { filled: number; total: number }) {
  return (
    <View style={styles.stamps}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.stamp, i < filled ? styles.stampOn : styles.stampOff]}
        >
          {i < filled ? <Icon name="check" size={9} color={colors.primary} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    ...shadow.md,
  },
  bloom: {
    position: 'absolute', top: -80, right: -50,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardKicker: { fontSize: font.micro, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.75)', letterSpacing: tracking.capsWide },
  cardValue: { fontSize: 56, fontWeight: weight.black, color: '#fff', letterSpacing: -2, marginTop: 2, lineHeight: 62 },
  cardSub: { fontSize: font.sm, color: 'rgba(255,255,255,0.85)', lineHeight: 19, maxWidth: '92%' },
  cardStamps: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.22)' },

  stamps: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  stamp: { width: 24, height: 24, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  stampOn: { backgroundColor: '#fff' },
  stampOff: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.35)' },

  progressNote: { fontSize: font.sm, color: colors.textSecondary, lineHeight: 18 },
});
