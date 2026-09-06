import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader from '../../components/ScreenHeader';
import GradientButton from '../../components/GradientButton';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, Field, StampRow, SkeletonList } from '../../components/ui';

export default function LoyaltySettingsScreen() {
  const alert = useAppAlert();
  const [washesRequired, setWashesRequired] = useState('7');
  const [minAmount, setMinAmount] = useState('0');
  const [creditExpiry, setCreditExpiry] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getLoyaltyConfig();
        setWashesRequired(String(data.washes_required ?? 7));
        setMinAmount(String(data.min_amount_ugx ?? 0));
        setCreditExpiry(data.credit_expiry_days != null ? String(data.credit_expiry_days) : '');
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const washes = parseInt(washesRequired, 10) || 0;

  const handleSave = async () => {
    const wr = parseInt(washesRequired, 10);
    const ma = parseInt(minAmount, 10);
    if (!wr || wr < 1) {
      alert('Invalid value', 'Washes required must be at least 1.');
      return;
    }
    if (isNaN(ma) || ma < 0) {
      alert('Invalid value', 'Minimum amount cannot be negative.');
      return;
    }
    setSaving(true);
    try {
      await api.updateLoyaltyConfig({
        washes_required: wr,
        min_amount_ugx: ma,
        credit_expiry_days: creditExpiry.trim() ? parseInt(creditExpiry, 10) : null,
      });
      alert('Saved', 'Loyalty settings updated.');
    } catch (e: any) {
      alert('Error', e.message);
    }
    setSaving(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Loyalty Settings" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={3} /></ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Loyalty Settings" subtitle="How rewards are earned" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Live preview of the punch card the client will see */}
        <Surface elevation="sm" style={styles.preview}>
          <Text style={styles.previewLabel}>WHAT CUSTOMERS SEE</Text>
          {washes > 0 && washes <= 20 ? (
            <StampRow filled={Math.min(3, washes)} total={washes} />
          ) : (
            <Text style={styles.previewFallback}>
              {washes > 20 ? 'Card too long to preview' : 'Set a wash target below'}
            </Text>
          )}
          <Text style={styles.previewNote}>
            {washes > 0
              ? `${washes} paid washes earn one free wash.`
              : 'Enter how many washes earn a free one.'}
          </Text>
        </Surface>

        <View>
          <SectionHeader title="Earning rules" icon="star" />
          <Surface elevation="sm">
            <Field
              label="Washes required for a free one"
              value={washesRequired}
              onChangeText={setWashesRequired}
              keyboardType="numeric"
              placeholder="7"
              hint={
                washes > 0
                  ? `A weekly customer earns a free wash roughly every ${Math.round((washes / 4.3) * 10) / 10} months.`
                  : undefined
              }
            />

            <Field
              label="Minimum amount to count"
              value={minAmount}
              onChangeText={setMinAmount}
              keyboardType="numeric"
              placeholder="0"
              prefix="UGX"
              hint="Washes below this amount do not count. Set 0 to count every wash."
            />

            <Field
              label="Credit expiry"
              value={creditExpiry}
              onChangeText={setCreditExpiry}
              keyboardType="numeric"
              placeholder="Never expires"
              hint={
                creditExpiry.trim()
                  ? `Free wash credits expire ${creditExpiry} days after being earned.`
                  : 'Leave blank so credits never expire.'
              }
              style={{ marginBottom: 0 }}
            />

            <GradientButton title="Save settings" onPress={handleSave} loading={saving} icon="save" full />
          </Surface>
        </View>

        <View style={styles.warning}>
          <Icon name="info-circle" size={11} color={colors.textMuted} />
          <Text style={styles.warningText}>
            Changes apply to future washes. Progress customers have already earned is kept.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  preview: { gap: spacing.md },
  previewLabel: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textMuted, letterSpacing: tracking.capsWide },
  previewFallback: { fontSize: font.sm, color: colors.textMuted },
  previewNote: { fontSize: font.sm, color: colors.textSecondary, lineHeight: 18 },

  warning: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs },
  warningText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },
});
