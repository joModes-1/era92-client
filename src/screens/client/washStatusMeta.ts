import { colors } from '../../theme';

/**
 * How a wash's status reads to the client — used by ClientHome's inline
 * progress tracker, and available to any other client screen that needs
 * the same wording, so nothing drifts into describing a status
 * differently in two places.
 *
 * 'requested' is the self-service addition: a wash the client booked
 * themselves that no worker has accepted yet. Without an entry here it fell
 * through to the "no wash in progress" empty state, which is wrong — a
 * client who just booked is very much waiting on something.
 */
export const STATUS_META: Record<string, { title: string; sub: string; color: string; icon: string }> = {
  requested: {
    title: 'Your wash is booked',
    sub: "We'll start the moment a worker is free.",
    color: colors.info,
    icon: 'clock',
  },
  in_progress: {
    title: 'Your car is being washed',
    sub: 'We will let you know the moment it is ready.',
    color: colors.washing,
    icon: 'soap',
  },
  ready: {
    title: 'Your car is ready',
    sub: 'Head to the bay and pay to collect.',
    color: colors.success,
    icon: 'check-circle',
  },
};
