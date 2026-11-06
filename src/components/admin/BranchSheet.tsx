import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, weight, spacing, jk } from '../../theme';
import Icon from '../Icon';
import { Sheet } from '../ui';
import { Row } from './kit';

export type BranchOption = { id: string; name: string };

/** "All branches" plus each branch, as a bottom sheet. `null` means all. */
export default function BranchSheet({ visible, onClose, branches, value, onPick }: {
  visible: boolean;
  onClose: () => void;
  branches: BranchOption[];
  value: string | null;
  onPick: (id: string | null) => void;
}) {
  const all: (BranchOption | { id: null; name: string })[] = [{ id: null, name: 'All branches' }, ...branches];
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>Show</Text>
      {all.map((b, i) => (
        <Row
          key={b.id ?? 'all'}
          title={b.name}
          last={i === all.length - 1}
          onPress={() => { onPick(b.id); onClose(); }}
          titleStyle={b.id === value ? styles.on : undefined}
          trailing={b.id === value ? <Icon name="check" size={14} color={colors.primary} /> : undefined}
        />
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, ...jk.semibold, color: colors.text, marginBottom: spacing.sm },
  on: { color: colors.primaryText, ...jk.semibold },
});
