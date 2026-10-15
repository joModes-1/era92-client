import React from 'react';
import { Modal, View, Text, Image, StyleSheet, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, font, spacing, weight } from '../../theme';
import ComponentButton1 from '../../components/buttons/ComponentButton1';
import Icon from '../../components/Icon';
import { artFor } from './serviceArt';

// UI-only until a real client points system exists: 1 point per UGX 100.
export const pointsForAmount = (ugx: number) => Math.floor(Number(ugx || 0) / 100);

export type PointsEntry = { id: string; title: string; subtitle: string; points: number };

/** "You have N points" sheet with recent point earnings and a Redeem button. */
export default function PointsSheet({
  visible, balance, entries, onClose, onRedeem,
}: {
  visible: boolean;
  balance: number;
  entries: PointsEntry[];
  onClose: () => void;
  onRedeem: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <TouchableOpacity onPress={onClose} hitSlop={12} style={s.close} activeOpacity={0.6}>
          <Text style={s.closeText}>Close</Text>
        </TouchableOpacity>

        <LinearGradient colors={['#FCE4F4', '#FFF1E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.card}>
          <LinearGradient
            colors={['#FF8A00', '#FF2D6F', '#B000FF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.badge}
          >
            <Icon name="award" size={24} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={s.youHave}>You have</Text>
            <Text style={s.balance}>{balance.toLocaleString()} points</Text>
            <Text style={s.program}>era92 loyalty</Text>
          </View>
        </LinearGradient>

        <Text style={s.sectionTitle}>Recent Points</Text>
        <ScrollView style={s.list} contentContainerStyle={{ gap: spacing.sm }} showsVerticalScrollIndicator={false}>
          {entries.length === 0 ? (
            <Text style={s.empty}>No points yet — complete a wash to start earning.</Text>
          ) : entries.map((e) => (
            <View key={e.id} style={s.row}>
              <View style={s.thumb}>
                <Image source={artFor(e.title).image} style={s.thumbImage} resizeMode="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle} numberOfLines={1}>{e.title}</Text>
                <Text style={s.rowSub} numberOfLines={1}>{e.subtitle}</Text>
              </View>
              <Text style={s.rowPoints}>+{e.points.toLocaleString()} Points</Text>
            </View>
          ))}
        </ScrollView>

        <ComponentButton1 title="Redeem points" onPress={onRedeem} disabled={balance <= 0} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
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
});
