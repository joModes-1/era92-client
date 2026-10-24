import React, { ReactNode } from 'react';
import {
  Modal, View, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ViewStyle, StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, shadow } from '../../theme';
import { AlertHost } from '../AppAlert';

/** The rounded top every bottom sheet in the app shares, per the design. */
export const SHEET_RADIUS = 28;

/**
 * Sheet — a bottom sheet with the design's rounded top corners.
 *
 * The client sheets used to stack the dimmed backdrop ABOVE the sheet in a
 * column. The rounded corners then cut away to whatever sat under the
 * modal — the undimmed white screen — so on a light page the corners read
 * as square. Here the dim covers the whole modal and the sheet floats on
 * top of it, so the corners always curve against the dim.
 *
 * Also pads for the phone's gesture bar, keeps a focused field above the
 * keyboard, and hosts alerts raised from inside it (an Android Modal is its
 * own window — see AlertHost).
 */
export default function Sheet({
  visible, onClose, children, style, dismissable = true,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** False when the sheet asks for a decision that must be made (no tap-outside close). */
  dismissable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={dismissable ? onClose : () => {}}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.fill}>
        <View style={styles.overlay}>
          <Pressable
            style={styles.scrim}
            onPress={dismissable ? onClose : undefined}
            accessibilityLabel={dismissable ? 'Close' : undefined}
          />
          <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }, style]}>
            {children}
          </View>
        </View>
      </KeyboardAvoidingView>
      <AlertHost />
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: '92%',
    ...shadow.lg,
  },
});
