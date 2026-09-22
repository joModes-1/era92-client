import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import PaymentReceipt from '../worker/PaymentReceipt';

/**
 * Confirms the client's declared payment intent was recorded — not that
 * anything was paid. At this point declarePaymentIntent has succeeded and
 * nothing more: the worker still has to physically collect payment and
 * settle the wash at the bay. PaymentReceipt's own default copy
 * ("Payment Successful") would be a lie here, so both are overridden.
 *
 * Reuses PaymentReceipt as-is rather than forking it — it is already a
 * plain presentational full-screen modal with no worker-only coupling, and
 * one canonical receipt layout is better than two near-duplicate files.
 */
export default function PaymentSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { wash, method } = route.params || {};

  const paymentTypeLabel =
    method === 'mtn' ? 'MTN MoMo (pay at bay)'
      : method === 'airtel' ? 'Airtel Money (pay at bay)'
        : 'Cash (pay at bay)';

  return (
    <PaymentReceipt
      visible
      onClose={() => navigation.popToTop()}
      title="Payment method recorded"
      sub="Show this at the bay. The attendant will confirm your payment and hand over your car."
      reference={wash?.job_no || 'Pending'}
      item={`${wash?.vehicle_class_name || 'Car'} · ${wash?.service_name || 'Wash'}`}
      paymentType={paymentTypeLabel}
      recipient={wash?.branch_name || '92 CarWash'}
      amountUgx={Number(wash?.quoted_amount_ugx || 0)}
      // Points and an SMS confirmation are both real settlement outcomes,
      // and settlement hasn't happened yet — showing either now would be
      // speculative.
      pointsEarned={null}
      smsSent={false}
    />
  );
}
