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
  const { wash, method, paid } = route.params || {};

  // What is still owed after any points the client spent at booking.
  const amountDue = wash?.amount_due_ugx != null ? Number(wash.amount_due_ugx) : Number(wash?.quoted_amount_ugx || 0);
  const methodName = method === 'mtn' ? 'MTN Mobile Money' : method === 'airtel' ? 'Airtel Money' : 'cash';

  // Honest copy: nothing has been charged at this point. In-app mobile
  // money arrives with the PesaPal integration; until then every method is
  // paid to the attendant, who confirms it in the worker app.
  const title = paid ? 'Payment received' : method === 'cash' ? 'Pay at the bay' : 'Payment method saved';
  const sub = paid
    ? `UGX ${amountDue.toLocaleString()} received through PesaPal. The attendant has nothing to collect.`
    : amountDue <= 0
    ? 'Nothing more to pay — your points cover this wash.'
    : method === 'cash'
      ? `Hand UGX ${amountDue.toLocaleString()} cash to the attendant when your car is ready. They confirm it in the app.`
      : `Pay UGX ${amountDue.toLocaleString()} with ${methodName} to the attendant at the bay. They confirm it in the app.`;

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
      amountUgx={amountDue}
      title={title}
      sub={sub}
      // Points are only earned when the attendant confirms the payment.
      pointsEarned={null}
    />
  );
}
