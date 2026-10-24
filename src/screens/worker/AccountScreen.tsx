import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { api } from '../../api';
import { colors, font, spacing, weight, shadow, Tone, tone as toneMap, staffType, staffText } from '../../theme';
import { ReportScreen } from '../manager/reportHelpers';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, EmptyState, Segmented } from '../../components/ui';

/**
 * My Account — the worker's wallet (server: modules/wallet).
 *
 * One balance on the server, shown as the two things it is made of:
 *   Account          commission from mobile-money, points and free washes —
 *                    theirs to withdraw, whatever cash they hold;
 *   Cash to hand in  cash from cash washes less the commission they kept
 *                    out of it; it clears when a manager confirms receiving it.
 *
 * Withdrawing to MTN / Airtel needs a payout provider (Phase 6), so the
 * button says so instead of pretending to work.
 */

const ugx = (n: any) => Number(n || 0).toLocaleString();

/** "Today", "Yesterday", else "Mon, Oct 20". */
function dayLabel(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

const timeLabel = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';

/**
 * The two pots, laid out the way payment and driver apps do it: the amount
 * you can cash out leads, big, with the button right under it (Uber's
 * Earnings, Stripe's payouts); the cash you are holding for the business is
 * a separate line of its own (Glovo's cash balance). An eye hides both, as
 * mobile-money apps do — the phone is out in the open at the bay.
 */
function WalletSections({ w, hidden, onToggleHidden }: { w: any; hidden: boolean; onToggleHidden: () => void }) {
  const alert = useAppAlert();
  const account = Number(w.account_ugx ?? w.balance_ugx ?? 0);
  const owes = Number(w.owes_ugx || 0);
  const lastHandover = (w.ledger || []).find((r: any) => r.kind === 'cash_handover');
  const day = lastHandover ? dayLabel(lastHandover.created_at) : '';
  const handedDay = day === 'Today' || day === 'Yesterday' ? day.toLowerCase() : day;
  const show = (n: number) => (hidden ? '••••••' : ugx(n));

  return (
    <>
      {/* Account — runs on from the header */}
      <View style={styles.account}>
        <View style={styles.accountHead}>
          <Text style={styles.accountTitle}>Account</Text>
          <TouchableOpacity
            onPress={onToggleHidden}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
          >
            <Icon name={hidden ? 'eye-slash' : 'eye'} size={19} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountPrefix}>UGX</Text>
          <Text style={styles.amount}>{account < 0 && !hidden ? '−' : ''}{show(Math.abs(account))}</Text>
        </View>
        <Text style={styles.accountCaption}>{account < 0 ? 'Below zero' : 'Available to withdraw'}</Text>

        <TouchableOpacity
          onPress={() => alert('Withdrawals are coming soon', 'You will send your account to MTN or Airtel Money from here.')}
          style={styles.withdrawBtn}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Withdraw, coming soon"
        >
          <Icon name="arrow-up" size={16} color="#fff" />
          <Text style={styles.withdrawText}>Withdraw</Text>
          <Text style={styles.soon}>Soon</Text>
        </TouchableOpacity>
      </View>

      {/* Cash to hand in — its own thing, never mixed into the account */}
      <View style={styles.cash}>
        <View style={styles.cashRow}>
          <View style={[styles.cashIcon, { backgroundColor: owes > 0 ? colors.warningSoft : colors.successSoft }]}>
            <Icon name={owes > 0 ? 'hand-holding-usd' : 'check'} size={20} color={owes > 0 ? colors.warning : colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cashTitle}>Cash to hand in</Text>
            <Text style={styles.cashSub}>{owes > 0 ? 'Give it to your manager' : 'All handed in'}</Text>
          </View>
          <Text style={[styles.cashAmount, owes === 0 && styles.cashAmountZero]}>
            <Text style={styles.cashPrefix}>UGX </Text>{show(owes)}
          </Text>
        </View>
        {lastHandover ? (
          <Text style={styles.cashFoot}>Last handed in {handedDay} · {timeLabel(lastHandover.created_at)}</Text>
        ) : null}
      </View>
    </>
  );
}

type Period = 'today' | 'week' | 'month';

/**
 * Commission, split by where it went, so the worker — and anyone checking —
 * can see that commission kept out of cash is never also paid into the
 * account (the server works both out by the same rule as the two pots):
 *   Online  paid into the account — mobile money, points, free washes, and
 *           a car someone else took the cash for;
 *   Cash    kept from the notes on cash washes they settled themselves.
 */
function CommissionSection({ c, hidden }: { c: any; hidden: boolean }) {
  const [period, setPeriod] = React.useState<Period>('today');
  const p = c?.[period] || {};
  const online = Number(p.account_ugx || 0);
  const cash = Number(p.cash_ugx || 0);
  const show = (n: number) => (hidden ? '••••' : ugx(n));

  return (
    <View>
      <SectionHeader title="Commission earned" />
      <Segmented
        options={[
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'This week' },
          { value: 'month', label: 'This month' },
        ]}
        value={period}
        onChange={setPeriod}
      />
      <View style={styles.splitRow}>
        <View style={styles.splitTile}>
          <View style={[styles.splitIcon, { backgroundColor: colors.primarySoft }]}>
            <Icon name="mobile-alt" size={17} color={colors.primary} />
          </View>
          <Text style={styles.splitLabel}>Online</Text>
          <Text style={styles.splitValue}>{show(online)}</Text>
          <Text style={styles.splitNote}>Into your account</Text>
        </View>
        <View style={styles.splitTile}>
          <View style={[styles.splitIcon, { backgroundColor: colors.warningSoft }]}>
            <Icon name="money-bill-wave" size={17} color={colors.warning} />
          </View>
          <Text style={styles.splitLabel}>Cash</Text>
          <Text style={styles.splitValue}>{show(cash)}</Text>
          <Text style={styles.splitNote}>Kept from cash</Text>
        </View>
      </View>
      <Text style={styles.splitTotal}>Total <Text style={styles.splitTotalValue}>UGX {show(online + cash)}</Text></Text>
    </View>
  );
}

const KIND: Record<string, { title: string; icon: string; tone: Tone }> = {
  commission: { title: 'Commission earned', icon: 'coins', tone: 'success' },
  cash_collected: { title: 'Cash collected', icon: 'hand-holding-usd', tone: 'warning' },
  cash_handover: { title: 'Cash handed in', icon: 'check-circle', tone: 'info' },
  reversal: { title: 'Wash reversed', icon: 'undo', tone: 'error' },
  correction: { title: 'Price corrected', icon: 'wrench', tone: 'neutral' },
  withdrawal: { title: 'Withdrawal', icon: 'arrow-up', tone: 'accent' },
  withdrawal_fee: { title: 'Withdrawal fee', icon: 'receipt', tone: 'neutral' },
  withdrawal_reversal: { title: 'Withdrawal returned', icon: 'undo', tone: 'info' },
  adjust: { title: 'Wallet adjusted', icon: 'sliders-h', tone: 'neutral' },
};

/** "car NTD-87 (Saloon, Full car wash)" — enough for the worker to know which car. */
function carLabel(r: any) {
  const what = [r.vehicle_class_name, r.service_name].filter(Boolean).join(', ');
  if (!r.job_no) return what ? `a car (${what})` : 'a car';
  // Non-breaking hyphen: "NTD-101" must not wrap as "NTD-" / "101".
  const job = String(r.job_no).replace(/-/g, '‑');
  return what ? `car ${job} (${what})` : `car ${job}`;
}

/**
 * One wallet movement written the way a mobile-money message reads: a plain
 * sentence with the amount picked out, rather than a label and a number.
 */
function Message({ r }: { r: any }) {
  const amt = Number(r.amount_ugx || 0);
  const money = <Text style={[styles.money, amt > 0 && styles.moneyIn]}>UGX {ugx(Math.abs(amt))}</Text>;
  const moved = amt >= 0 ? 'added to' : 'taken off';
  // The server's default reasons only restate the title — leave them out.
  const why = r.reason && !/^(wash reversed|wash corrected|cash collected from client|cash received by manager)\.?$/i.test(r.reason)
    ? ` Reason: ${r.reason.replace(/\.$/, '')}.`
    : '';

  switch (r.kind) {
    case 'commission':
      return <>You earned {money} for washing {carLabel(r)}.</>;
    case 'cash_collected':
      return <>You collected {money} in cash for {carLabel(r)}.</>;
    case 'cash_handover':
      return <>{r.created_by_name || 'Your manager'} confirmed receiving {money} in cash from you.{why}</>;
    case 'reversal':
      return <>{carLabel(r).replace(/^c/, 'C')} was reversed, so {money} was {moved} your wallet.{why}</>;
    case 'correction':
      return <>The price of {carLabel(r)} was corrected, so {money} was {moved} your wallet.{why}</>;
    case 'withdrawal':
      return <>You withdrew {money}.{why}</>;
    case 'withdrawal_fee':
      return <>A fee of {money} was charged for your withdrawal.</>;
    case 'withdrawal_reversal':
      return <>Your withdrawal didn't go through, so {money} is back in your account.</>;
    case 'adjust':
      return <>{r.created_by_name || 'The car wash'} adjusted your wallet: {money} {moved} it.{why}</>;
    default:
      return <>{money} was {moved} your wallet.{why}</>;
  }
}

export default function AccountScreen() {
  return (
    <ReportScreen
      title="My Account"
      subtitle="What you've earned and what you owe"
      load={() => api.myWallet()}
      render={(w) => (w ? <WalletBody w={w} /> : null)}
    />
  );
}

/** The page body — a component so the eye's hidden state covers every amount on it. */
function WalletBody({ w }: { w: any }) {
  const [hidden, setHidden] = React.useState(false);
  const ledger: any[] = w.ledger || [];

  return (
    <View style={{ gap: spacing.lg }}>
      <WalletSections w={w} hidden={hidden} onToggleHidden={() => setHidden((h) => !h)} />

      <CommissionSection c={w.commission} hidden={hidden} />

      {/* Every movement, as a feed of messages grouped by day */}
      <View>
        <SectionHeader title="Activity" />
        {ledger.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="wallet" title="No activity yet" message="Your commission shows here after your first car is paid." />
          </Surface>
        ) : (
          ledger.map((r: any, i: number) => {
            const m = KIND[r.kind] || { title: 'Wallet changed', icon: 'circle', tone: 'neutral' as Tone };
            const day = dayLabel(r.created_at);
            const newDay = i === 0 || dayLabel(ledger[i - 1].created_at) !== day;
            return (
              <React.Fragment key={r.id}>
                {newDay ? <Text style={[styles.day, i === 0 && { marginTop: 0 }]}>{day}</Text> : null}
                <View style={styles.msg}>
                  <View style={[styles.msgIcon, { backgroundColor: toneMap[m.tone].bg }]}>
                    <Icon name={m.icon} size={19} color={toneMap[m.tone].fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.msgHead}>
                      <Text style={styles.msgTitle} numberOfLines={1}>{m.title}</Text>
                      <Text style={styles.msgTime}>{timeLabel(r.created_at)}</Text>
                    </View>
                    <Text style={styles.msgBody}><Message r={r} /></Text>
                  </View>
                </View>
              </React.Fragment>
            );
          })
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Account — runs edge to edge from the header (cancelling the screen's
  // padding) with only its bottom corners rounded.
  account: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.bgCard,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    ...shadow.sm,
  },
  accountHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountTitle: { ...staffType.rowTitle },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.md },
  amountPrefix: { fontSize: 17, fontWeight: weight.bold, color: staffText.muted },
  amount: { fontSize: 44, lineHeight: 52, fontWeight: weight.bold, color: colors.text, letterSpacing: -0.5, ...staffType.tabular },
  accountCaption: { ...staffType.secondary, marginTop: 2 },
  withdrawBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    height: 50, borderRadius: 16, marginTop: spacing.lg,
    backgroundColor: colors.text,
  },
  withdrawText: { fontSize: 17, lineHeight: 22, fontWeight: weight.semibold, color: '#fff' },
  soon: {
    fontSize: font.micro, fontWeight: weight.heavy, color: '#fff',
    backgroundColor: colors.accent, borderRadius: 999, overflow: 'hidden',
    paddingHorizontal: 7, paddingVertical: 2, marginLeft: 2,
  },

  // Cash to hand in — a separate line of its own
  cash: {
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.lg,
  },
  cashRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cashIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cashTitle: { ...staffType.rowTitle, fontSize: 16 },
  cashSub: { ...staffType.meta, marginTop: 2 },
  cashAmount: { fontSize: 20, lineHeight: 26, fontWeight: weight.bold, color: colors.warningText, ...staffType.tabular },
  cashAmountZero: { color: staffText.muted },
  cashPrefix: { fontSize: 13, fontWeight: weight.semibold },
  cashFoot: {
    ...staffType.meta,
    marginTop: spacing.md, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },

  // Commission earned — online and cash side by side, never one number
  splitRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  splitTile: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  splitIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  splitLabel: { ...staffType.label, color: staffText.secondary, marginTop: spacing.sm },
  splitValue: { ...staffType.figure, marginTop: 2 },
  splitNote: { ...staffType.meta, marginTop: 2 },
  splitTotal: { ...staffType.secondary, marginTop: spacing.sm, textAlign: 'right' },
  splitTotalValue: { fontWeight: weight.bold, color: colors.text, ...staffType.tabular },

  // Activity — set like a phone's messages: the system font at its regular
  // weight, a readable size and line height; only the title and the amount
  // are heavier.
  day: {
    ...staffType.caption,
    marginTop: spacing.lg, marginBottom: spacing.sm, marginLeft: 2,
  },
  msg: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 18,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  msgIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  msgHead: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  msgTitle: { ...staffType.rowTitle, fontSize: 16, flex: 1 },
  msgTime: { ...staffType.meta, ...staffType.tabular },
  msgBody: { ...staffType.secondary, marginTop: 3 },
  money: { fontWeight: weight.semibold, color: colors.text, ...staffType.tabular },
  moneyIn: { color: colors.successText },
});
