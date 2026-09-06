import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, tracking, shadow } from '../../theme';
import ScreenHeader from '../../components/ScreenHeader';
import Icon from '../../components/Icon';
import { Surface, EmptyState, Skeleton } from '../../components/ui';

export default function MyCodeScreen() {
  const { actor } = useAuth();
  const [qr, setQr] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.clientQR();
      setQr(r);
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const code: string | undefined = qr?.member_code;
  // Group the code into readable blocks — long unbroken strings are hard to read aloud.
  const pretty = code ? code.replace(/(.{4})/g, '$1 ').trim() : '';

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Code" subtitle="Show this at the bay" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {!loaded ? (
          <Surface elevation="md" padded="lg" style={{ alignItems: 'center', gap: spacing.lg }}>
            <Skeleton width={180} height={180} radius={radii.lg} />
            <Skeleton width={140} height={16} />
          </Surface>
        ) : !code ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState
              icon="exclamation-triangle"
              title="Could not load your code"
              message="Pull down to try again."
            />
          </Surface>
        ) : (
          <>
            {/* Membership card — a real object, not a text box */}
            <LinearGradient
              colors={[colors.ink[800], colors.ink[950]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.card}
            >
              <View style={styles.bloom} pointerEvents="none" />

              <View style={styles.cardHead}>
                <View>
                  <Text style={styles.brand}>MEMBER CARD</Text>
                  <Text style={styles.org} numberOfLines={1}>{actor?.org_name || 'Car Wash'}</Text>
                </View>
                <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
                  <Icon name="id-card" size={13} color="#fff" />
                </LinearGradient>
              </View>

              {/* QR on a white plate so scanners get maximum contrast */}
              <View style={styles.qrPlate}>
                <QRCode value={code} size={168} color={colors.ink[950]} backgroundColor="#FFFFFF" />
              </View>

              <View style={styles.codeBlock}>
                <Text style={styles.codeLabel}>MEMBER CODE</Text>
                <Text style={styles.code} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {pretty}
                </Text>
              </View>

              <View style={styles.cardFoot}>
                <Text style={styles.holder} numberOfLines={1}>
                  {(qr?.name || actor?.full_name || actor?.username || '').toUpperCase()}
                </Text>
              </View>
            </LinearGradient>

            {/* How to use it */}
            <Surface elevation="sm" style={{ gap: spacing.md }}>
              <Step n={1} text="Show this card to the worker when you arrive." />
              <Step n={2} text="They scan it to link the wash to your account." />
              <Step n={3} text="Your loyalty progress updates automatically." />
            </Surface>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  card: {
    borderRadius: radii.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    overflow: 'hidden',
    ...shadow.lg,
  },
  bloom: {
    position: 'absolute', top: -90, right: -60,
    width: 210, height: 210, borderRadius: 105,
    backgroundColor: 'rgba(233,30,99,0.20)',
  },
  cardHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    alignSelf: 'stretch', marginBottom: spacing.xl,
  },
  brand: { fontSize: font.micro, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.5)', letterSpacing: tracking.capsWide },
  org: { fontSize: font.regular, fontWeight: weight.heavy, color: '#fff', marginTop: 2, letterSpacing: tracking.tight },
  chip: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },

  qrPlate: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: radii.lg,
  },

  codeBlock: { alignItems: 'center', marginTop: spacing.xl, alignSelf: 'stretch' },
  codeLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: 'rgba(255,255,255,0.45)', letterSpacing: tracking.capsWide },
  code: {
    fontSize: font.display, fontWeight: weight.black, color: '#fff',
    letterSpacing: 3, marginTop: 4,
  },

  cardFoot: {
    alignSelf: 'stretch', marginTop: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)',
  },
  holder: { fontSize: font.sm, fontWeight: weight.bold, color: 'rgba(255,255,255,0.75)', letterSpacing: tracking.caps },

  step: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepNum: {
    width: 24, height: 24, borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNumText: { fontSize: font.xs, fontWeight: weight.black, color: colors.primary },
  stepText: { flex: 1, fontSize: font.sm, color: colors.textSecondary, lineHeight: 18 },
});
