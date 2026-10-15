/**
 * Picks the vehicle render that suits a service, so it is told apart at a
 * glance the way the mockup's real renders do, rather than a generic car
 * icon standing in for every service. Shared between the service tiles and
 * the start-wash flow so both ever agree on what a given service looks like.
 */
export function artFor(name: string): { image?: any; icon: string; flip?: boolean; offsetY?: number; sizeDelta?: number } {
  const n = name.toLowerCase();
  if (n.includes('bike') || n.includes('motor')) {
    return { image: require('../../../assets/bike.svg'), icon: 'motorcycle' };
  }
  if (n.includes('interior') || n.includes('valet')) {
    // Sits a bit lower than the shared tile-art position — this render's
    // own framing leaves more empty space above the subject than the
    // other services' renders do, so the shared offset left it looking
    // high/floaty next to the rest of the grid.
    return { image: require('../../../assets/2-car-seats.svg'), icon: 'chair', offsetY: 10 };
  }
  if (n.includes('heavy') || n.includes('truck') || n.includes('pickup')) {
    return { image: require('../../../assets/heavy-vehical.svg'), icon: 'truck-pickup', sizeDelta: 3, offsetY: 10 };
  }
  if (n.includes('full')) {
    return { image: require('../../../assets/2-car-seats.svg'), icon: 'car-side' };
  }
  // Engine wash reuses the same car render as Full car wash — flipped so
  // the two don't look identical side by side on the tile grid, and so it
  // drives toward its own label/price text on the right, same reasoning as
  // every other flipped render in this file.
  if (n.includes('engine')) {
    return { image: require('../../../assets/services/full-car-wash.png'), icon: 'car-side', flip: true };
  }
  return { image: require('../../../assets/services/full-car-wash.png'), icon: 'car-side' };
}
