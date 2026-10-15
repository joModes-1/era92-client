import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Platform,
  KeyboardAvoidingView, ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, font, spacing, weight, tracking } from '../theme';
import Icon from './Icon';
import GradientButton from './GradientButton';
import ComponentButton2 from './buttons/ComponentButton2';
import { AlertHost } from './AppAlert';
import { Field } from './ui';

/**
 * Full-screen QR scanner.
 *
 * Deliberately not a bottom sheet: scanning wants the whole screen and a
 * dark surround, both so the camera feed is the only thing competing for
 * attention and so the bright viewfinder frame stands out enough to aim
 * with. The sheet version left the camera as a small square on a white
 * card, which is a much harder thing to point at a windscreen.
 *
 * expo-camera cannot read barcodes on web (SDK 57), so a manual path is
 * always available. On web that path IS the interface; on a device it is
 * the fallback for a dead phone or a scuffed code.
 */
export default function ScannerSheet({
  visible,
  onClose,
  onScanned,
  title,
  hint,
  manualLabel,
  manualPlaceholder,
  allowManual = true,
  busy,
  extra,
  onWebContinue,
}: {
  visible: boolean;
  onClose: () => void;
  /** Fired with the decoded QR payload, or whatever was typed manually. */
  onScanned: (value: string, viaManual: boolean) => void;
  title: string;
  hint?: string;
  manualLabel?: string;
  manualPlaceholder?: string;
  allowManual?: boolean;
  busy?: boolean;
  /** Optional controls rendered under the frame (e.g. a redeem toggle). */
  extra?: React.ReactNode;
  /**
   * Web only (no camera): render the scanner design with a placeholder frame
   * and make "Enter car details" continue straight on, instead of the
   * manual-code card. Native always uses the real camera flow.
   */
  onWebContinue?: () => void;
}) {
  const webNoCamera = Platform.OS === 'web';
  const webPreview = webNoCamera && !!onWebContinue;
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(webNoCamera && !webPreview);
  const [torch, setTorch] = useState(false);
  // Guard so a single QR in frame does not fire the callback dozens of times.
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (visible) {
      setManual('');
      setLocked(false);
      setTorch(false);
      setShowManual(webNoCamera && !webPreview);
    }
  }, [visible, webNoCamera, webPreview]);

  const handleBarcode = ({ data }: { data: string }) => {
    if (locked || busy) return;
    setLocked(true);
    onScanned(data, false);
  };

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return;
    onScanned(v, true);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        {/* ── Top bar: back, and torch while the camera is live ── */}
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.topBtn} activeOpacity={0.7}>
            <Icon name="chevron-left" size={17} color="#fff" />
          </TouchableOpacity>

          {webPreview || (!showManual && permission?.granted) ? (
            <TouchableOpacity
              onPress={() => setTorch((t) => !t)}
              hitSlop={12}
              style={styles.topBtn}
              activeOpacity={0.7}
            >
              {/* Flash icon with a slash when off, per the design. */}
              <Icon name="bolt" size={15} color={torch ? colors.accent : '#fff'} />
              {!torch ? <View style={styles.torchSlash} /> : null}
            </TouchableOpacity>
          ) : (
            <View style={styles.topBtn} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The floating white pill title from the design. */}
          <View style={styles.titlePill}>
            <Text style={styles.titleText}>{title}</Text>
          </View>

          {/* ── Camera ── */}
          {!showManual && (
            <View style={styles.frameWrap}>
              {webPreview ? (
                <Bracketed>
                  <View style={styles.webFrame} />
                </Bracketed>
              ) : !permission ? (
                <View style={styles.frameFallback}>
                  <ActivityIndicator color="#fff" />
                </View>
              ) : !permission.granted ? (
                <View style={styles.frameFallback}>
                  <View style={styles.fallbackIcon}>
                    <Icon name="camera" size={20} color="rgba(255,255,255,0.7)" />
                  </View>
                  <Text style={styles.fallbackTitle}>Camera access needed</Text>
                  <Text style={styles.fallbackText}>
                    {permission.canAskAgain
                      ? "Allow the camera so you can scan the customer's code."
                      : 'Camera access was turned off for this app. Turn it back on in Settings to scan.'}
                  </Text>
                  {/* Once denied a second time, the OS stops showing its own
                      dialog and requestPermission() silently no-ops — the
                      only way back is the system Settings screen. */}
                  <GradientButton
                    title={permission.canAskAgain ? 'Allow camera' : 'Open Settings'}
                    onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
                    icon="camera"
                    full
                    style={{ marginTop: spacing.lg }}
                  />
                </View>
              ) : (
                <Bracketed>
                  <View style={styles.frame}>
                    <CameraView
                      style={StyleSheet.absoluteFill as any}
                      facing="back"
                      enableTorch={torch}
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={locked || busy ? undefined : handleBarcode}
                    />
                    {(locked || busy) && (
                      <View style={styles.scanningOverlay}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.scanningText}>Reading code…</Text>
                      </View>
                    )}
                  </View>
                </Bracketed>
              )}
            </View>
          )}

          {hint && !showManual && !webPreview ? <Text style={styles.hint}>{hint}</Text> : null}

          {extra ? <View style={styles.extra}>{extra}</View> : null}

          {/* ── Manual entry ── */}
          {showManual && allowManual && (
            <View style={styles.manualWrap}>
              {webNoCamera && (
                <View style={styles.webNote}>
                  <Icon name="info-circle" size={11} color={colors.info} />
                  <Text style={styles.webNoteText}>
                    Scanning needs the phone app. In a browser, type the code instead.
                  </Text>
                </View>
              )}
              <Field
                label={manualLabel || 'Code'}
                value={manual}
                onChangeText={setManual}
                placeholder={manualPlaceholder || 'Paste or type the code'}
                autoCapitalize="characters"
                autoCorrect={false}
                onSubmitEditing={submitManual}
                returnKeyType="go"
                style={{ marginBottom: 0 }}
              />
              <GradientButton
                title="Confirm"
                onPress={submitManual}
                loading={busy}
                disabled={!manual.trim()}
                icon="check"
                size="lg"
                full
              />
            </View>
          )}
        </ScrollView>

        {/* ── Web preview footer: continue straight on (no camera) ── */}
        {webPreview && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.footerNote}>Or enter car details manually</Text>
            <ComponentButton2 title="Enter car details" onPress={onWebContinue!} loading={busy} />
          </View>
        )}

        {/* ── Footer: the manual escape hatch, as in the design ── */}
        {allowManual && !webNoCamera && (
          <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
            <Text style={styles.footerNote}>
              {showManual ? 'Point the camera at the code instead' : 'Or enter car details manually'}
            </Text>
            <ComponentButton2
              title={showManual ? 'Scan the code' : 'Enter car details'}
              onPress={() => setShowManual((s) => !s)}
            />
          </View>
        )}
      </View>

      {/* Scan errors are raised while this is open, and an Android Modal is
          its own native window — without a host here the message would be
          stranded behind the scanner. */}
      <AlertHost />
    </Modal>
  );
}

/** White corner brackets sitting just outside the scan frame, per the design. */
function Bracketed({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bracketWrap}>
      {children}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />
    </View>
  );
}

const BRACKET = 18;
const BRACKET_OFFSET = -10;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  bracketWrap: { width: '100%' },
  corner: { position: 'absolute', width: BRACKET, height: BRACKET, borderColor: '#fff' },
  cornerTL: { top: BRACKET_OFFSET, left: BRACKET_OFFSET, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: BRACKET_OFFSET, right: BRACKET_OFFSET, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: BRACKET_OFFSET, left: BRACKET_OFFSET, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: BRACKET_OFFSET, right: BRACKET_OFFSET, borderBottomWidth: 2, borderRightWidth: 2 },
  webFrame: { width: '100%', aspectRatio: 1, backgroundColor: '#D9D9D9' },
  torchSlash: {
    position: 'absolute',
    width: 2, height: 22,
    backgroundColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  topBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },

  body: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },

  titlePill: {
    backgroundColor: '#fff',
    borderRadius: radii.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 1,
    marginBottom: spacing.xl,
  },
  titleText: {
    fontSize: font.sm,
    fontWeight: weight.heavy,
    color: colors.ink[900],
    letterSpacing: tracking.tight,
  },

  frameWrap: { width: '100%' },
  // The bright border is the aiming aid — it has to be the most visible
  // thing on the screen after the feed itself.
  frame: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    backgroundColor: colors.ink[800],
  },
  frameFallback: {
    width: '100%',
    aspectRatio: 0.92,
    borderRadius: radii.sm,
    backgroundColor: colors.ink[900],
    borderWidth: 3,
    borderColor: colors.ink[700],
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 4,
  },
  fallbackIcon: {
    width: 48, height: 48, borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  fallbackTitle: { fontSize: font.regular, fontWeight: weight.heavy, color: '#fff' },
  fallbackText: {
    fontSize: font.sm,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 18,
  },

  scanningOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,14,28,0.6)',
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  scanningText: { color: '#fff', fontSize: font.sm, fontWeight: weight.bold },

  hint: {
    fontSize: font.sm,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: spacing.lg,
  },
  extra: { width: '100%', marginTop: spacing.lg },

  // Manual entry sits on a light card. The shared Field component styles
  // its label and hint for a light surface, and those become unreadable
  // directly on the near-black scanner background.
  manualWrap: {
    width: '100%',
    gap: spacing.lg,
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  webNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: colors.infoSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  webNoteText: { flex: 1, fontSize: font.xs, color: colors.info, lineHeight: 17, fontWeight: weight.medium },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  footerNote: {
    fontSize: font.xs,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
});
