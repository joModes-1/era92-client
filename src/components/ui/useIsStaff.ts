import { useAuth } from '../../api/AuthContext';

/**
 * True on worker, manager, org admin and platform screens — where
 * STAFF-UI-SPEC.md applies. Shared components (ScreenHeader, SectionHeader…)
 * read it so the staff rules never touch the client app, whose screens are
 * matched to its verified mockup. Signed-out screens count as client.
 */
export function useIsStaff(): boolean {
  const { actor } = useAuth();
  const role = actor?.role || actor?.type;
  return !!role && role !== 'client';
}

/** True only for an org admin — the role the new colour pass is rolled out to. */
export function useIsOrgAdmin(): boolean {
  const { actor } = useAuth();
  return (actor?.role || actor?.type) === 'orgadmin';
}

/** Roles the new colour pass has rolled out to: org admin and worker. */
export function useIsBranded(): boolean {
  const { actor } = useAuth();
  const role = actor?.role || actor?.type;
  return role === 'orgadmin' || role === 'worker';
}
