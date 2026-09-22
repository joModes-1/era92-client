import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, KeyboardAvoidingView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../api';
import { useAppAlert } from '../../components/AppAlert';
import { colors, radii, font, spacing, weight, tracking, noFocusRing, shadow } from '../../theme';
import Icon from '../../components/Icon';
import GradientButton from '../../components/GradientButton';
import { artFor } from '../worker/serviceArt';

/**
 * The client's own "pick a service, describe the car, confirm" flow.
 *
 * A fork of the worker's StartWashFlow, not a shared component: that one
 * carries linkedToCustomer/pointsPerWash props that describe a WORKER
 * starting a wash FOR someone who may or may not be linked — meaningless
 * here, since a client booking is always for themselves. It also sources
 * prices from the worker's own shift-branch; a client has no branch_id on
 * their token and has to fetch prices for whichever branch they just
 * scanned. And it's a Modal driven by a parent's local state, whereas this
 * is a pushed screen driven by navigation params — different enough wiring
 * that sharing one component would need a pile of mode-switching props.
 */

const COLORS = [
  'White', 'Silver', 'Grey', 'Black', 'Blue',
  'Red', 'Green', 'Gold', 'Brown', 'Other',
];

type Step = 'details' | 'confirm';

export default function BookWashScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();

  const { branchId, branchName, useFreeWash } = route.params || {};

  const [step, setStep] = useState<Step>('details');
  const [vehicleClasses, setVehicleClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [vcId, setVcId] = useState('');
  const [svcId, setSvcId] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [showServices, setShowServices] = useState(false);
  const [showColors, setShowColors] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.clientPricesForBranch(branchId);
        const vcs = data?.vehicle_classes || [];
        setVehicleClasses(vcs);
        setVcId(vcs[0]?.id || '');
      } catch (e: any) {
        alert('Could not load prices', e.message);
      }
      setLoading(false);
    })();
  }, [branchId]);

  const vehicleClass = useMemo(
    () => vehicleClasses.find((v: any) => v.id === vcId),
    [vehicleClasses, vcId]
  );
  const services = useMemo(
    () => (vehicleClass?.services || []).filter((s: any) => s.has_price),
    [vehicleClass]
  );
  const service = useMemo(
    () => services.find((s: any) => s.id === svcId),
    [services, svcId]
  );

  const ugx = (n: any) => Number(n || 0).toLocaleString();
  const canContinue = !!vcId && !!svcId;
  const art = artFor(service?.name || vehicleClass?.name || '');

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await api.clientBookWash({
        branch_id: branchId,
        vehicle_class_id: vcId,
        service_id: svcId,
        plate: plate.trim() || undefined,
        vehicle_color: color || undefined,
        use_free_wash: useFreeWash || undefined,
      });
      // The progress tracker lives on the home screen itself now, not a
      // separate page — popToTop() dismisses this whole modal stack
      // (BranchScan + BookWash) back to the drawer, where ClientHome's own
      // polling picks up the freshly booked wash immediately.
      navigation.popToTop();
    } catch (e: any) {
      // A credit spent elsewhere between screens (e.g. another device) is
      // the one failure worth falling back from rather than dead-ending —
      // everything else is a genuine "try again" error.
      if (useFreeWash && /NO_CREDITS/i.test(String(e?.message || e?.code || ''))) {
        alert(
          'No free wash available',
          'This credit is no longer available. You can still book and pay normally.'
        );
      } else {
        alert('Could not book this wash', e.message);
      }
    }
    setSubmitting(false);
  };

  const Header = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={s.backBtn} activeOpacity={0.6}>
        <Icon name="chevron-left" size={17} color={colors.text} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.backBtn} />
    </View>
  );

  if (loading) {
    return (
      <View style={s.root}>
        <Header title="Enter Car details" onBack={() => navigation.goBack()} />
      </View>
    );
  }

  if (step === 'confirm') {
    return (
      <View style={s.root}>
        <Header title="Confirm & Book" onBack={() => setStep('details')} />

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          <View style={s.heroArt}>
            {art.image ? (
              <Image source={art.image} style={s.heroArtImage} resizeMode="contain" />
            ) : (
              <Icon name={art.icon} size={62} color={colors.ink[400]} />
            )}
          </View>

          <LinearGradient
            colors={colors.gradientAction}
            locations={colors.gradientActionLocations}
            start={colors.gradientActionStart}
            end={colors.gradientActionEnd}
            style={s.summary}
          >
            <Text style={s.summaryTitle}>{service?.name || 'Wash'}</Text>
            <Text style={s.summarySub}>{vehicleClass?.name || 'Vehicle'} · {branchName}</Text>

            <View style={s.summaryRows}>
              <SummaryRow label="Car plate" value={plate || 'Not given'} />
              <SummaryRow label="Color" value={color || 'Not given'} />
              {useFreeWash ? (
                <View style={s.freeRow}>
                  <Icon name="gift" size={13} color="#fff" />
                  <Text style={s.freeText}>FREE — using your saved wash</Text>
                </View>
              ) : (
                <SummaryRow
                  label={service?.name || 'Service'}
                  value={`UGX ${ugx(service?.price_ugx)}`}
                />
              )}
            </View>
          </LinearGradient>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <GradientButton
            title="Book this wash"
            onPress={submit}
            loading={submitting}
            size="action"
            full
          />
        </View>
      </View>
    );
  }

  // ── Step 1: details ──
  return (
    <View style={s.root}>
      <Header title="Enter Car details" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.caption}>{branchName}</Text>
          <Text style={[s.caption, { marginBottom: spacing.md }]}>Select service</Text>

          <TouchableOpacity onPress={() => setShowServices((v) => !v)} activeOpacity={0.85}>
            <LinearGradient
              colors={colors.gradientAction}
              locations={colors.gradientActionLocations}
              start={colors.gradientActionStart}
              end={colors.gradientActionEnd}
              style={s.servicePill}
            >
              <View style={s.serviceArt}>
                {art.image ? (
                  <Image source={art.image} style={s.serviceArtImage} resizeMode="contain" />
                ) : (
                  <Icon name={art.icon} size={20} color="#fff" />
                )}
              </View>
              <Text style={s.serviceText} numberOfLines={1}>
                {service ? `${service.name} (UGX ${ugx(service.price_ugx)})` : 'Choose a service'}
              </Text>
              <View style={s.serviceChevron}>
                <Icon name={showServices ? 'chevron-up' : 'chevron-down'} size={11} color={colors.primary} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {showServices && (
            <View style={s.dropdown}>
              {vehicleClasses.length > 1 && (
                <>
                  <Text style={s.dropdownLabel}>CAR TYPE</Text>
                  <View style={s.chipRow}>
                    {vehicleClasses.map((v: any) => (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => { setVcId(v.id); setSvcId(''); }}
                        style={[s.chip, vcId === v.id && s.chipOn]}
                        activeOpacity={0.7}
                      >
                        <Text style={[s.chipText, vcId === v.id && s.chipTextOn]}>{v.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={[s.dropdownLabel, { marginTop: spacing.md }]}>SERVICE</Text>
              {services.length === 0 ? (
                <Text style={s.noServices}>No priced services for this car type.</Text>
              ) : (
                services.map((sv: any) => (
                  <TouchableOpacity
                    key={sv.id}
                    onPress={() => { setSvcId(sv.id); setShowServices(false); }}
                    style={[s.option, svcId === sv.id && s.optionOn]}
                    activeOpacity={0.7}
                  >
                    <View style={[s.radio, svcId === sv.id && s.radioOn]}>
                      {svcId === sv.id ? <View style={s.radioDot} /> : null}
                    </View>
                    <Text style={s.optionName}>{sv.name}</Text>
                    <Text style={s.optionPrice}>UGX {ugx(sv.price_ugx)}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <Text style={[s.caption, { marginTop: spacing.xl }]}>Enter Car Details</Text>

          <Text style={s.fieldLabel}>Plate number</Text>
          <TextInput
            value={plate}
            onChangeText={(t) => setPlate(t.toUpperCase())}
            placeholder="UA 752CZ"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={s.input}
          />

          <Text style={[s.fieldLabel, { marginTop: spacing.lg }]}>Color</Text>
          <TouchableOpacity onPress={() => setShowColors((v) => !v)} style={s.select} activeOpacity={0.7}>
            <Text style={[s.selectText, !color && s.selectPlaceholder]}>{color || 'Silver'}</Text>
            <Icon name={showColors ? 'chevron-up' : 'chevron-down'} size={11} color={colors.textSecondary} />
          </TouchableOpacity>

          {showColors && (
            <View style={s.colorGrid}>
              {COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => { setColor(c); setShowColors(false); }}
                  style={[s.chip, color === c && s.chipOn]}
                  activeOpacity={0.7}
                >
                  <Text style={[s.chipText, color === c && s.chipTextOn]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <GradientButton
            title="Continue"
            onPress={() => setStep('confirm')}
            disabled={!canContinue}
            size="action"
            full
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.sumRow}>
      <Text style={s.sumLabel}>{label}</Text>
      <Text style={s.sumValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgCard },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: font.lg, fontWeight: weight.bold, color: colors.text, letterSpacing: tracking.tight },

  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

  caption: { fontSize: font.xs, color: colors.textMuted, marginBottom: 7 },

  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.full,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    ...shadow.sm,
  },
  serviceArt: {
    width: 40, height: 40, borderRadius: radii.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  serviceArtImage: { width: '100%', height: '100%' },
  serviceText: { flex: 1, fontSize: font.sm, fontWeight: weight.bold, color: '#fff' },
  serviceChevron: {
    width: 28, height: 28, borderRadius: radii.full,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 2,
  },

  dropdown: {
    backgroundColor: colors.bgSunken,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  dropdownLabel: {
    fontSize: font.micro,
    fontWeight: weight.heavy,
    color: colors.textSecondary,
    letterSpacing: tracking.capsWide,
    marginBottom: 7,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: font.sm, fontWeight: weight.bold, color: colors.textSecondary },
  chipTextOn: { color: '#fff' },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionOn: { backgroundColor: colors.primarySoft },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  optionName: { flex: 1, fontSize: font.sm, fontWeight: weight.bold, color: colors.text },
  optionPrice: { fontSize: font.sm, fontWeight: weight.heavy, color: colors.primary },
  noServices: { fontSize: font.sm, color: colors.textMuted, paddingVertical: spacing.sm },

  fieldLabel: { fontSize: font.xs, color: colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: font.regular,
    fontWeight: weight.medium,
    color: colors.text,
    ...noFocusRing,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  selectText: { fontSize: font.regular, fontWeight: weight.medium, color: colors.text },
  selectPlaceholder: { color: colors.textMuted },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },

  heroArt: { alignItems: 'center', marginBottom: -28, zIndex: 2 },
  heroArtImage: { width: 96, height: 72 },
  summary: {
    borderRadius: radii.xl,
    paddingTop: spacing.xxl + spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    ...shadow.lg,
  },
  summaryTitle: {
    fontSize: font.display,
    fontWeight: weight.black,
    color: '#fff',
    letterSpacing: tracking.display,
    textAlign: 'center',
  },
  summarySub: { fontSize: font.sm, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 2 },
  summaryRows: { marginTop: spacing.xl, gap: spacing.lg },
  sumRow: { gap: 2 },
  sumLabel: { fontSize: font.xs, color: 'rgba(255,255,255,0.6)' },
  sumValue: { fontSize: font.regular, fontWeight: weight.heavy, color: '#fff' },

  freeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: spacing.xs,
  },
  freeText: { fontSize: font.sm, fontWeight: weight.heavy, color: '#fff' },

  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
