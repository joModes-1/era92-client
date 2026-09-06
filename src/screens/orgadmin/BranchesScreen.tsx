import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader, { HeaderAction } from '../../components/ScreenHeader';
import Badge from '../../components/Badge';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet } from '../../components/ui';

export default function BranchesScreen() {
  const alert = useAppAlert();
  const [branches, setBranches] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.listBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const resetForm = () => { setName(''); setCode(''); setAddress(''); setPhone(''); };

  const submitCreate = async () => {
    if (!name.trim() || !code.trim()) {
      alert('Missing details', 'Branch name and code are required.');
      return;
    }
    setCreating(true);
    try {
      await api.createBranch({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setCreateVisible(false);
      resetForm();
      await load();
      alert('Branch created', `${name} (${code.toUpperCase()}) has been added.`);
    } catch (e: any) {
      alert('Error', e.message);
    }
    setCreating(false);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Branches" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={3} showHeader={false} /></ScrollView>
      </View>
    );
  }

  const active = branches.filter((b: any) => b.status === 'active').length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Branches"
        subtitle={`${active} active of ${branches.length}`}
        action={<HeaderAction icon="plus" onPress={() => setCreateVisible(true)} />}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {branches.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="building" title="No branches yet" message="Add your first location to start taking washes." />
          </Surface>
        ) : (
          <>
            <SectionHeader title="Locations" count={branches.length} icon="map-marker-alt" />
            <View style={{ gap: spacing.sm }}>
              {branches.map((b: any) => {
                const isActive = b.status === 'active';
                return (
                  <Surface key={b.id} elevation="sm" style={styles.card}>
                    <View style={styles.head}>
                      <View style={[styles.codeTag, !isActive && styles.codeTagOff]}>
                        <Text style={styles.codeText}>{b.code}</Text>
                      </View>
                      <Text style={styles.name} numberOfLines={1}>{b.name}</Text>
                      <Badge
                        label={isActive ? 'Active' : 'Inactive'}
                        tone={isActive ? 'success' : 'neutral'}
                        dot
                        small
                      />
                    </View>

                    {(b.address || b.phone) && (
                      <View style={styles.details}>
                        {b.address ? (
                          <View style={styles.detailRow}>
                            <Icon name="map-marker-alt" size={10} color={colors.textMuted} />
                            <Text style={styles.detailText} numberOfLines={1}>{b.address}</Text>
                          </View>
                        ) : null}
                        {b.phone ? (
                          <View style={styles.detailRow}>
                            <Icon name="phone" size={10} color={colors.textMuted} />
                            <Text style={styles.detailText}>{b.phone}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}

                    <View style={styles.foot}>
                      <Icon name="users" size={11} color={colors.textSecondary} />
                      <Text style={styles.staffCount}>
                        <Text style={styles.staffNum}>{b.staff_count ?? 0}</Text> staff
                      </Text>
                    </View>
                  </Surface>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <FormSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title="New branch"
        subtitle="Add a location to your organisation"
        submitLabel="Create branch"
        onSubmit={submitCreate}
        submitting={creating}
      >
        <Field label="Branch name" required value={name} onChangeText={setName} placeholder="e.g. Ntinda Bay" />
        <Field
          label="Code"
          required
          value={code}
          onChangeText={setCode}
          placeholder="e.g. NTD"
          autoCapitalize="characters"
          maxLength={10}
          hint="A short prefix used on job numbers."
        />
        <Field label="Address" value={address} onChangeText={setAddress} placeholder="123 Ntinda Road" />
        <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="+256700000000" keyboardType="phone-pad" />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  card: { gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  codeTag: { backgroundColor: colors.ink[900], borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 },
  codeTagOff: { backgroundColor: colors.ink[400] },
  codeText: { fontSize: font.micro, fontWeight: weight.black, color: '#fff', letterSpacing: tracking.caps },
  name: { flex: 1, fontSize: font.regular, fontWeight: weight.heavy, color: colors.text, letterSpacing: tracking.tight },

  details: { gap: 5 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailText: { flex: 1, fontSize: font.sm, color: colors.textSecondary },

  foot: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight,
  },
  staffCount: { fontSize: font.sm, color: colors.textSecondary },
  staffNum: { fontWeight: weight.heavy, color: colors.text },
});
