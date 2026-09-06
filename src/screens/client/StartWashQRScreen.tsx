import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../api/AuthContext';
import { api } from '../../api';
import { colors, font, spacing, weight, tracking } from '../../theme';
import TokenQRCard from '../../components/TokenQRCard';
import { useAppAlert } from '../../components/AppAlert';
import ScanScreenShell from './ScanScreenShell';
import Icon from '../../components/Icon';

export default function StartWashQRScreen() {
  const { actor } = useAuth();
  const navigation = useNavigation<any>();
  const alert = useAppAlert();
  const [tokenData, setTokenData] = useState<{ token: string; expires_at: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const doneRef = useRef(false);

  const fetchToken = useCallback(async () => {
    try {
      const data = await api.startToken();
      setTokenData(data);
    } catch (e: any) {
      alert('Could not generate code', e.message);
    }
  }, []);

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
   * Once the worker scans this code the wash exists, so /active starts
   * returning it. Drop back to the home screen, which shows the live status.
   */
  useEffect(() => {
    const timer = setInterval(async () => {
      if (doneRef.current) return;
      try {
        const active = await api.clientActive();
        if (active && active.id) {
          doneRef.current = true;
          clearInterval(timer);
          navigation.goBack();
        }
      } catch {
        // Ignore transient failures and keep watching.
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [navigation]);

  return (
    <ScanScreenShell
      eyebrow={actor?.branch_name || 'Start a wash'}
      title="Show this to the attendant"
      loading={loading}
      hasToken={!!tokenData}
      footer={
        <View style={styles.hint}>
          <Icon name="info-circle" size={11} color={colors.textMuted} />
          <Text style={styles.hintText}>
            The worker scans this to start your wash and link it to your loyalty account.
          </Text>
        </View>
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
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.sm },
  hintText: { flex: 1, fontSize: font.sm, color: colors.textMuted, lineHeight: 18 },
});
