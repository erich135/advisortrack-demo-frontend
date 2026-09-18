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

export function isOrganisationAdmin(session: AuthSession | null): boolean {
  return Boolean(session?.isOrganisationAdmin);
}

/** Users, licences, and organisation admin — not reporting/pipeline. */
export function hasOrganisationAdminAccess(session: AuthSession | null): boolean {
  if (!session) return false;
  if (session.isPlatformAdmin) return true;
  if (session.isOrganisationAdmin) return true;
  if ((session.permissions ?? []).includes('manage_members')) return true;
  return hasLeadershipPortalAccess(session);
}

/**
 * Bulk Import: Organisation Admin, platform admin, or explicit manage_members.
 * Leadership portal access alone is not enough.
 */
export function canBulkImportMembers(session: AuthSession | null): boolean {
  if (!session) return false;
  if (session.isPlatformAdmin) return true;
  if (session.isOrganisationAdmin) return true;
  return (session.permissions ?? []).includes('manage_members');
}

export function isCustomerExecutive(session: AuthSession | null): boolean {
  return session?.hierarchy?.rank === 'executive';
}

export function isCustomerPeopleManager(session: AuthSession | null): boolean {
  const rank = session?.hierarchy?.rank;
  return rank === 'executive' || rank === 'regional_manager' || rank === 'team_leader';
}

/** Regions & Teams tabs — driven by structureAccess, not reporting rank alone. */
export function canViewRegionsAndTeams(session: AuthSession | null): boolean {
  const access = session?.hierarchy?.structureAccess;
  if (!access) return false;
  if (access.canViewRegions) return true;
  return Boolean(access.canViewTeams && session?.hierarchy?.rank !== 'team_leader');
}

/** Customer-facing Audit Trail: Executive (company) and Regional Manager (downline). */
export function isCustomerAuditViewer(session: AuthSession | null): boolean {
  const rank = session?.hierarchy?.rank;
  return rank === 'executive' || rank === 'regional_manager';
}

export function canViewCompanySubscription(session: AuthSession | null): boolean {
  if (!session) return false;
  if (session.isPlatformAdmin) return true;
  if (isOrganisationAdmin(session)) return true;
  if (isPublicDemo && isCustomerExecutive(session)) return true;
  return false;
}

/** Organisation Admin (or staff) may view own-company invoices. Demo executives can view for showcase. */
export function canViewCompanyInvoices(session: AuthSession | null): boolean {
  if (!session) return false;
  if (session.isPlatformAdmin) return true;
  if (isOrganisationAdmin(session)) return true;
  if (isPublicDemo && isCustomerExecutive(session)) return true;
  return false;
}
