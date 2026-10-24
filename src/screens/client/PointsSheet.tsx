import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, font, spacing, weight } from '../../theme';
import ComponentButton1 from '../../components/buttons/ComponentButton1';
import Icon from '../../components/Icon';
import { Sheet } from '../../components/ui';
import { artFor } from './serviceArt';

export type PointsEntry = { id: string; title: string; subtitle: string; points: number };

// ─── Shared by this sheet and the Points page ──────────────────────────
// The same card, the same rows and the same "on the way" rule in both, so a
// client sees one number for their points wherever they look.

const ENTRY_LABEL: Record<string, string> = {
  earn: 'Earned', redeem: 'Used', refund: 'Refunded', reversal: 'Taken back', adjust: 'Adjusted',
};

/** "May 14 at 10:20 AM", as the mockup's rows read. */
function dateLabel(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  const day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} at ${time}`;
}

/** The points ledger (GET /me/washes/points/ledger) as rows: earned on paid washes, used at booking, refunded, taken back. */
export function ledgerEntries(rows: any[]): PointsEntry[] {
  return rows.map((r: any, i: number) => ({
    id: `${r.created_at}-${i}`,
    title: r.service_name || (r.entry_type === 'adjust' ? 'Points adjustment' : 'Wash'),
    subtitle: `${ENTRY_LABEL[r.entry_type] || r.entry_type} • ${dateLabel(r.created_at)}`,
    points: Number(r.points_delta),
  }));
}

/**
 * Points on their way: what each car on the go will add once it is paid —
 * the same number its booking showed. The server's own rules decide what
 * counts: the free car of a 2-for-1 pair, a wash paid entirely with points,
 * and a scheme the owner has switched off add nothing.
 */
export function pendingPointsFor(activeList: any[], schemeEnabled?: boolean): PointsEntry[] {
  if (schemeEnabled === false) return [];
  return activeList
    .filter((w: any) =>
      !w.is_redemption
      && Number(w.amount_due_ugx ?? w.quoted_amount_ugx ?? 0) > 0
      && Number(w.client_points_to_award) > 0)
    .map((w: any) => ({
      id: `pending-${w.id}`,
      title: w.service_name || 'Wash',
      subtitle: 'On the way • added when paid',
      points: Number(w.client_points_to_award),
    }));
}

/**
 * The mockup's points card: the balance on a soft pink-to-peach wash beside
 * the award badge, with what is on its way under it. Points only land when
 * a wash is paid, but the booking screen already says what each wash will
 * earn — so "on the way" is what joins the two numbers. It is never added
 * to the balance itself: it cannot be spent yet.
 */
export function PointsBalanceCard({
  balance, worthUgx, onTheWay = 0,
}: { balance: number; worthUgx?: number; onTheWay?: number }) {
  return (
    <LinearGradient colors={['#FCE4F4', '#FFF1E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.card}>
      <LinearGradient
        colors={['#FF8A00', '#FF2D6F', '#B000FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.badge}
      >
        <Icon name="award" size={24} color="#fff" />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={s.youHave}>You have</Text>
        <Text style={s.balance}>{balance.toLocaleString()} points</Text>
        {onTheWay > 0 ? (
          <Text style={s.onTheWay}>+{onTheWay.toLocaleString()} on the way · added when paid</Text>
        ) : null}
        <Text style={s.program}>{worthUgx ? `Worth UGX ${worthUgx.toLocaleString()}` : 'era92 loyalty'}</Text>
      </View>
    </LinearGradient>
  );
}

/** Points rows, the ones on their way first (dashed: booked, not yet in the balance). */
export function PointsRows({ entries, pending = [] }: { entries: PointsEntry[]; pending?: PointsEntry[] }) {
  if (entries.length === 0 && pending.length === 0) {
    return <Text style={s.empty}>No points yet — complete a wash to start earning.</Text>;
  }
  return (
    <>
      {[...pending, ...entries].map((e, i) => {
        const isPending = i < pending.length;
        return (
          <View key={e.id} style={[s.row, isPending && s.rowPending]}>
            <View style={s.thumb}>
              <Image source={artFor(e.title).image} style={s.thumbImage} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle} numberOfLines={1}>{e.title}</Text>
              <Text style={s.rowSub} numberOfLines={1}>{e.subtitle}</Text>
            </View>
            <Text style={[s.rowPoints, e.points < 0 && s.rowPointsOut, isPending && s.rowPointsPending]}>
              {e.points > 0 ? '+' : ''}{e.points.toLocaleString()} Points
            </Text>
          </View>
        );
      })}
    </>
  );
}

/** "You have N points" sheet: the balance and its worth, recent point movements, and Redeem. */
export default function PointsSheet({
  visible, balance, worthUgx, entries, pending = [], onClose, onRedeem,
}: {
  visible: boolean;
  balance: number;
  /** What the balance is worth in UGX, from the owner's point value. */
  worthUgx?: number;
  entries: PointsEntry[];
  /** Points from cars on the go — what each will add once it is paid. */
  pending?: PointsEntry[];
  onClose: () => void;
  onRedeem: () => void;
}) {
  const onTheWay = pending.reduce((sum, e) => sum + e.points, 0);
  return (
    <Sheet visible={visible} onClose={onClose}>
      <TouchableOpacity onPress={onClose} hitSlop={12} style={s.close} activeOpacity={0.6}>
        <Text style={s.closeText}>Close</Text>
      </TouchableOpacity>

      <PointsBalanceCard balance={balance} worthUgx={worthUgx} onTheWay={onTheWay} />

      <Text style={s.sectionTitle}>Recent Points</Text>
      <ScrollView style={s.list} contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false}>
        <PointsRows entries={entries} pending={pending} />
      </ScrollView>

      <ComponentButton1 title="Redeem points" onPress={onRedeem} disabled={balance <= 0} />
    </Sheet>
  );
}


const s = StyleSheet.create({
  close: { alignSelf: 'flex-end', marginBottom: spacing.md },
  closeText: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.text },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  badge: { width: 64, height: 64, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  youHave: { fontSize: font.xs, color: colors.textSecondary },
  balance: { fontSize: font.xl, fontWeight: weight.black, color: '#283B8F', marginVertical: 1 },
  program: { fontSize: font.xs, color: colors.textSecondary },
  onTheWay: { fontSize: font.xs, fontWeight: weight.bold, color: colors.primaryText, marginBottom: 1 },

  sectionTitle: {
    fontSize: font.regular,
    fontWeight: weight.bold,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: { maxHeight: 220, marginBottom: spacing.lg },
  empty: { fontSize: font.sm, color: colors.textMuted, paddingVertical: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  thumb: {
    width: 34, height: 34, borderRadius: radii.sm,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbImage: { width: 28, height: 24 },
  rowTitle: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.text },
  rowSub: { fontSize: font.micro, color: colors.textMuted, marginTop: 2 },
  rowPoints: { fontSize: font.sm, fontWeight: weight.bold, color: colors.primary },
  rowPending: { borderStyle: 'dashed', borderColor: colors.promoBannerBorder, backgroundColor: colors.primarySoft },
  rowPointsPending: { color: colors.primaryText },
  // Points used or taken back read as going out, not in brand violet.
  rowPointsOut: { color: colors.textSecondary },
});
