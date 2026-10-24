import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Platform, KeyboardAvoidingView, Image, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../../api';
import { useAppAlert } from '../../components/AppAlert';
import { colors, radii, font, spacing, weight, tracking, noFocusRing, shadow } from '../../theme';
import Icon from '../../components/Icon';
import GradientIcon from '../../components/GradientIcon';
import ComponentButton1 from '../../components/buttons/ComponentButton1';
import ComponentButton2 from '../../components/buttons/ComponentButton2';
import { artFor } from './serviceArt';

/**
 * The client's own "pick a service, describe the car, confirm" flow —
 * reached after scanning a branch's QR (BranchScanScreen), which is where
 * branchId comes from. A client has no branch_id on their own token, so
 * prices are fetched for whichever branch was just scanned, not derived
 * from the caller's own account.
 */

const COLORS = [
  'White', 'Silver', 'Grey', 'Black', 'Blue',
  'Red', 'Green', 'Gold', 'Brown', 'Other',
];

type Step = 'details' | 'confirm';

/** One car as the client fills it in. */
type CarDraft = { vcId: string; svcId: string; plate: string; color: string };
const emptyCar = (): CarDraft => ({ vcId: '', svcId: '', plate: '', color: '' });

export default function BookWashScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const alert = useAppAlert();
  const insets = useSafeAreaInsets();

  // useFreeWash arrives from LoyaltyScreen's redeem button. usePromo arrives
  // from the home screen's promo card: "wash 2 cars for the price of 1"
  // books two cars at once — the dearer is charged, the other is free.
  // preselectServiceName arrives from tapping a service tile directly on the
  // home screen — it names a service, not a vehicle class, so once prices
  // load below we find whichever vehicle class actually offers it.
  const { branchId, branchName, useFreeWash, usePromo, preselectServiceName, payWithPoints } = route.params || {};

  const [step, setStep] = useState<Step>('details');
  const [vehicleClasses, setVehicleClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // One car normally; two for the 2-for-1 offer.
  const [cars, setCars] = useState<CarDraft[]>(() => (usePromo ? [emptyCar(), emptyCar()] : [emptyCar()]));
  // Which car's service list / colour list is open, if any.
  const [openServices, setOpenServices] = useState<number | null>(null);
  const [openColors, setOpenColors] = useState<number | null>(null);
  const updateCar = (i: number, patch: Partial<CarDraft>) =>
    setCars((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  useEffect(() => {
    (async () => {
      try {
        const data = await api.clientPricesForBranch(branchId);
        const vcs = data?.vehicle_classes || [];
        setVehicleClasses(vcs);

        // Every car starts on the first car type; a tile tapped on the home
        // screen pre-selects the first car's service, on whichever car type
        // actually offers it.
        const firstVc = vcs[0]?.id || '';
        let firstCar: Partial<CarDraft> = {};
        if (preselectServiceName) {
          const match = vcs.find((v: any) =>
            (v.services || []).some((x: any) => x.has_price && x.name === preselectServiceName)
          );
          if (match) {
            const svc = match.services.find((x: any) => x.name === preselectServiceName);
            firstCar = { vcId: match.id, svcId: svc.id };
          }
        }
        setCars((cs) => cs.map((c, i) => ({ ...c, vcId: firstVc, ...(i === 0 ? firstCar : {}) })));
      } catch (e: any) {
        alert('Could not load prices', e.message);
      }
      setLoading(false);
    })();
  }, [branchId]);

  // The client's points account: the balance and the owner's point value, so
  // "Redeem points" can say exactly what the points cover, and whether the
  // scheme is on at all, so the confirm step can say what this wash earns.
  const [pointsInfo, setPointsInfo] = useState<{ balance: number; point_value_ugx: number; enabled?: boolean } | null>(null);
  useEffect(() => {
    api.clientPoints().then(setPointsInfo).catch(() => setPointsInfo(null));
  }, []);

  /** A car's chosen car type, the wash types priced for it, and the chosen one. */
  const describe = (car: CarDraft) => {
    const vehicleClass = vehicleClasses.find((v: any) => v.id === car.vcId);
    const services = (vehicleClass?.services || []).filter((x: any) => x.has_price);
    const service = services.find((x: any) => x.id === car.svcId);
    return { vehicleClass, services, service, price: Number(service?.price_ugx || 0) };
  };
  const described = cars.map(describe);

  // The 2-for-1 rule, the same one the server applies: the dearer car is
  // charged, the other is free; on a tie the first car is charged. With one
  // car, that car is simply the one being paid for.
  const paidIndex = cars.length === 2 && described[1].price > described[0].price ? 1 : 0;
  const paid = described[paidIndex];

  const ugx = (n: any) => Number(n || 0).toLocaleString();
  const canContinue = cars.every((c) => !!c.vcId && !!c.svcId);

  // The same arithmetic the server applies at booking: only the points the
  // price needs are spent, never more; if they fall short the rest is owed.
  // (Never with the offer — points don't combine with it.)
  const pointsPlan = useMemo(() => {
    const price = paid.price;
    const pv = Number(pointsInfo?.point_value_ugx || 0);
    const balance = Number(pointsInfo?.balance || 0);
    if (!payWithPoints || usePromo || pv <= 0 || balance <= 0 || price <= 0) return null;
    const used = Math.min(balance, Math.ceil(price / pv));
    const value = Math.min(price, used * pv);
    return { used, value, due: price - value };
  }, [payWithPoints, usePromo, pointsInfo, paid.price]);

  // What this booking will earn once it is paid — the server's own rules
  // (clientPoints.awardForSettlement): the charged car's wash-type points,
  // or nothing for a free wash, a wash paid entirely with points, or while
  // the owner has the scheme switched off. On the offer the free car earns
  // nothing. Shown even at 0, so the client always sees where points come
  // from.
  const pointsEarned = useMemo(() => {
    if (useFreeWash) return 0;
    if (pointsInfo?.enabled === false) return 0;
    if (pointsPlan && pointsPlan.due === 0) return 0;
    return Number(paid.service?.client_points_awarded || 0);
  }, [useFreeWash, pointsInfo?.enabled, pointsPlan, paid.service?.client_points_awarded]);

  const submit = async () => {
    setSubmitting(true);
    try {
      if (usePromo) {
        await api.clientBookPromo({
          branch_id: branchId,
          cars: cars.map((c) => ({
            vehicle_class_id: c.vcId,
            service_id: c.svcId,
            plate: c.plate.trim() || undefined,
            vehicle_color: c.color || undefined,
          })),
        });
      } else {
        const car = cars[0];
        await api.clientBookWash({
          branch_id: branchId,
          vehicle_class_id: car.vcId,
          service_id: car.svcId,
          plate: car.plate.trim() || undefined,
          vehicle_color: car.color || undefined,
          use_free_wash: useFreeWash || undefined,
          // The server deducts the points now and works out what is still owed.
          use_points: payWithPoints || undefined,
        });
      }
      // The progress tracker and the payment popup live on the home screen.
      // popToTop() dismisses the booking modals; the navigate then makes
      // sure the client lands on home — booking can be started from Loyalty
      // ("Redeem points"), and popping alone used to leave them there, never
      // seeing their booking.
      navigation.popToTop();
      navigation.navigate('App', { screen: 'Home' });
    } catch (e: any) {
      // A credit spent elsewhere between screens (e.g. another device) is
      // the one failure worth falling back from rather than dead-ending —
      // everything else is a genuine "try again" error.
      if (payWithPoints && /NO_POINTS|POINTS_DISABLED|POINTS_NOT_SPENDABLE/i.test(String(e?.code || ''))) {
        alert('Points not available', e.message || 'You have no points to use right now. You can still book and pay normally.');
      } else if (useFreeWash && /NO_CREDITS/i.test(String(e?.message || e?.code || ''))) {
        alert(
          'No free wash available',
          'This credit is no longer available. You can still book and pay normally.'
        );
      } else if (/PROMO_CONFLICT/i.test(String(e?.message || e?.code || ''))) {
        alert('Offer already used', 'You have already used the 2-for-1 offer on this account. You can still book your cars normally.');
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

  // Shown while the booking request is in flight, between tapping "Book
  // this wash" and either landing back on the home screen or seeing an
  // error alert — the confirm step's own inline button spinner is easy to
  // miss on a slow connection, so this full-screen interstitial (matching
  // the Figma loading frame) makes the wait unambiguous.
  if (submitting) {
    return (
      <View style={s.loadingRoot}>
        <ActivityIndicator size="large" color="#AC00FF" />
      </View>
    );
  }

  const pointsRow = (
    <View style={s.sumRow}>
      <Text style={s.sumLabel}>Points earned</Text>
      <View style={s.pointsValue}>
        <View style={s.pointsStar}>
          {/* The same purple star as the top bar's points pill. */}
          <GradientIcon
            name="star"
            size={10}
            colorsArr={colors.rewardIconGradient}
            start={colors.rewardIconGradientStart}
            end={colors.rewardIconGradientEnd}
          />
        </View>
        <Text style={s.sumValue}>
          {pointsEarned.toLocaleString()} {pointsEarned === 1 ? 'Point' : 'Points'}
        </Text>
      </View>
    </View>
  );

  if (step === 'confirm') {
    const pair = cars.length === 2;
    const car = cars[0];
    const { vehicleClass, service } = described[0];
    const art = artFor(service?.name || vehicleClass?.name || '');
    return (
      <View style={s.root}>
        <Header title="Confirm & Book" onBack={() => setStep('details')} />

        <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
          {pair ? (
            // Both cars' renders over the card, the second tucked behind the
            // first — the offer is about the pair, so the art shows two.
            <View style={s.heroArtPair}>
              {described.map((d, i) => {
                const a = artFor(d.service?.name || d.vehicleClass?.name || '');
                return a.image ? (
                  <Image
                    key={i}
                    source={a.image}
                    style={[s.heroArtImage, i === 1 && s.heroArtSecond, a.flip && { transform: [{ scaleX: -1 }] }]}
                    resizeMode="contain"
                  />
                ) : (
                  <Icon key={i} name={a.icon} size={52} color={colors.ink[400]} />
                );
              })}
            </View>
          ) : (
            <View style={s.heroArt}>
              {art.image ? (
                <Image
                  source={art.image}
                  style={[
                    s.heroArtImage,
                    art.flip && { transform: [{ scaleX: -1 }] },
                    art.offsetY ? { marginTop: art.offsetY } : null,
                  ]}
                  resizeMode="contain"
                />
              ) : (
                <Icon name={art.icon} size={62} color={colors.ink[400]} />
              )}
            </View>
          )}

          <LinearGradient
            colors={colors.gradientAction}
            locations={colors.gradientActionLocations}
            start={colors.gradientActionStart}
            end={colors.gradientActionEnd}
            style={s.summary}
          >
            {pair ? (
              <>
                <Text style={s.summaryTitle}>2 cars, 1 price</Text>
                <Text style={s.summarySub}>Wash 2 cars offer · {branchName}</Text>

                <View style={s.summaryRows}>
                  {cars.map((c, i) => {
                    const d = described[i];
                    const free = i !== paidIndex;
                    const details = [c.plate, c.color].filter(Boolean).join(' · ');
                    return (
                      <View key={i} style={s.carBlock}>
                        <Text style={s.sumLabel}>Car {i + 1}{details ? ` · ${details}` : ''}</Text>
                        <View style={s.carBlockRow}>
                          <Text style={[s.sumValue, s.carBlockName]} numberOfLines={1}>
                            {d.service?.name} · {d.vehicleClass?.name}
                          </Text>
                          {free ? (
                            <View style={s.freeTag}><Text style={s.freeTagText}>Free</Text></View>
                          ) : (
                            <Text style={s.sumValue}>UGX {ugx(d.price)}</Text>
                          )}
                        </View>
                        {free ? <Text style={s.wasPrice}>UGX {ugx(d.price)} — free with the offer</Text> : null}
                      </View>
                    );
                  })}

                  <View style={s.summaryDivider} />
                  <SummaryRow label="You pay" value={`UGX ${ugx(paid.price)}`} />
                  {pointsRow}
                </View>
              </>
            ) : (
              <>
                <Text style={s.summaryTitle}>{service?.name || 'Wash'}</Text>
                <Text style={s.summarySub}>{vehicleClass?.name || 'Vehicle'} · {branchName}</Text>

                <View style={s.summaryRows}>
                  <SummaryRow label="Car plate" value={car.plate || 'Not given'} />
                  <SummaryRow label="Color" value={car.color || 'Not given'} />
                  {payWithPoints ? (
                    <View style={s.freeRow}>
                      <Icon name="award" size={13} color="#fff" />
                      <Text style={s.freeText}>
                        {!pointsPlan
                          ? 'Paying with points — checking your balance…'
                          : pointsPlan.due === 0
                            ? `Your ${pointsPlan.used.toLocaleString()} points cover this wash`
                            : `${pointsPlan.used.toLocaleString()} points (UGX ${ugx(pointsPlan.value)}) — you pay UGX ${ugx(pointsPlan.due)}`}
                      </Text>
                    </View>
                  ) : useFreeWash ? (
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
                  {pointsRow}
                </View>
              </>
            )}
          </LinearGradient>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <ComponentButton2 title={pair ? 'Book both cars' : 'Book Service'} onPress={submit} loading={submitting} />
        </View>
      </View>
    );
  }

  /** The service, plate and colour fields for one car. */
  const carFields = (i: number) => {
    const car = cars[i];
    const { services, service } = described[i];
    const art = artFor(service?.name || described[i].vehicleClass?.name || '');
    const servicesOpen = openServices === i;
    const colorsOpen = openColors === i;
    return (
      <View key={i} style={i > 0 ? s.carSection : undefined}>
        {cars.length > 1 ? <Text style={s.carHeading}>Car {i + 1}</Text> : null}
        <Text style={[s.caption, { marginBottom: spacing.md }]}>Select service</Text>

        <TouchableOpacity onPress={() => setOpenServices(servicesOpen ? null : i)} activeOpacity={0.85}>
          <LinearGradient
            colors={colors.gradientAction}
            locations={colors.gradientActionLocations}
            start={colors.gradientActionStart}
            end={colors.gradientActionEnd}
            style={s.servicePill}
          >
            <View style={s.serviceArt}>
              {art.image ? (
                <Image
                  source={art.image}
                  style={[s.serviceArtImage, art.flip && { transform: [{ scaleX: -1 }] }]}
                  resizeMode="contain"
                />
              ) : (
                <Icon name={art.icon} size={20} color="#fff" />
              )}
            </View>
            <Text style={s.serviceText} numberOfLines={1}>
              {service ? `${service.name} (UGX ${ugx(service.price_ugx)})` : 'Choose a service'}
            </Text>
            <View style={s.serviceChevron}>
              <Icon name={servicesOpen ? 'chevron-up' : 'chevron-down'} size={11} color={colors.primary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {servicesOpen && (
          <View style={s.dropdown}>
            {vehicleClasses.length > 1 && (
              <>
                <Text style={s.dropdownLabel}>CAR TYPE</Text>
                <View style={s.chipRow}>
                  {vehicleClasses.map((v: any) => (
                    <TouchableOpacity
                      key={v.id}
                      onPress={() => updateCar(i, { vcId: v.id, svcId: '' })}
                      style={[s.chip, car.vcId === v.id && s.chipOn]}
                      activeOpacity={0.7}
                    >
                      <Text style={[s.chipText, car.vcId === v.id && s.chipTextOn]}>{v.name}</Text>
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
                  onPress={() => { updateCar(i, { svcId: sv.id }); setOpenServices(null); }}
                  style={[s.option, car.svcId === sv.id && s.optionOn]}
                  activeOpacity={0.7}
                >
                  <View style={[s.radio, car.svcId === sv.id && s.radioOn]}>
                    {car.svcId === sv.id ? <View style={s.radioDot} /> : null}
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
          value={car.plate}
          onChangeText={(t) => updateCar(i, { plate: t.toUpperCase() })}
          placeholder="UA 752CZ"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={s.input}
        />

        <Text style={[s.fieldLabel, { marginTop: spacing.lg }]}>Color</Text>
        <TouchableOpacity onPress={() => setOpenColors(colorsOpen ? null : i)} style={s.select} activeOpacity={0.7}>
          <Text style={[s.selectText, !car.color && s.selectPlaceholder]}>{car.color || 'Silver'}</Text>
          <Icon name={colorsOpen ? 'chevron-up' : 'chevron-down'} size={11} color={colors.textSecondary} />
        </TouchableOpacity>

        {colorsOpen && (
          <View style={s.colorGrid}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => { updateCar(i, { color: c }); setOpenColors(null); }}
                style={[s.chip, car.color === c && s.chipOn]}
                activeOpacity={0.7}
              >
                <Text style={[s.chipText, car.color === c && s.chipTextOn]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ── Step 1: details ──
  return (
    <View style={s.root}>
      <Header title={usePromo ? 'Enter both cars' : 'Enter Car details'} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.caption}>{branchName}</Text>

          {usePromo ? (
            <View style={s.promoNote}>
              <Icon name="gift" size={14} color={colors.primary} />
              <Text style={s.promoNoteText}>
                <Text style={s.promoNoteStrong}>Wash 2 cars for the price of 1. </Text>
                Add both cars — the dearer wash is charged and the other one is free.
              </Text>
            </View>
          ) : null}

          {cars.map((_, i) => carFields(i))}
        </ScrollView>

        <View style={[s.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <ComponentButton1 title="Continue" onPress={() => setStep('confirm')} disabled={!canContinue} />
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

  loadingRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECEFF4' },

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
  // ── 2-for-1: two cars on one booking ──
  promoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1, borderColor: colors.promoBannerBorder,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  promoNoteText: { flex: 1, fontSize: font.sm, color: colors.text, lineHeight: 19 },
  promoNoteStrong: { fontWeight: weight.heavy },
  // Each car after the first starts under a hairline, so the two forms read
  // as two cars rather than one long one.
  carSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  carHeading: {
    fontSize: font.lg, fontWeight: weight.heavy, color: colors.text,
    letterSpacing: tracking.tight, marginBottom: spacing.xs,
  },

  heroArtPair: { flexDirection: 'row', justifyContent: 'center', marginBottom: -28, zIndex: 2 },
  heroArtSecond: { marginLeft: -36 },
  carBlock: { gap: 3 },
  carBlockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  carBlockName: { flex: 1 },
  freeTag: {
    backgroundColor: colors.accent,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  freeTagText: { fontSize: font.xs, fontWeight: weight.heavy, color: '#fff' },
  wasPrice: { fontSize: font.xs, color: 'rgba(255,255,255,0.6)' },
  summaryDivider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.25)' },

  // The star roundel from the top bar's points pill, so "Points earned" reads
  // as the same currency the client sees in their balance.
  pointsValue: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pointsStar: {
    width: 18, height: 18, borderRadius: radii.full,
    backgroundColor: colors.pointsStarBg,
    alignItems: 'center', justifyContent: 'center',
  },

  freeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    marginTop: spacing.xs,
  },
  freeText: { fontSize: font.sm, fontWeight: weight.heavy, color: '#fff' },

  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
