import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../theme';
import Icon from './Icon';
import GradientButton from './GradientButton';

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TokenQRCard({
  token,
  expiresAt,
  onExpire,
  onRegenerate,
  regenerating,
}: {
  token: string;
  expiresAt: string;
  onExpire?: () => void;
  onRegenerate: () => void;
  regenerating?: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const expiredFiredRef = useRef(false);
  const expiresAtMs = new Date(expiresAt).getTime();
  const remainingMs = expiresAtMs - now;
  const expired = remainingMs <= 0;
  const warningZone = !expired && remainingMs < 30000;
  const totalWindowMs = 3 * 60 * 1000;
  const progress = Math.max(0, Math.min(1, remainingMs / totalWindowMs));

  useEffect(() => {
    expiredFiredRef.current = false;
    setNow(Date.now());
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (expired && !expiredFiredRef.current) {
      expiredFiredRef.current = true;
      onExpire?.();
    }
  }, [expired, onExpire]);

  if (expired) {
    return (
      <View style={styles.card}>
        <View style={styles.expiredIcon}>
          <Icon name="lock" size={22} color={colors.textMuted} />
        </View>
        <Text style={styles.expiredTitle}>Code expired</Text>
        <Text style={styles.expiredSub}>This code can no longer be scanned.</Text>
        <GradientButton
          title="Show new code"
          onPress={onRegenerate}
          loading={regenerating}
          icon="sync-alt"
          size="lg"
          full
          style={{ marginTop: spacing.lg }}
        />
      </View>
    );
  }

  const accent = warningZone ? colors.error : colors.success;

  return (
    <View style={styles.card}>
      {/* Live status — tells the client whether to hurry */}
      <View style={[styles.status, { backgroundColor: warningZone ? colors.errorSoft : colors.successSoft }]}>
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <Text style={[styles.statusText, { color: accent }]}>
          {warningZone ? 'Expiring — ask the attendant to scan now' : 'Ready to scan'}
        </Text>
      </View>

      {/* White plate maximises scanner contrast regardless of surrounding theme */}
      <View style={styles.qrPlate}>
        <QRCode value={token} size={196} color={colors.ink[950]} backgroundColor="#FFFFFF" />
      </View>

      {/* Countdown as a shrinking bar plus a monospaced-feel timer */}
      <View style={styles.timerRow}>
        <Text style={styles.timerLabel}>EXPIRES IN</Text>
        <Text style={[styles.timer, warningZone && { color: colors.error }]}>
          {formatCountdown(remainingMs)}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    alignSelf: 'stretch',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...shadow.md,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radii.full,
    paddingVertical: 7,
    paddingHorizontal: 13,
    marginBottom: spacing.lg,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: font.xs, fontWeight: weight.heavy, letterSpacing: 0.1 },

  qrPlate: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: radii.lg,
  },

  timerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  timerLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  timer: { fontSize: font.xl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.tight },
  track: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radii.full },

  expiredIcon: {
    width: 54, height: 54, borderRadius: radii.full,
    backgroundColor: colors.bgSunken,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  expiredTitle: { fontSize: font.lg, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },
  expiredSub: { fontSize: font.sm, color: colors.textMuted, marginTop: 3, textAlign: 'center' },
});
