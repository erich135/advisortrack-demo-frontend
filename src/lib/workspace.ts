import type { AuthSession } from './useAuth';
import { hasLeadershipPortalAccess, isOrganisationAdmin } from './portalAccess';

export type WorkspaceId = 'advisor' | 'management' | 'organisation' | 'platform';

export const ADVISOR_PATHS = [
  '/advisor',
  '/advisor/contacts',
  '/advisor/activities',
  '/advisor/pipeline',
  '/advisor/production',
  '/advisor/planning',
  '/advisor/profile',
  '/advisor/settings',
  '/advisor/subscription',
  '/advisor/setup',
] as const;

export function isAdvisorWorkspacePath(pathname: string): boolean {
  return pathname === '/advisor' || pathname.startsWith('/advisor/');
}

export function isOrganisationWorkspacePath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  return (
    path === '/users' ||
    path.startsWith('/users/') ||
    path === '/licences' ||
    path === '/bulk-import' ||
    path === '/subscription' ||
    path === '/invoices' ||
    path === '/settings'
  );
}

export function isLeadershipReportingPath(pathname: string): boolean {
  const path = pathname.split('?')[0] || '/';
  return (
    path === '/advisors' ||
    path.startsWith('/advisors/') ||
    path === '/team-pipeline' ||
    path === '/production' ||
    path === '/performance' ||
    path === '/audit'
  );
}

/** Phase-1 eligibility: Financial Advisor rank only. Not leadership, not platform. */
export function canUseAdvisorWorkspace(session: AuthSession | null): boolean {
  if (!session || session.isPlatformAdmin) return false;
  return session.hierarchy?.rank === 'financial_advisor';
}

export function eligibleWorkspaces(session: AuthSession | null): WorkspaceId[] {
  if (!session) return [];
  const workspaces: WorkspaceId[] = [];
  if (canUseAdvisorWorkspace(session)) workspaces.push('advisor');
  if (session.isPlatformAdmin) {
    workspaces.push('platform');
    return workspaces;
  }
  if (hasLeadershipPortalAccess(session)) workspaces.push('management');
  if (isOrganisationAdmin(session)) workspaces.push('organisation');
  return workspaces;
}

export function workspaceFromPath(
  pathname: string,
  environment: 'production' | 'demo' = 'production',
): WorkspaceId {
  const path = pathname.split('?')[0] || '/';
  if (isAdvisorWorkspacePath(path)) return 'advisor';
  if (
    path.startsWith('/engineering') ||
    path.startsWith('/enterprise-customers') ||
    path === '/licence-requests' ||
    path === '/companies' ||
    path.startsWith('/companies/') ||
    path === '/subscriptions' ||
    path === '/support'
  ) {
    return 'platform';
  }
  if (environment === 'production' && (path === '/performance' || path === '/audit')) {
    return 'platform';
  }
  if (isOrganisationWorkspacePath(path)) return 'organisation';
  return 'management';
}

export function defaultPathForWorkspace(workspace: WorkspaceId): string {
  switch (workspace) {
    case 'advisor':
      return '/advisor';
    case 'organisation':
      return '/users';
    case 'platform':
      return '/';
    default:
      return '/';
  }
}

export function workspaceLabel(workspace: WorkspaceId): string {
  switch (workspace) {
    case 'advisor':
      return 'Advisor';
    case 'organisation':
      return 'Organisation Admin';
    case 'platform':
      return 'Platform';
    default:
      return 'Management';
  }
}

/** Mixed-eligibility switcher. A8.1 cares about FA + Organisation Admin. */
export function shouldShowWorkspaceSwitcher(session: AuthSession | null): boolean {
  const eligible = eligibleWorkspaces(session);
  return eligible.includes('advisor') && eligible.length > 1;
}
