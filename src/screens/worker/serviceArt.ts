/**
 * Picks the vehicle render that suits a service, so it is told apart at a
 * glance the way the mockup's real renders do, rather than a generic car
 * icon standing in for every service. Shared between the service tiles and
 * the start-wash flow so both ever agree on what a given service looks like.
 */
export function artFor(name: string): { image?: any; icon: string } {
  const n = name.toLowerCase();
  if (n.includes('bike') || n.includes('motor')) {
    return { image: require('../../../assets/services/bikes.png'), icon: 'motorcycle' };
  }
  if (n.includes('interior') || n.includes('valet')) {
    return { image: require('../../../assets/services/interior-detailing.png'), icon: 'chair' };
  }
  if (n.includes('heavy') || n.includes('truck') || n.includes('pickup')) {
    return { image: require('../../../assets/services/heavy-vehicle.png'), icon: 'truck-pickup' };
  }
  if (n.includes('engine')) return { icon: 'cogs' };
  return { image: require('../../../assets/services/full-car-wash.png'), icon: 'car-side' };
}
