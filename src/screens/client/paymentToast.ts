// One-shot flag from the payment receipt to the home screen: the receipt
// sets it on Continue, and the home screen consumes it on focus to show the
// "Payment Successfully" toast once.
let pending = false;

export function markPaymentDone() {
  pending = true;
}

export function consumePaymentDone(): boolean {
  const was = pending;
  pending = false;
  return was;
}
