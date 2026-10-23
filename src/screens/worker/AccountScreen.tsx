import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking, shadow, Tone } from '../../theme';
import { ReportScreen } from '../manager/reportHelpers';
import Icon from '../../components/Icon';
import { Surface, SectionHeader, EmptyState, ListRow, MetricStrip } from '../../components/ui';

/**
 * My Account — the worker's wallet (server: modules/wallet).
 *
 * Balance = what the business owes the worker. Commission on every wash
 * they wash goes in; cash they collect from clients goes out until a
 * manager confirms receiving it. A positive balance is money they can
 * withdraw; a negative one is cash they still have to hand in.
 *
 * Withdrawing to MTN / Airtel needs a payout provider (Phase 6), so the
 * button says so instead of pretending to work.
 */

const ugx = (n: any) => Number(n || 0).toLocaleString();

const KIND: Record<string, { label: string; icon: string; tone: Tone }> = {
  commission: { label: 'Commission earned', icon: 'coins', tone: 'success' },
  cash_collected: { label: 'Cash collected from client', icon: 'hand-holding-usd', tone: 'warning' },
  cash_handover: { label: 'Cash handed to manager', icon: 'check-circle', tone: 'info' },
  reversal: { label: 'Wash reversed', icon: 'undo', tone: 'error' },
  correction: { label: 'Price corrected', icon: 'wrench', tone: 'neutral' },
  withdrawal: { label: 'Withdrawn', icon: 'arrow-up', tone: 'accent' },
  withdrawal_fee: { label: 'Withdrawal fee', icon: 'receipt', tone: 'neutral' },
  withdrawal_reversal: { label: 'Withdrawal returned', icon: 'undo', tone: 'info' },
  adjust: { label: 'Adjusted by the car wash', icon: 'sliders-h', tone: 'neutral' },
};

function when(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export default function AccountScreen() {
  return (
    <ReportScreen
      title="My Account"
      subtitle="What you've earned and what you owe"
      load={() => api.myWallet()}
      render={(w) => {
        if (!w) return null;
        const balance = Number(w.balance_ugx || 0);
        const owes = Number(w.owes_ugx || 0);
        const available = Number(w.available_ugx || 0);
        const ledger: any[] = w.ledger || [];

        return (
          <View style={{ gap: spacing.lg }}>
            {/* Balance — the one gradient card */}
            <LinearGradient
              colors={colors.gradientAction}
              locations={colors.gradientActionLocations}
              start={colors.gradientActionStart}
              end={colors.gradientActionEnd}
              style={styles.card}
            >
              <View style={styles.bloom} pointerEvents="none" />
              <Text style={styles.kicker}>{owes > 0 ? 'YOU OWE' : 'YOUR BALANCE'}</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currency}>UGX</Text>
                <Text style={styles.amount} numberOfLines={1}>{ugx(owes > 0 ? owes : balance)}</Text>
              </View>
              <Text style={styles.cardSub}>
                {owes > 0
                  ? 'Cash you collected, after your commission. Hand it to your manager to clear it.'
                  : available > 0
                    ? 'Commission you have earned and not withdrawn yet.'
                    : 'Nothing owed either way right now.'}
              </Text>

              <View style={styles.withdraw}>
                <Icon name="mobile-alt" size={12} color="rgba(255,255,255,0.9)" />
                <Text style={styles.withdrawText}>
                  {available > 0
                    ? 'Withdraw to MTN / Airtel — coming soon'
                    : 'Withdrawals to MTN / Airtel are coming soon'}
                </Text>
              </View>
            </LinearGradient>

            {/* Commission by period */}
            <View>
              <SectionHeader title="Commission earned" icon="coins" />
              <Surface elevation="sm">
                <MetricStrip
                  items={[
                    { label: 'Today', value: ugx(w.commission?.today_ugx), tone: 'success' },
                    { label: 'This week', value: ugx(w.commission?.week_ugx), tone: 'primary' },
                    { label: 'This month', value: ugx(w.commission?.month_ugx), tone: 'accent' },
                  ]}
                />
              </Surface>
            </View>

            {/* Every movement */}
            <View>
              <SectionHeader title="Activity" count={ledger.length} icon="stream" />
              {ledger.length === 0 ? (
                <Surface elevation="sm" padded="lg">
                  <EmptyState icon="wallet" title="No activity yet" message="Your commission shows here after your first car is paid." />
                </Surface>
              ) : (
                <Surface elevation="sm" padded="sm">
                  {ledger.map((r: any, i: number) => {
                    const m = KIND[r.kind] || { label: r.kind, icon: 'circle', tone: 'neutral' as Tone };
                    const amt = Number(r.amount_ugx || 0);
                    return (
                      <ListRow
                        key={r.id}
                        leading={m.icon}
                        leadingTone={m.tone}
                        title={m.label}
                        subtitle={[r.job_no, r.reason && r.reason !== m.label ? r.reason : null].filter(Boolean).join(' · ') || undefined}
                        meta={when(r.created_at)}
                        last={i === ledger.length - 1}
                        trailing={
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[styles.delta, { color: amt >= 0 ? colors.success : colors.error }]}>
                              {amt >= 0 ? '+' : '−'}{ugx(Math.abs(amt))}
                            </Text>
                            <Text style={styles.after}>bal {ugx(r.balance_after_ugx)}</Text>
                          </View>
                        }
                      />
                    );
                  })}
                </Surface>
              )}
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, padding: spacing.xl, overflow: 'hidden', ...shadow.md },
  bloom: {
    position: 'absolute', top: -80, right: -50, width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  kicker: { fontSize: font.micro, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.8)', letterSpacing: tracking.capsWide },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7, marginTop: 4 },
  currency: { fontSize: font.regular, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.75)' },
  amount: { fontSize: font.hero, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.display },
  cardSub: { fontSize: font.sm, color: 'rgba(255,255,255,0.85)', lineHeight: 19, marginTop: spacing.xs },
  withdraw: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    marginTop: spacing.lg, paddingHorizontal: spacing.md, paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 999,
  },
  withdrawText: { fontSize: font.xs, fontWeight: weight.bold, color: '#fff' },
  delta: { fontSize: font.sm, fontWeight: weight.heavy },
  after: { fontSize: font.micro, color: colors.textMuted, marginTop: 1 },
});
