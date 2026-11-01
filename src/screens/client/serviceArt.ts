/**
 * Picks the vehicle render that suits a service, so it is told apart at a
 * glance the way the mockup's real renders do, rather than a generic car
 * icon standing in for every service. Shared between the service tiles and
 * the start-wash flow so both ever agree on what a given service looks like.
 */
export type ServiceArt = {
  image?: any;
  icon: string;
  flip?: boolean;
  /** Nudge for the booking screen's hero art, whose framing differs per render. */
  offsetY?: number;
  /**
   * Home tile: size against the shared tile art box (1 = full). The renders
   * are not framed alike — the car pair fills its file edge to edge, the
   * seats and the scooter fill theirs top to bottom — so at one size the
   * seats and scooter towered over the cars. Matched to the mockup.
   */
  tileScale?: number;
  /**
   * Home tile: px the render sits below the tile floor. The van's file has
   * a band of empty space under its wheels; sinking it puts the wheels on
   * the floor like the others.
   */
  tileBottom?: number;
};

export function artFor(name: string): ServiceArt {
  const n = name.toLowerCase();
  if (n.includes('bike') || n.includes('motor')) {
    return { image: require('../../../assets/bike.png'), icon: 'motorcycle', tileScale: 0.82 };
  }
  if (n.includes('interior') || n.includes('valet')) {
    // Sits a bit lower on the booking hero — this render's own framing
    // leaves more empty space above the subject than the others do.
    return { image: require('../../../assets/car-seats.png'), icon: 'chair', offsetY: 10, tileScale: 0.78 };
  }
  if (n.includes('heavy') || n.includes('truck') || n.includes('pickup')) {
    return { image: require('../../../assets/heavy-vehicle.png'), icon: 'truck-pickup', offsetY: 10, tileScale: 0.85, tileBottom: -9 };
  }
  // The car pair, as on the mockup's "Full car wash" tile — mirrored, because
  // the file's cars face left and the mockup's drive to the right. Engine
  // wash shares it: the home grid shows one or the other, never both
  // (ClientHome's tile order).
  return { image: require('../../../assets/services/full-car-wash.png'), icon: 'car-side', flip: true };
}
