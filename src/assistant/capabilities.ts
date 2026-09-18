import type { AuthSession } from '../lib/useAuth';
import {
  canBulkImportMembers,
  canViewCompanyInvoices,
  canViewCompanySubscription,
  canViewRegionsAndTeams,
  hasLeadershipPortalAccess,
  hasOrganisationAdminAccess,
  isCustomerExecutive,
  isOrganisationAdmin,
} from '../lib/portalAccess';
import type { AssistantEnvironment } from './context';

const CAPABILITY_KEYS = [
  'canViewDashboard',
  'canViewUsers',
  'canManageMembers',
  'canBulkImport',
  'canViewRegionsTeams',
  'canViewLicences',
  'canViewPipeline',
  'canViewAdvisors',
  'canViewProduction',
  'canViewPerformance',
  'canViewAudit',
  'canViewSubscription',
  'canViewInvoices',
  'canViewSettings',
  'isOrganisationAdmin',
  'isPlatformStaff',
  'canAccessEngineeringChangelog',
] as const;

function canViewDashboard(session: AuthSession | null): boolean {
  if (!session) return false;
  if (session.isPlatformAdmin || isOrganisationAdmin(session)) return true;
  if (session.hierarchy) return session.hierarchy.portalAccess;
  return true;
}

function canViewAudit(session: AuthSession | null, environment: AssistantEnvironment): boolean {
  if (!session) return false;
  if (environment === 'demo') {
    const rank = session.hierarchy?.rank;
    return rank === 'executive' || rank === 'regional_manager';
  }
  return Boolean(session.isPlatformAdmin);
}

function canViewPerformance(session: AuthSession | null, environment: AssistantEnvironment): boolean {
  if (!session) return false;
  if (environment === 'demo') return hasLeadershipPortalAccess(session);
  return Boolean(session.isPlatformAdmin);
}

/**
 * Mirrors existing portalAccess helpers. Does not invent a second permission model.
 */
export function capabilitiesFromSession(
  session: AuthSession | null,
  environment: AssistantEnvironment,
): Record<string, boolean> {
  const capabilities = Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, false]));
  if (!session) return capabilities;

  const isStaff = environment === 'production' && Boolean(session.isPlatformAdmin);
  const manageMembers = canBulkImportMembers(session);
  const leadership = hasLeadershipPortalAccess(session);

  capabilities.canViewDashboard = canViewDashboard(session);
  capabilities.canViewUsers = hasOrganisationAdminAccess(session);
  capabilities.canManageMembers = manageMembers;
  capabilities.canBulkImport = manageMembers;
  capabilities.canViewRegionsTeams = canViewRegionsAndTeams(session);
  capabilities.canViewLicences = hasOrganisationAdminAccess(session);
  capabilities.canViewPipeline = leadership;
  capabilities.canViewAdvisors = leadership;
  capabilities.canViewProduction = leadership;
  capabilities.canViewPerformance = canViewPerformance(session, environment);
  capabilities.canViewAudit = canViewAudit(session, environment);
  capabilities.canViewSubscription = canViewCompanySubscription(session);
  capabilities.canViewInvoices = canViewCompanyInvoices(session);
  capabilities.canViewSettings = isCustomerExecutive(session) || isStaff;
  capabilities.isOrganisationAdmin = isOrganisationAdmin(session);
  capabilities.isPlatformStaff = isStaff;
  capabilities.canAccessEngineeringChangelog =
    environment === 'production' && Boolean(session.canAccessEngineeringChangelog);

  return capabilities;
}
