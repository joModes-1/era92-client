import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radii, font, spacing } from '../theme';

type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type AlertState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
};

type AlertCtx = {
  alert: (title: string, message?: string, buttons?: AlertButton[]) => void;
};

const Ctx = createContext<AlertCtx>(null!);

/**
 * React Native Web's Alert.alert() is a no-op — it never shows anything in
 * the browser. This provides an identical-looking confirm/message dialog
 * that actually renders on web (and native, via the same Modal).
 */
export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AlertState>({ visible: false, title: '', buttons: [] });
  const resolverRef = useRef<(() => void) | null>(null);

  const alert = useCallback((title: string, message?: string, buttons: AlertButton[] = [{ text: 'OK' }]) => {
    setState({ visible: true, title, message, buttons });
  }, []);

  const close = () => setState((s) => ({ ...s, visible: false }));

  const handlePress = (btn: AlertButton) => {
    close();
    btn.onPress?.();
  };

  return (
    <Ctx.Provider value={{ alert }}>
      {children}
      <Modal visible={state.visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>{state.title}</Text>
            {state.message ? <Text style={styles.message}>{state.message}</Text> : null}
            <View style={styles.buttonRow}>
              {state.buttons.map((btn, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handlePress(btn)}
                  style={[
                    styles.button,
                    btn.style === 'cancel' && styles.buttonCancel,
                    btn.style === 'destructive' && styles.buttonDestructive,
                    btn.style !== 'cancel' && btn.style !== 'destructive' && styles.buttonDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      btn.style === 'cancel' && styles.buttonTextCancel,
                      btn.style === 'destructive' && styles.buttonTextDestructive,
                      btn.style !== 'cancel' && btn.style !== 'destructive' && styles.buttonTextDefault,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </Ctx.Provider>
  );
}

export function useAppAlert() {
  return useContext(Ctx).alert;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: { backgroundColor: '#fff', borderRadius: radii.lg, padding: spacing.lg, width: '100%', maxWidth: 380 },
  title: { fontSize: font.lg, fontWeight: '800', color: colors.text, marginBottom: 6 },
  message: { fontSize: font.regular, color: colors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, flexWrap: 'wrap' },
  button: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radii.md },
  buttonDefault: { backgroundColor: colors.primary },
  buttonCancel: { backgroundColor: colors.bgInput },
  buttonDestructive: { backgroundColor: colors.error },
  buttonText: { fontWeight: '700', fontSize: font.regular },
  buttonTextDefault: { color: '#fff' },
  buttonTextCancel: { color: colors.textSecondary },
  buttonTextDestructive: { color: '#fff' },
});
