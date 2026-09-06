import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Switch } from 'react-native';
import { api } from '../../api';
import { colors, radii, font, spacing, weight, tracking } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader, { HeaderAction } from '../../components/ScreenHeader';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet } from '../../components/ui';

type Tab = 'vehicles' | 'services';

export default function CatalogueScreen() {
  const alert = useAppAlert();
  const [tab, setTab] = useState<Tab>('vehicles');
  const [vehicleClasses, setVehicleClasses] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [vc, svc] = await Promise.allSettled([api.listVehicleClasses(), api.listServices()]);
    if (vc.status === 'fulfilled') setVehicleClasses(Array.isArray(vc.value) ? vc.value : []);
    if (svc.status === 'fulfilled') setServices(Array.isArray(svc.value) ? svc.value : []);
  }, []);

  useEffect(() => { (async () => { await load(); setLoaded(true); })(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const submitCreate = async () => {
    if (!name.trim()) {
      alert('Missing name', 'Enter a name first.');
      return;
    }
    setCreating(true);
    try {
      if (tab === 'vehicles') {
        await api.createVehicleClass({ name: name.trim(), sort_order: vehicleClasses.length });
      } else {
        await api.createService({ name: name.trim() });
      }
      setCreateVisible(false);
      setName('');
      await load();
    } catch (e: any) {
      alert('Error', e.message);
    }
    setCreating(false);
  };

  const toggleActive = async (item: any, isVehicle: boolean) => {
    setBusyId(item.id);
    try {
      if (isVehicle) await api.updateVehicleClass(item.id, { active: !item.active });
      else await api.updateService(item.id, { active: !item.active });
      await load();
    } catch (e: any) {
      alert('Error', e.message);
    }
    setBusyId(null);
  };

  const toggleDefault = async (item: any) => {
    setBusyId(item.id);
    try {
      await api.updateService(item.id, { is_default: true });
      await load();
    } catch (e: any) {
      alert('Error', e.message);
    }
    setBusyId(null);
  };

  const toggleEarnsPoint = async (item: any) => {
    setBusyId(item.id);
    try {
      await api.updateService(item.id, { earns_point: !item.earns_point });
      await load();
    } catch (e: any) {
      alert('Error', e.message);
    }
    setBusyId(null);
  };

  if (!loaded) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Catalogue" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={5} showHeader={false} /></ScrollView>
      </View>
    );
  }

  const isVehicles = tab === 'vehicles';
  const sortedVcs = [...vehicleClasses].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Catalogue"
        subtitle={`${vehicleClasses.length} car types · ${services.length} wash types`}
        action={<HeaderAction icon="plus" onPress={() => setCreateVisible(true)} />}
      />

      {/* Segmented control */}
      <View style={styles.segment}>
        {(['vehicles', 'services'] as Tab[]).map((t) => {
          const on = tab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.segmentBtn, on && styles.segmentBtnOn]}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, on && styles.segmentTextOn]}>
                {t === 'vehicles' ? 'Car types' : 'Wash types'}
              </Text>
              <View style={[styles.segmentCount, on && styles.segmentCountOn]}>
                <Text style={[styles.segmentCountText, on && styles.segmentCountTextOn]}>
                  {t === 'vehicles' ? vehicleClasses.length : services.length}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {isVehicles ? (
          sortedVcs.length === 0 ? (
            <Surface elevation="sm" padded="lg">
              <EmptyState icon="car" title="No car types yet" message="Add the vehicle classes you price against." />
            </Surface>
          ) : (
            <>
              <SectionHeader title="Car types" count={sortedVcs.length} />
              <Surface elevation="sm" padded="sm">
                {sortedVcs.map((v: any, i: number) => (
                  <View key={v.id} style={[styles.row, i < sortedVcs.length - 1 && styles.rowBorder]}>
                    <View style={[styles.orderChip, !v.active && styles.orderChipOff]}>
                      <Text style={[styles.orderText, !v.active && styles.orderTextOff]}>{v.sort_order}</Text>
                    </View>
                    <Text style={[styles.rowName, !v.active && styles.rowNameOff]} numberOfLines={1}>{v.name}</Text>
                    <Switch
                      value={v.active}
                      onValueChange={() => toggleActive(v, true)}
                      disabled={busyId === v.id}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>
                ))}
              </Surface>
            </>
          )
        ) : services.length === 0 ? (
          <Surface elevation="sm" padded="lg">
            <EmptyState icon="th-large" title="No wash types yet" message="Add the services you offer." />
          </Surface>
        ) : (
          <>
            <SectionHeader title="Wash types" count={services.length} />
            <View style={{ gap: spacing.sm }}>
              {services.map((s: any) => (
                <Surface key={s.id} elevation="sm" style={styles.svcCard}>
                  <View style={styles.svcHead}>
                    <Text style={[styles.rowName, !s.active && styles.rowNameOff]} numberOfLines={1}>{s.name}</Text>
                    <Switch
                      value={s.active}
                      onValueChange={() => toggleActive(s, false)}
                      disabled={busyId === s.id}
                      trackColor={{ false: colors.border, true: colors.primary }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={styles.flags}>
                    <TouchableOpacity
                      style={[styles.flag, s.is_default && styles.flagOnAccent]}
                      onPress={() => toggleDefault(s)}
                      disabled={busyId === s.id || s.is_default}
                      activeOpacity={0.7}
                    >
                      <Icon name="star" size={10} color={s.is_default ? colors.accent : colors.textMuted} solid={s.is_default} />
                      <Text style={[styles.flagText, s.is_default && { color: colors.accent }]}>
                        {s.is_default ? 'Default' : 'Make default'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.flag, s.earns_point && styles.flagOnSuccess]}
                      onPress={() => toggleEarnsPoint(s)}
                      disabled={busyId === s.id}
                      activeOpacity={0.7}
                    >
                      <Icon name="gift" size={10} color={s.earns_point ? colors.success : colors.textMuted} />
                      <Text style={[styles.flagText, s.earns_point && { color: colors.success }]}>
                        {s.earns_point ? 'Earns loyalty' : 'No loyalty'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Surface>
              ))}
            </View>

            <View style={styles.hint}>
              <Icon name="info-circle" size={11} color={colors.textMuted} />
              <Text style={styles.hintText}>
                Add-ons like "Engine" should not count toward free washes — turn loyalty off for those.
              </Text>
            </View>
          </>
        )}
      </ScrollView>

      <FormSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        title={isVehicles ? 'New car type' : 'New wash type'}
        subtitle={isVehicles ? 'A vehicle class you price against' : 'A service customers can buy'}
        submitLabel="Create"
        onSubmit={submitCreate}
        submitting={creating}
      >
        <Field
          label="Name"
          required
          value={name}
          onChangeText={setName}
          placeholder={isVehicles ? 'e.g. Motorbike' : 'e.g. Wax polish'}
          style={{ marginBottom: 0 }}
        />
      </FormSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  segment: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.bgSunken,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radii.md,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 9,
    borderRadius: radii.sm,
  },
  segmentBtnOn: { backgroundColor: colors.bgCard },
  segmentText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
  segmentTextOn: { color: colors.text },
  segmentCount: {
    minWidth: 18, paddingHorizontal: 5, paddingVertical: 1,
    borderRadius: radii.full, backgroundColor: colors.border, alignItems: 'center',
  },
  segmentCountOn: { backgroundColor: colors.primarySoft },
  segmentCountText: { fontSize: font.micro, fontWeight: weight.heavy, color: colors.textSecondary },
  segmentCountTextOn: { color: colors.primary },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  orderChip: {
    width: 26, height: 26, borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  orderChipOff: { backgroundColor: colors.bgSunken },
  orderText: { fontSize: font.xs, fontWeight: weight.black, color: colors.primary },
  orderTextOff: { color: colors.textMuted },
  rowName: { flex: 1, fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  rowNameOff: { color: colors.textMuted, textDecorationLine: 'line-through' },

  svcCard: { gap: spacing.md },
  svcHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flags: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  flag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.bgSunken,
    paddingVertical: 7, paddingHorizontal: 11,
    borderRadius: radii.full,
  },
  flagOnAccent: { backgroundColor: colors.accentSoft },
  flagOnSuccess: { backgroundColor: colors.successSoft },
  flagText: { fontSize: font.xs, fontWeight: weight.bold, color: colors.textMuted },

  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, paddingHorizontal: spacing.xs, marginTop: spacing.xs },
  hintText: { flex: 1, fontSize: font.xs, color: colors.textMuted, lineHeight: 17 },
});
