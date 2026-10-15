import React from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import PaymentReceipt from './PaymentReceipt';
import { markPaymentDone } from './paymentToast';

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
    method === 'mtn' ? 'MTN MoMo'
      : method === 'airtel' ? 'Airtel Money'
        : 'Cash';

  return (
    <PaymentReceipt
      visible
      onClose={() => { markPaymentDone(); navigation.popToTop(); }}
      reference={wash?.receipt_no || wash?.job_no || 'Pending'}
      item={wash?.service_name || 'Wash'}
      paymentType={paymentTypeLabel}
      recipient={wash?.branch_name || '92 Carwash'}
      amountUgx={Number(wash?.quoted_amount_ugx || 0)}
      // No client points system exists yet, so there is no real number to show.
      pointsEarned={null}
    />
  );
}
