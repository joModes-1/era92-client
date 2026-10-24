import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../api/AuthContext';
import { colors, radii, font, spacing, weight, orgBg } from '../../theme';
import Icon from '../../components/Icon';
import ScreenHeader, { HeaderAction } from '../../components/ScreenHeader';
import { useAppAlert } from '../../components/AppAlert';
import { Surface, SectionHeader, EmptyState, SkeletonList, Field, FormSheet, Segmented, Hint, Toggle } from '../../components/ui';

type Tab = 'vehicles' | 'services';

export default function CatalogueScreen() {
  const alert = useAppAlert();
  const { actor } = useAuth();
  // A manager sees org-wide types plus their own branch's, but may only
  // change the latter — the server enforces this; the UI reflects it so a
  // manager is not offered a control that will simply fail.
  const isManager = actor?.role === 'manager';
  const branchId: string | undefined = actor?.branch_id;
  const branchName: string | undefined = actor?.branch_name;
  const canEdit = (item: any) => !isManager || item.branch_id === branchId;
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
      <View style={[styles.container, orgBg()]}>
        <ScreenHeader title="Catalogue" />
        <ScrollView contentContainerStyle={styles.body}><SkeletonList rows={5} showHeader={false} /></ScrollView>
      </View>
    );
  }

  const isVehicles = tab === 'vehicles';
  const sortedVcs = [...vehicleClasses].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <View style={[styles.container, orgBg()]}>
      <ScreenHeader
        title="Catalogue"
        subtitle={
          isManager
            ? `${branchName || 'Your branch'} · ${vehicleClasses.length} car types · ${services.length} wash types`
            : `${vehicleClasses.length} car types · ${services.length} wash types`
        }
        action={<HeaderAction icon="plus" onPress={() => setCreateVisible(true)} />}
      />

      <Segmented
        style={styles.segment}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'vehicles', label: 'Car types', count: vehicleClasses.length },
          { value: 'services', label: 'Wash types', count: services.length },
        ]}
      />

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
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, !v.active && styles.rowNameOff]} numberOfLines={1}>{v.name}</Text>
                      <ScopeTag item={v} isManager={isManager} />
                    </View>
                    <Toggle
                      value={v.active}
                      onValueChange={() => toggleActive(v, true)}
                      disabled={busyId === v.id || !canEdit(v)}
                      accessibilityLabel={`${v.name} available`}
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
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.rowName, !s.active && styles.rowNameOff]} numberOfLines={1}>{s.name}</Text>
                      <ScopeTag item={s} isManager={isManager} />
                    </View>
                    <Toggle
                      value={s.active}
                      onValueChange={() => toggleActive(s, false)}
                      disabled={busyId === s.id || !canEdit(s)}
                      accessibilityLabel={`${s.name} available`}
                    />
                  </View>

                  <View style={styles.flags}>
                    <TouchableOpacity
                      style={[styles.flag, s.is_default && styles.flagOnAccent]}
                      onPress={() => toggleDefault(s)}
                      disabled={busyId === s.id || s.is_default || !canEdit(s)}
                      activeOpacity={0.7}
                    >
                      <Icon name="star" size={10} color={s.is_default ? colors.accent : colors.textMuted} solid={s.is_default} />
                      <Text style={[styles.flagText, s.is_default && { color: colors.accentText }]}>
                        {s.is_default ? 'Default' : 'Make default'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.flag, s.earns_point && styles.flagOnSuccess]}
                      onPress={() => toggleEarnsPoint(s)}
                      disabled={busyId === s.id || !canEdit(s)}
                      activeOpacity={0.7}
                    >
                      <Icon name="gift" size={10} color={s.earns_point ? colors.success : colors.textMuted} />
                      <Text style={[styles.flagText, s.earns_point && { color: colors.successText }]}>
                        {s.earns_point ? 'Earns ' + Number(s.client_points_awarded || 0) + ' pts' : 'No points'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Surface>
              ))}
            </View>

            <Hint style={{ marginTop: spacing.xs }}>
              {isManager
                ? 'Turn points off for add-ons that should not reward clients. How many points each type gives is set in Points Settings. Items marked shared belong to the whole organisation; only an org admin can change those.'
                : 'Turn points off for add-ons that should not reward clients. How many points each type gives is set in Points Settings.'}
            </Hint>
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

/**
 * Marks whether a catalogue item is shared org-wide or private to a branch.
 * Only shown to managers: an org admin looking at an unfiltered list would
 * get a tag on every row, which is noise rather than information.
 */
function ScopeTag({ item, isManager }: { item: any; isManager: boolean }) {
  if (!isManager) return null;
  const shared = item.branch_id === null;
  return (
    <Text style={[styles.scopeTag, shared ? styles.scopeShared : styles.scopeMine]}>
      {shared ? 'Shared · org-wide' : 'Your branch'}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  body: { padding: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  segment: { marginHorizontal: spacing.lg, marginTop: spacing.lg },

  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderLight },
  orderChip: {
    width: 26, height: 26, borderRadius: radii.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center', justifyContent: 'center',
  },
  orderChipOff: { backgroundColor: colors.bgSunken },
  orderText: { fontSize: font.xs, fontWeight: weight.black, color: colors.primaryText },
  orderTextOff: { color: colors.textMuted },
  rowName: { fontSize: font.regular, fontWeight: weight.bold, color: colors.text },
  scopeTag: { fontSize: font.xs, fontWeight: weight.semibold, marginTop: 2 },
  scopeShared: { color: colors.textMuted },
  scopeMine: { color: colors.primaryText },
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
  flagText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textMuted },
});
