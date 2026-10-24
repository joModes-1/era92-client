import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { colors, font, spacing, weight } from '../../theme';
import { ReportScreen } from './reportHelpers';
import Icon from '../../components/Icon';
import ComponentButton1 from '../../components/buttons/ComponentButton1';
import { Surface, MetricStrip, SectionHeader } from '../../components/ui';
import { PointsBalanceCard, PointsRows, ledgerEntries, pendingPointsFor } from './PointsSheet';

/**
 * The client's Points page — one place for their points: the same card and
 * rows as the Home points sheet (so the numbers always match), Redeem, what
 * they have earned and used, and every movement of the balance, with the
 * points still on their way from cars on the go at the top.
 *
 * Points replaced the old "7 washes = 1 free" stamp card. Free-wash credits a
 * client earned under that card can still be spent, so they are shown — with
 * their own button — only while the client still has some.
 */
export default function LoyaltyScreen() {
  const navigation = useNavigation<any>();

  return (
    <ReportScreen
      title="Points"
      subtitle="Earned on every paid wash"
      load={async () => {
        const [points, legacy, ledger, active] = await Promise.all([
          api.clientPoints(),
          api.clientLoyalty().catch(() => null),
          api.clientPointsLedger().catch(() => []),
          api.clientActiveList().catch(() => []),
        ]);
        return { points, legacy, ledger, active };
      }}
      render={(data) => {
        if (data?.error) return null;
        const p = data?.points || {};
        const enabled = p.enabled !== false;
        const balance = Number(p.balance || 0);
        const credits = Number(data?.legacy?.free_wash_credits || 0);
        const entries = ledgerEntries(Array.isArray(data?.ledger) ? data.ledger : []);
        const pending = pendingPointsFor(Array.isArray(data?.active) ? data.active : [], p.enabled);
        const onTheWay = pending.reduce((sum, e) => sum + e.points, 0);
        const canRedeem = enabled && balance > 0 && Number(p.point_value_ugx) > 0;

        return (
          <View style={{ gap: spacing.lg }}>
            <PointsBalanceCard balance={balance} worthUgx={Number(p.worth_ugx || 0)} onTheWay={onTheWay} />

            {!enabled ? (
              <Text style={styles.note}>Points are paused at this car wash for now.</Text>
            ) : canRedeem ? (
              <ComponentButton1
                title="Redeem points on a wash"
                onPress={() => navigation.navigate('BranchScan', { payWithPoints: true })}
              />
            ) : null}

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
                <Text style={styles.note}>From the old stamp card — still yours to use.</Text>
                <Surface
                  elevation="none"
                  borderless
                  onPress={() => navigation.navigate('BranchScan', { useFreeWash: true })}
                  style={styles.creditBtn}
                >
                  <Icon name="gift" size={13} color={colors.primary} />
                  <Text style={styles.creditBtnText}>Use a free wash</Text>
                </Surface>
              </Surface>
            ) : null}

            <View>
              <SectionHeader title="Points activity" />
              <View style={{ gap: spacing.sm }}>
                <PointsRows entries={entries} pending={pending} />
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  note: { fontSize: font.sm, color: colors.textSecondary },
  creditTitle: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  creditBtn: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start' },
  creditBtnText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.primary },
});
