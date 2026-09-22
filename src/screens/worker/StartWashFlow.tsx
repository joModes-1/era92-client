import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, TextInput,
  ScrollView, Platform, KeyboardAvoidingView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, font, spacing, weight, tracking, noFocusRing, shadow } from '../../theme';
import Icon from '../../components/Icon';
import GradientButton from '../../components/GradientButton';
import { AlertHost } from '../../components/AppAlert';
import { artFor } from './serviceArt';

/**
 * Starting a job: pick the service, describe the car, confirm.
 *
 * Two steps in one component because they share the same draft — stepping
 * back from the summary has to return the worker to the details they just
 * typed, not to an empty form.
 *
 * The plate and colour are what let a worker find the right car in a yard
 * of them, so they are the body of the first screen rather than an optional
 * note tucked away somewhere.
 */

const COLORS = [
  'White', 'Silver', 'Grey', 'Black', 'Blue',
  'Red', 'Green', 'Gold', 'Brown', 'Other',
];

type Step = 'details' | 'confirm';

export default function StartWashFlow({
  visible,
  onClose,
  onConfirm,
  vehicleClasses,
  initialVehicleClassId,
  initialServiceId,
  submitting,
  linkedToCustomer,
  pointsPerWash,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (draft: {
    vehicle_class_id: string;
    service_id: string;
    plate?: string;
    vehicle_color?: string;
  }) => void;
  vehicleClasses: any[];
  initialVehicleClassId?: string;
  initialServiceId?: string;
  submitting?: boolean;
  /** Whether a customer QR was scanned — drives the loyalty note. */
  linkedToCustomer?: boolean;
  /** What this job is expected to earn the worker, if the scheme is on. */
  pointsPerWash?: number | null;
}) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('details');
  const [vcId, setVcId] = useState('');
  const [svcId, setSvcId] = useState('');
  const [plate, setPlate] = useState('');
  const [color, setColor] = useState('');
  const [showServices, setShowServices] = useState(false);
  const [showColors, setShowColors] = useState(false);

  // Reset to the caller's starting point each time the sheet opens, so a
  // previous abandoned draft never leaks into the next car.
  React.useEffect(() => {
    if (!visible) return;
    setStep('details');
    setVcId(initialVehicleClassId || vehicleClasses[0]?.id || '');
    setSvcId(initialServiceId || '');
    setPlate('');
    setColor('');
    setShowServices(false);
    setShowColors(false);
  }, [visible, initialVehicleClassId, initialServiceId, vehicleClasses]);

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

  const Header = ({ title, onBack }: { title: string; onBack: () => void }) => (
    <View style={[s.header, { paddingTop: insets.top + spacing.sm }]}>
      <TouchableOpacity onPress={onBack} hitSlop={12} style={s.backBtn} activeOpacity={0.6}>
        <Icon name="chevron-left" size={17} color={colors.text} />
      </TouchableOpacity>
      <Text style={s.headerTitle}>{title}</Text>
      <View style={s.backBtn} />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {step === 'details' ? (
        <View style={s.root}>
          <Header title="Enter Car details" onBack={onClose} />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={s.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={s.caption}>Select service</Text>

              {/* The chosen service as a filled brand pill, as in the design. */}
              <TouchableOpacity
                onPress={() => setShowServices((v) => !v)}
                activeOpacity={0.85}
              >
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
                    {service
                      ? `${service.name} (UGX ${ugx(service.price_ugx)})`
                      : 'Choose a service'}
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
              <TouchableOpacity
                onPress={() => setShowColors((v) => !v)}
                style={s.select}
                activeOpacity={0.7}
              >
                <Text style={[s.selectText, !color && s.selectPlaceholder]}>
                  {color || 'Silver'}
                </Text>
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
                title="Enter car details"
                onPress={() => setStep('confirm')}
                disabled={!canContinue}
                size="action"
                full
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      ) : (
        // ── Step 2: confirm ──
        <View style={s.root}>
          <Header title="Confirm & Book service" onBack={() => setStep('details')} />

          <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
            {/* The car sits above the card, overlapping it, as in the design. */}
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
              <Text style={s.summarySub}>{vehicleClass?.name || 'Vehicle'}</Text>

              <View style={s.summaryRows}>
                <SummaryRow label="Car plate" value={plate || 'Not given'} />
                <SummaryRow label="Color" value={color || 'Not given'} />
                <SummaryRow
                  label={service?.name || 'Service'}
                  value={`UGX ${ugx(service?.price_ugx)}`}
                />
                {pointsPerWash ? (
                  <View style={s.pointsRow}>
                    <View style={s.pointsDot}>
                      <Icon name="star" size={9} color="#fff" />
                    </View>
                    <Text style={s.pointsText}>{pointsPerWash} Points</Text>
                  </View>
                ) : null}
              </View>
            </LinearGradient>

            {!linkedToCustomer && (
              <View style={s.walkInNote}>
                <Icon name="info-circle" size={11} color={colors.warning} />
                <Text style={s.walkInText}>
                  No customer code scanned — this wash earns them no stamp.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={[s.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
            <GradientButton
              title="Book Service"
              onPress={() => onConfirm({
                vehicle_class_id: vcId,
                service_id: svcId,
                plate: plate.trim() || undefined,
                vehicle_color: color || undefined,
              })}
              loading={submitting}
              size="action"
              full
            />
          </View>
        </View>
      )}

      {/* Validation is raised from inside this Modal, which on Android is its
          own native window — without a host the message is stranded behind. */}
      <AlertHost />
    </Modal>
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

  // ── Service pill ──
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

  // ── Fields ──
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

  // ── Confirm ──
  // Pulled down over the card below it so the car reads as sitting on the
  // summary rather than floating above a gap.
  heroArt: {
    alignItems: 'center',
    marginBottom: -28,
    zIndex: 2,
  },
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
  summarySub: {
    fontSize: font.sm,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    marginTop: 2,
  },
  summaryRows: { marginTop: spacing.xl, gap: spacing.lg },
  sumRow: { gap: 2 },
  sumLabel: { fontSize: font.xs, color: 'rgba(255,255,255,0.6)' },
  sumValue: { fontSize: font.regular, fontWeight: weight.heavy, color: '#fff' },

  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: spacing.xs },
  pointsDot: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  pointsText: { fontSize: font.sm, fontWeight: weight.heavy, color: '#fff' },

  walkInNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  walkInText: { flex: 1, fontSize: font.xs, color: colors.warning, fontWeight: weight.semibold, lineHeight: 17 },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
});
