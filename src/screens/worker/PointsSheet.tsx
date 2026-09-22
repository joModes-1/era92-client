import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import Icon from '../../components/Icon';
import GradientButton from '../../components/GradientButton';

/**
 * The worker's points balance and how they earned it.
 *
 * Opens from the points pill on the home screen. Deliberately a sheet
 * rather than a page: it is a glance at a running total, not somewhere a
 * worker needs to navigate into and back out of during a shift.
 */
export default function PointsSheet({
  visible,
  onClose,
  balance,
  history,
  canRedeem,
  minRedeem,
  onRedeem,
  redeeming,
}: {
  visible: boolean;
  onClose: () => void;
  balance: number;
  history: any[];
  canRedeem?: boolean;
  minRedeem?: number | null;
  onRedeem?: () => void;
  redeeming?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const n = (v: any) => Number(v || 0).toLocaleString();

  const whenLabel = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `Completed · ${d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={[s.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <TouchableOpacity onPress={onClose} style={s.close} hitSlop={10} activeOpacity={0.6}>
            <Text style={s.closeText}>Close</Text>
          </TouchableOpacity>

          {/* The balance leads — it is the reason the sheet was opened. */}
          <View style={s.balanceRow}>
            <LinearGradient
              colors={colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.balanceBadge}
            >
              <Icon name="star" size={19} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={s.balanceLabel}>You have</Text>
              <Text style={s.balanceValue}>{n(balance)} points</Text>
              <Text style={s.balanceBrand}>era92 loyalty</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Recent Points</Text>

          <ScrollView
            style={s.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {history.length === 0 ? (
              <View style={s.empty}>
                <Icon name="star" size={18} color={colors.textMuted} />
                <Text style={s.emptyTitle}>No points yet</Text>
                <Text style={s.emptyText}>
                  Finish a wash and take payment — points land straight away.
                </Text>
              </View>
            ) : (
              history.map((h: any) => {
                const delta = Number(h.points_delta || 0);
                const earned = delta > 0;
                return (
                  <View key={h.id} style={s.row}>
                    <View style={s.rowIcon}>
                      <Icon name="car" size={13} color={colors.textSecondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rowTitle} numberOfLines={1}>
                        {h.reason || labelFor(h.entry_type)}
                      </Text>
                      <Text style={s.rowSub} numberOfLines={1}>
                        {h.job_no ? `#${h.job_no} · ` : ''}{whenLabel(h.created_at)}
                      </Text>
                    </View>
                    <Text style={[s.rowDelta, !earned && s.rowDeltaOut]}>
                      {earned ? '+' : ''}{n(delta)} Points
                    </Text>
                  </View>
                );
              })
            )}
          </ScrollView>

          {onRedeem ? (
            <View style={s.footer}>
              <GradientButton
                title="Redeem points"
                onPress={onRedeem}
                disabled={!canRedeem}
                loading={redeeming}
                size="lg"
                full
              />
              {!canRedeem && minRedeem ? (
                <Text style={s.footNote}>
                  You need {n(minRedeem)} points to redeem.
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

/** A readable name for a ledger entry that carries no reason of its own. */
function labelFor(entryType: string): string {
  switch (entryType) {
    case 'earn': return 'Wash completed';
    case 'redeem': return 'Points redeemed';
    case 'reversal': return 'Wash reversed';
    case 'bonus': return 'Bonus';
    case 'manual_adjust': return 'Adjustment';
    default: return 'Points';
  }
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,14,28,0.6)',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    maxHeight: '86%',
    ...shadow.lg,
  },
  close: { alignSelf: 'flex-end', paddingVertical: 4, paddingHorizontal: 4 },
  closeText: { fontSize: font.sm, fontWeight: weight.semibold, color: colors.primary },

  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  balanceBadge: {
    width: 52, height: 52, borderRadius: radii.full,
    alignItems: 'center', justifyContent: 'center',
  },
  balanceLabel: { fontSize: font.sm, color: colors.primaryDark, fontWeight: weight.semibold },
  balanceValue: {
    fontSize: font.display,
    fontWeight: weight.black,
    color: colors.text,
    letterSpacing: tracking.display,
  },
  balanceBrand: { fontSize: font.xs, color: colors.textMuted, marginTop: 1 },

  sectionTitle: {
    fontSize: font.regular,
    fontWeight: weight.heavy,
    color: colors.text,
    letterSpacing: tracking.tight,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },

  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadow.xs,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: radii.sm,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
  },
  rowTitle: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  rowSub: { fontSize: font.micro, color: colors.textMuted, marginTop: 2 },
  rowDelta: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.primary },
  rowDeltaOut: { color: colors.textMuted },

  empty: { alignItems: 'center', gap: 6, paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text },
  emptyText: {
    fontSize: font.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.lg,
  },

  footer: { paddingTop: spacing.lg, gap: 6 },
  footNote: { fontSize: font.xs, color: colors.textMuted, textAlign: 'center' },
});
