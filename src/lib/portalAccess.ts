import type { AuthSession } from './useAuth';
import { isPublicDemo } from './publicDemo';

export function hasLeadershipPortalAccess(session: AuthSession | null): boolean {
  if (!session) return false;
  if (isPublicDemo) {
    const rank = session.hierarchy?.rank;
    return rank === 'executive' || rank === 'regional_manager' || rank === 'team_leader';
  }
  if (session.isPlatformAdmin) return true;
  if (session.hierarchy) return session.hierarchy.portalAccess;
  return true;
}

export function isCustomerExecutive(session: AuthSession | null): boolean {
  return session?.hierarchy?.rank === 'executive';
}

export function isCustomerPeopleManager(session: AuthSession | null): boolean {
  const rank = session?.hierarchy?.rank;
  return rank === 'executive' || rank === 'regional_manager' || rank === 'team_leader';
}
