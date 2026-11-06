import React from 'react';
import { View, StyleSheet } from 'react-native';
import { tint } from '../../theme';
import { Chip, Chips, Tile } from '../../components/admin/kit';
import { compact } from './adminData';

export type TopData = {
  branchLabel: string;
  onPickBranch: () => void;
  gross: number;
  washes: number;
  washDelta: number | null;
  lastWeekday: string;
  held: number;
  holders: number;
  free: number;
  freeValue: number;
};

const deltaText = (delta: number | null, day: string) =>
  delta === null ? `Nothing last ${day} by now`
    : delta === 0 ? `Same as last ${day}`
    : `${Math.abs(delta)}% ${delta > 0 ? 'above' : 'below'} last ${day}`;

/**
 * The top of the admin Home: the branch picker, then today's four figures
 * as colour-tinted tiles, each with its icon on a white chip.
 */
export default function HomeTop({ d }: { d: TopData }) {
  return (
    <>
      <Chips>
        <Chip label={d.branchLabel} caret onPress={d.onPickBranch} />
      </Chips>
      <View style={s.grid}>
        <View style={s.row}>
          <View style={s.cell}>
            <Tile icon="car" tone="primary" label="Washes" value={String(d.washes)}
              sub={deltaText(d.washDelta, d.lastWeekday)}
              subColor={d.washDelta ? (d.washDelta > 0 ? tint.success.text : tint.error.text) : undefined} />
          </View>
          <View style={s.cell}>
            <Tile icon="coins" tone="info" label="Revenue" value={compact(d.gross)} sub="UGX today" />
          </View>
        </View>
        <View style={s.row}>
          <View style={s.cell}>
            <Tile icon="money-bill-wave" tone="warning" label="Cash out" value={compact(d.held)}
              valueColor={d.held > 0 ? tint.warning.text : undefined}
              sub={d.holders ? `${d.holders} staff holding` : 'All handed in'} />
          </View>
          <View style={s.cell}>
            <Tile icon="gift" tone="success" label="Free washes" value={String(d.free)} sub={`UGX ${compact(d.freeValue)} in rewards`} />
          </View>
        </View>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1 },
});
