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

// Washes booked via "Redeem points": the home screen skips the payment
// popup for these. In-memory only (UI-only points flow for now).
const pointsWashIds = new Set<string>();

export function markPaidWithPoints(washId: string) {
  pointsWashIds.add(washId);
}

export function isPaidWithPoints(washId: string): boolean {
  return pointsWashIds.has(washId);
}
