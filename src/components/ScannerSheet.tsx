import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Platform,
  KeyboardAvoidingView, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../theme';
import Icon from './Icon';
import GradientButton from './GradientButton';
import { Field } from './ui';

/**
 * ScannerSheet — the worker's QR reader.
 *
 * expo-camera cannot scan barcodes on web (SDK 57), so this always offers a
 * manual-entry path alongside the camera. On web the manual field IS the
 * interface; on device the camera leads and manual is the fallback for a dead
 * phone or a scuffed code.
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
  /** Optional controls rendered under the hint (e.g. a redeem toggle). */
  extra?: React.ReactNode;
}) {
  const webNoCamera = Platform.OS === 'web';
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [showManual, setShowManual] = useState(webNoCamera);
  // Guard so a single QR in frame does not fire the callback dozens of times.
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (visible) {
      setManual('');
      setLocked(false);
      setShowManual(webNoCamera);
    }
  }, [visible, webNoCamera]);

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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

          <View style={styles.sheet}>
            <View style={styles.grabber} />

            <View style={styles.head}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                <Icon name="times" size={13} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}

            {extra}

            {/* ── Camera ── */}
            {!showManual && (
              <View style={styles.cameraWrap}>
                {!permission ? (
                  <View style={styles.cameraFallback}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : !permission.granted ? (
                  <View style={styles.cameraFallback}>
                    <View style={styles.fallbackIcon}>
                      <Icon name="camera" size={20} color={colors.textMuted} />
                    </View>
                    <Text style={styles.fallbackTitle}>Camera access needed</Text>
                    <Text style={styles.fallbackText}>
                      Allow the camera so you can scan the customer's code.
                    </Text>
                    <GradientButton
                      title="Allow camera"
                      onPress={requestPermission}
                      icon="camera"
                      full
                      style={{ marginTop: spacing.md }}
                    />
                  </View>
                ) : (
                  <View style={styles.cameraBox}>
                    <CameraView
                      style={StyleSheet.absoluteFill as any}
                      facing="back"
                      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                      onBarcodeScanned={locked || busy ? undefined : handleBarcode}
                    />
                    {/* Reticle */}
                    <View style={styles.reticle} pointerEvents="none">
                      <View style={[styles.corner, styles.tl]} />
                      <View style={[styles.corner, styles.tr]} />
                      <View style={[styles.corner, styles.bl]} />
                      <View style={[styles.corner, styles.br]} />
                    </View>
                    {(locked || busy) && (
                      <View style={styles.scanningOverlay}>
                        <ActivityIndicator color="#fff" />
                        <Text style={styles.scanningText}>Reading code…</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

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

            {/* Toggle between the two — hidden on web where there is no camera */}
            {allowManual && !webNoCamera && (
              <TouchableOpacity
                onPress={() => setShowManual((s) => !s)}
                style={styles.switchBtn}
                activeOpacity={0.7}
              >
                <Icon name={showManual ? 'qrcode' : 'keyboard'} size={12} color={colors.primary} />
                <Text style={styles.switchText}>
                  {showManual ? 'Scan the code instead' : 'Enter the code manually'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(11,14,28,0.6)' },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    ...shadow.lg,
  },
  grabber: { width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1, fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  closeBtn: {
    width: 30, height: 30, borderRadius: radii.full,
    backgroundColor: colors.bgSunken, alignItems: 'center', justifyContent: 'center',
  },
  hint: { fontSize: font.sm, color: colors.textMuted, marginTop: 3, lineHeight: 18 },

  cameraWrap: { marginTop: spacing.lg },
  cameraBox: {
    aspectRatio: 1,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: colors.ink[950],
  },
  reticle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, margin: '14%' },
  corner: { position: 'absolute', width: 32, height: 32, borderColor: '#fff' },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },
  scanningOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(11,14,28,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  scanningText: { color: '#fff', fontSize: font.sm, fontWeight: weight.bold },

  cameraFallback: {
    aspectRatio: 1.35,
    borderRadius: radii.xl,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl,
    gap: 4,
  },
  fallbackIcon: {
    width: 48, height: 48, borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  fallbackTitle: { fontSize: font.regular, fontWeight: weight.heavy, color: colors.text },
  fallbackText: { fontSize: font.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },

  manualWrap: { marginTop: spacing.lg, gap: spacing.lg },
  webNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 7,
    backgroundColor: colors.infoSoft, borderRadius: radii.md,
    padding: spacing.md,
  },
  webNoteText: { flex: 1, fontSize: font.xs, color: colors.info, lineHeight: 17, fontWeight: weight.medium },

  switchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: spacing.md, marginTop: spacing.md,
  },
  switchText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.primary },
});
