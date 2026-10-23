import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import { ReportScreen } from './reportHelpers';
import Icon from '../../components/Icon';
import { Surface, EmptyState, MetricStrip } from '../../components/ui';

/**
 * The client's rewards: their points (the scheme the owner configures in
 * Settings — points per wash type, and what a point is worth), with a
 * Redeem button that books a wash paid with points.
 *
 * Points replaced the old "7 washes = 1 free" stamp card. Free-wash credits a
 * client earned under that card can still be spent, so they are shown — with
 * their own Redeem button — only while the client still has some.
 */
export default function LoyaltyScreen() {
  const navigation = useNavigation<any>();

  return (
    <ReportScreen
      title="Loyalty"
      subtitle="Your points"
      load={async () => {
        const [points, legacy] = await Promise.all([
          api.clientPoints(),
          api.clientLoyalty().catch(() => null),
        ]);
        return { points, legacy };
      }}
      render={(data) => {
        if (data?.error) return null;
        const p = data?.points;
        if (!p) {
          return (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="gift" title="No points yet" message="Get your first wash to start earning points." />
            </Surface>
          );
        }

        const balance = Number(p.balance || 0);
        const worth = Number(p.worth_ugx || 0);
        const credits = Number(data?.legacy?.free_wash_credits || 0);

        return (
          <View style={{ gap: spacing.lg }}>
            <LinearGradient
              colors={balance > 0 ? [colors.accent, colors.primary] : [colors.ink[800], colors.ink[900]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.bloom} pointerEvents="none" />

              <View style={styles.cardTop}>
                <Text style={styles.cardKicker}>YOUR POINTS</Text>
                <Icon name="award" size={16} color="rgba(255,255,255,0.8)" />
              </View>

              <Text style={styles.cardValue}>{balance.toLocaleString()}</Text>
              <Text style={styles.cardSub}>
                {!p.enabled
                  ? 'Points are paused at this car wash for now.'
                  : balance > 0
                    ? `Worth UGX ${worth.toLocaleString()} off your next wash (1 point = UGX ${Number(p.point_value_ugx || 0).toLocaleString()}).`
                    : 'Earn points on every wash — then use them to pay.'}
              </Text>

              {/* A plain light pill rather than GradientButton — its own
                  gradient would clash with the card's. */}
              {p.enabled && balance > 0 && Number(p.point_value_ugx) > 0 && (
                <Surface
                  elevation="none"
                  borderless
                  onPress={() => navigation.navigate('BranchScan', { payWithPoints: true })}
                  style={styles.redeemBtn}
                >
                  <Icon name="award" size={13} color={colors.primary} />
                  <Text style={styles.redeemText}>Redeem points on a wash</Text>
                </Surface>
              )}
            </LinearGradient>

            <Surface elevation="sm">
              <MetricStrip
                items={[
                  { label: 'Points earned', value: Number(p.lifetime_earned || 0), tone: 'primary' },
                  { label: 'Points used', value: Number(p.lifetime_redeemed || 0), tone: 'accent' },
                ]}
              />
            </Surface>

            {credits > 0 ? (
              <Surface elevation="sm" style={{ gap: spacing.sm }}>
                <Text style={styles.creditTitle}>
                  {credits} free {credits === 1 ? 'wash' : 'washes'} saved
                </Text>
                <Text style={styles.creditNote}>From the old stamp card — still yours to use.</Text>
                <Surface
                  elevation="none"
                  borderless
                  onPress={() => navigation.navigate('BranchScan', { useFreeWash: true })}
                  style={styles.creditBtn}
                >
                  <Icon name="gift" size={13} color={colors.primary} />
                  <Text style={styles.redeemText}>Use a free wash</Text>
                </Surface>
              </Surface>
            ) : null}
          </View>
        );
      }}
    />
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
  redeemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: spacing.lg,
  },
  redeemText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.primary },

  creditTitle: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  creditNote: { fontSize: font.sm, color: colors.textSecondary },
  creditBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start' },
});
