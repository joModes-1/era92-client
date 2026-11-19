import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, soft, tint, jk, offer as O, staffType } from '../../theme';
import Icon from '../../components/admin/LineIcon';
import { PlateBox, Row } from './WorkerOffer';

const ugx = (n: any) => Number(n || 0).toLocaleString();

/**
 * The car the worker is on, in the same family as the job offer: a status
 * pill and a timer, the number plate, the car, then what they collect and
 * earn. No progress track — the status pill says where the car is, and the
 * one action for it is the slide docked at the bottom of the page.
 *
 *  - washing: amber "Washing", with how long it has been going;
 *  - ready:   green "Ready", with the amount to collect and how the client
 *             said they would pay lifted into its own box.
 */
export default function CurrentCarCard({
  car, minutes, stale, amountDue, paidOnline, payLine,
}: {
  car: any;
  /** Whole minutes in this stage. */
  minutes: number | null;
  /** Ready for too long — the timer turns red. */
  stale: boolean;
  /** UGX still to collect (0 when paid online, free or paid with points). */
  amountDue: number;
  paidOnline: boolean;
  payLine: string;
}) {
  const ready = car.stage === 'ready';
  const pts = Number(car.worker_points_to_award || 0);
  const tone = ready ? tint.success : tint.warning;

  return (
    <View style={s.card}>
      <View style={s.head}>
        <View style={[s.status, { backgroundColor: tone.bg }]}>
          <Icon name={ready ? 'check' : 'tint'} size={13} color={tone.fg} />
          <Text style={[s.statusText, { color: tone.text }]}>{ready ? 'Ready · collect payment' : 'Washing'}</Text>
        </View>
        {minutes != null ? (
          <View style={s.timer} accessibilityLabel={`${minutes} minutes in this stage${stale ? ', waiting too long' : ''}`}>
            <Icon name="clock" size={14} color={stale ? colors.error : colors.textSecondary} />
            <Text style={[s.timerText, stale && { color: colors.error }]}>{minutes} min</Text>
          </View>
        ) : null}
      </View>

      <View style={s.plateBlock}>
        {car.plate ? <PlateBox text={car.plate} big /> : null}
        <Text style={s.carLine}>{[car.vehicle_class_name, car.service_name].filter(Boolean).join(' · ')}</Text>
      </View>

      {ready ? (
        <View style={s.collect}>
          <Text style={s.collectLabel}>{amountDue > 0 ? 'Collect' : paidOnline ? 'Paid online' : 'Nothing to collect'}</Text>
          {amountDue > 0 ? <Text style={s.collectAmount}>UGX {ugx(amountDue)}</Text> : null}
          <Text style={s.collectMethod}>{payLine}</Text>
        </View>
      ) : null}

      <View style={s.details}>
        {car.client_name ? <Row label="Client" value={car.client_name} last={!pts && ready} /> : null}
        {!ready ? (
          <Row
            label="You collect"
            value={car.is_redemption ? 'Free wash' : paidOnline ? 'Paid online' : `UGX ${ugx(car.quoted_amount_ugx)}`}
            last={!pts}
          />
        ) : null}
        {pts > 0 ? <Row label="You earn" value={`+${pts} points`} pill last /> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.bgCard, borderRadius: 22, padding: 16, gap: 14, ...soft.cardShadow },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 6 },
  statusText: { fontSize: 12, ...jk.bold },
  timer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  timerText: { fontSize: 13, ...jk.bold, color: colors.textSecondary, ...staffType.tabular },

  plateBlock: { alignItems: 'center', gap: 10, backgroundColor: O.card, borderRadius: 18, paddingVertical: 18, paddingHorizontal: 12 },
  carLine: { fontSize: 17, ...jk.bold, color: colors.text },

  collect: { backgroundColor: tint.success.bg, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', gap: 2 },
  collectLabel: { fontSize: 12, ...jk.bold, color: tint.success.text },
  collectAmount: { fontSize: 30, lineHeight: 36, ...jk.heavy, color: colors.text, ...staffType.tabular },
  collectMethod: { fontSize: 13, ...jk.medium, color: tint.success.text, textAlign: 'center' },

  details: { paddingHorizontal: 2 },
});
