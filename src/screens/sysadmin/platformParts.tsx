import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, tint, jk, staffType } from '../../theme';

/** Shared pieces of the platform admin's Overview and Billing pages. */

export const ugx = (n: any) => Number(n || 0).toLocaleString();

export const compact = (n: number) => {
  const v = Math.abs(n);
  if (v >= 1_000_000) return `${+(n / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 1_000) return `${Math.round(n / 1000)}K`;
  return `${Math.round(n)}`;
};

type T = 'success' | 'info' | 'warning' | 'primary';

/** Three small tinted figures in a row: "0 Paying · 2 On trial · 0 Overdue". */
export function MiniTiles({ items }: { items: { value: string; label: string; tone: T }[] }) {
  return (
    <View style={s.tiles}>
      {items.map((t) => (
        <View key={t.label} style={[s.tile, { backgroundColor: tint[t.tone].bg }]}>
          <Text style={s.tileValue} numberOfLines={1} adjustsFontSizeToFit>{t.value}</Text>
          <Text style={s.tileLabel} numberOfLines={2}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

const AVATAR: T[] = ['info', 'success', 'primary', 'warning'];

/** An organisation's initials in a tinted rounded square. */
export function Initials({ name, index, tone }: { name: string; index: number; tone?: T | 'error' }) {
  const t = tint[tone || AVATAR[index % AVATAR.length]];
  const letters = String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return (
    <View style={[s.av, { backgroundColor: t.bg }]}>
      <Text style={[s.avText, { color: t.text }]}>{letters}</Text>
    </View>
  );
}

/** A section heading with an optional round count, as on the design. */
export function SectionHead({ title, count, countColor }: { title: string; count?: number; countColor?: string }) {
  return (
    <View style={s.head}>
      <Text style={s.headText}>{title}</Text>
      {count != null ? (
        <View style={[s.count, { backgroundColor: countColor || colors.text }]}>
          <Text style={s.countText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tile: { flex: 1, borderRadius: 16, padding: 12 },
  tileValue: { fontSize: 22, lineHeight: 28, ...jk.heavy, color: colors.text, marginBottom: 2, ...staffType.tabular },
  tileLabel: { fontSize: 12, lineHeight: 16, ...jk.semibold, color: colors.textSecondary },

  av: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 14, ...jk.heavy },

  head: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginHorizontal: 2, marginBottom: -4 },
  headText: { fontSize: 18, ...jk.heavy, color: colors.text },
  count: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, ...jk.bold, color: '#fff' },
});
