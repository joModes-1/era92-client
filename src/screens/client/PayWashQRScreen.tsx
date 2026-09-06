import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import TokenQRCard from '../../components/TokenQRCard';
import Icon from '../../components/Icon';
import { useAppAlert } from '../../components/AppAlert';
import { Surface } from '../../components/ui';
import ScanScreenShell from './ScanScreenShell';

const ugx = (n: any) => Number(n || 0).toLocaleString();

export default function PayWashQRScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { actor } = useAuth();
  const alert = useAppAlert();
  const wash = route.params?.wash;

  const [tokenData, setTokenData] = useState<{ token: string; expires_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [paid, setPaid] = useState(false);
  const doneRef = useRef(false);

  const fetchToken = useCallback(async () => {
    try {
      const data = await api.payToken(wash.id);
      setTokenData(data);
    } catch (e: any) {
      alert('Could not generate code', e.message);
    }
  }, [wash?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchToken();
      setLoading(false);
    })();
  }, [fetchToken]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    await fetchToken();
    setRegenerating(false);
  };

  /**
   * Watch for the worker settling this wash. /active only returns jobs that
   * are still in_progress or ready, so the wash dropping out of it means the
   * payment went through — close the screen instead of leaving a dead QR up.
   */
  useEffect(() => {
    if (!wash?.id) return;
    const timer = setInterval(async () => {
      if (doneRef.current) return;
      try {
        const active = await api.clientActive();
        const stillOpen = active && active.id === wash.id;
        if (!stillOpen) {
          doneRef.current = true;
          clearInterval(timer);
          setPaid(true);
          // Let the confirmation land before dropping back.
          setTimeout(() => navigation.goBack(), 1600);
        }
      } catch {
        // Network blip — keep polling rather than closing on a false negative.
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [wash?.id, navigation]);

  // Payment landed — replace the QR with a clear confirmation.
  if (paid) {
    return (
      <ScanScreenShell
        eyebrow={actor?.branch_name || wash?.branch_name || 'Payment'}
        title="Paid"
        loading={false}
        hasToken
      >
        <Surface elevation="md" padded="lg" style={styles.doneCard}>
          <View style={styles.doneIcon}>
            <Icon name="check" size={26} color={colors.success} />
          </View>
          <Text style={styles.doneTitle}>Payment received</Text>
          <Text style={styles.doneSub}>
            Thanks! Your wash is paid for{wash ? ` — UGX ${ugx(wash.quoted_amount_ugx)}` : ''}.
          </Text>
        </Surface>
      </ScanScreenShell>
    );
  }

  return (
    <ScanScreenShell
      eyebrow={`${actor?.branch_name || wash?.branch_name || 'Payment'}${wash?.job_no ? ` · #${wash.job_no}` : ''}`}
      title="Scan to pay"
      loading={loading}
      hasToken={!!tokenData}
      footer={
        wash ? (
          // Amount stays visible below the code so both parties can confirm it.
          <Surface elevation="sm" style={styles.receipt}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Service</Text>
              <Text style={styles.receiptValue} numberOfLines={1}>
                {wash.vehicle_class_name} · {wash.service_name}
              </Text>
            </View>
            {wash.plate ? (
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Plate</Text>
                <Text style={styles.receiptValue}>{wash.plate}</Text>
              </View>
            ) : null}

            <View style={styles.receiptDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>AMOUNT DUE</Text>
              <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                UGX {ugx(wash.quoted_amount_ugx)}
              </Text>
            </View>
          </Surface>
        ) : null
      }
    >
      {tokenData ? (
        <TokenQRCard
          token={tokenData.token}
          expiresAt={tokenData.expires_at}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
        />
      ) : null}
    </ScanScreenShell>
  );
}

const styles = StyleSheet.create({
  receipt: { alignSelf: 'stretch', gap: spacing.sm },
  receiptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  receiptLabel: { fontSize: font.sm, color: colors.textMuted },
  receiptValue: { fontSize: font.sm, fontWeight: weight.bold, color: colors.text, flexShrink: 1, textAlign: 'right' },
  receiptDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight, marginVertical: spacing.xs },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  totalLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  totalValue: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },

  doneCard: { alignSelf: 'stretch', alignItems: 'center', gap: 6 },
  doneIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.successSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  doneTitle: { fontSize: font.xxl, fontWeight: weight.black, color: colors.text, letterSpacing: tracking.display },
  doneSub: { fontSize: font.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },
});
