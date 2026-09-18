import { sessionCompanyName } from '../lib/companyContext';
import type { AuthSession } from '../lib/useAuth';
import type { TrustedAssistantIdentity } from './context';

/**
 * Trusted Assistant identity from the authenticated Management Portal session.
 * Company name comes from company/organisation records, never email or free text.
 */
export function trustedIdentityFromSession(session: AuthSession | null): TrustedAssistantIdentity {
  if (!session) {
    return {
      userId: '',
      companyId: null,
      companyName: null,
      reportingRank: null,
      isOrganisationAdmin: false,
      isPlatformStaff: false,
      portalAccess: false,
      hierarchyScopeKind: null,
      canViewRegions: false,
      canViewTeams: false,
      permissions: [],
      canAccessEngineeringChangelog: false,
    };
  }

  const rank = session.hierarchy?.rank ?? null;
  return {
    userId: session.user.id,
    companyId: session.company?.id ?? session.organisation?.id ?? null,
    companyName: sessionCompanyName(session),
    reportingRank:
      rank === 'executive' ||
      rank === 'regional_manager' ||
      rank === 'team_leader' ||
      rank === 'financial_advisor' ||
      rank === 'platform_admin'
        ? rank
        : null,
    isOrganisationAdmin: Boolean(session.isOrganisationAdmin),
    isPlatformStaff: Boolean(session.isPlatformAdmin),
    portalAccess: session.hierarchy ? session.hierarchy.portalAccess : Boolean(session.isPlatformAdmin),
    hierarchyScopeKind: session.hierarchy?.scopeKind ?? null,
    canViewRegions: Boolean(session.hierarchy?.structureAccess?.canViewRegions),
    canViewTeams: Boolean(session.hierarchy?.structureAccess?.canViewTeams),
    permissions: session.permissions ?? [],
    canAccessEngineeringChangelog: Boolean(session.canAccessEngineeringChangelog),
  };
}
