import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
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
 * The live alert, exposed so a component that owns a native Modal can render
 * the dialog inside its own window.
 *
 * On web everything shares one DOM tree, so the provider's absolute overlay
 * covers whatever is on screen. On Android a Modal is a separate native
 * window that sits above the entire React tree — nothing in the app below it
 * can paint over it, at any zIndex. So a sheet renders <AlertHost/> inside
 * its own Modal, and the same alert state appears there instead.
 */
const AlertStateCtx = createContext<{
  state: AlertState;
  handlePress: (btn: AlertButton) => void;
} | null>(null);

/**
 * Renders the current alert wherever it is placed. Put this inside any Modal
 * that can raise an alert, so the message is not trapped behind that Modal.
 * Renders nothing when no alert is showing.
 */
export function AlertHost() {
  const ctx = useContext(AlertStateCtx);
  if (!ctx || !ctx.state.visible) return null;
  return <AlertBody state={ctx.state} onPress={ctx.handlePress} />;
}

/** The dialog itself — one definition, rendered by the provider or a host. */
function AlertBody({
  state, onPress,
}: { state: AlertState; onPress: (btn: AlertButton) => void }) {
  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.card}>
        <Text style={styles.title}>{state.title}</Text>
        {state.message ? <Text style={styles.message}>{state.message}</Text> : null}
        <View style={styles.buttonRow}>
          {state.buttons.map((btn, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => onPress(btn)}
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
  );
}

/**
 * React Native Web's Alert.alert() is a no-op — it never shows anything in
 * the browser. This provides an identical-looking confirm/message dialog
 * that actually renders on web and on device.
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
      <AlertStateCtx.Provider value={{ state, handlePress }}>
        {children}
        {/*
          An absolutely-positioned overlay, not a Modal.

          This provider sits above the navigator, so a Modal here would be
          created earlier in the tree than any Modal a screen opens later —
          and modals stack in creation order. A validation alert raised from
          inside a FormSheet rendered *behind* that sheet: the app looked
          frozen, and the message only appeared once the sheet was dismissed.

          An absolute View declared after {children} paints above its
          siblings, which fixes it everywhere the app shares one tree. An
          Android Modal is its own native window and still sits above this —
          those sheets render <AlertHost/> inside themselves to cover it.
        */}
        {state.visible ? <AlertBody state={state} onPress={handlePress} /> : null}
      </AlertStateCtx.Provider>
    </Ctx.Provider>
  );
}

export function useAppAlert() {
  return useContext(Ctx).alert;
}

const styles = StyleSheet.create({
  // Absolutely positioned rather than flex:1 — as a sibling of the whole app
  // it has to cover the screen itself rather than fill a parent. The high
  // zIndex/elevation keeps it above anything a screen renders, including the
  // native Modal a FormSheet opens.
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    zIndex: 9999,
    elevation: 9999,
  },
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
