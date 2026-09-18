/**
 * AdvisorTrack Assistant A4 context — read-only, no persistence.
 * Identity/role/permissions come from the authenticated session.
 * Navigation may supply pathname/search only.
 */
import type { FrontendKnowledgeRoute } from './types';

export type AssistantEnvironment = 'production' | 'demo';
export type ReportingRole = 'executive' | 'regional_manager' | 'team_leader' | 'financial_advisor';
export type AssistantScopeKind = 'company' | 'region' | 'team' | 'self' | 'platform';

/** Client-provided navigation. Security-sensitive fields here are ignored. */
export type AssistantNavigation = {
  pathname: string;
  search?: string;
  companyId?: unknown;
  role?: unknown;
  isOrganisationAdmin?: unknown;
  isPlatformStaff?: unknown;
  permissions?: unknown;
};

/**
 * Trusted identity snapshot. Callers must populate this from authenticated
 * session helpers — never from URL, email domain, or request body.
 */
export type TrustedAssistantIdentity = {
  userId: string;
  companyId: string | null;
  companyName: string | null;
  reportingRank: ReportingRole | 'platform_admin' | null;
  isOrganisationAdmin: boolean;
  isPlatformStaff: boolean;
  /** Existing hierarchy.portalAccess — leadership portal, not “any portal screen”. */
  portalAccess: boolean;
  hierarchyScopeKind: 'organisation' | 'region' | 'team' | null;
  canViewRegions: boolean;
  canViewTeams: boolean;
  permissions: string[];
  canAccessEngineeringChangelog: boolean;
};

export type AssistantLicencePool = {
  purchased: number | null;
  assigned: number;
  available: number | null;
};

export type AssistantContext = {
  environment: AssistantEnvironment;
  identity: {
    userId: string;
    companyId: string | null;
    companyName: string | null;
  };
  role: {
    reportingRole: ReportingRole | null;
    isOrganisationAdmin: boolean;
    isPlatformStaff: boolean;
    advisorUsesMobileApp: boolean;
    hasAnyPortalAccess: boolean;
    hasLeadershipPortalAccess: boolean;
    scopeKind: AssistantScopeKind | null;
  };
  capabilities: Record<string, boolean>;
  route: {
    routeId: string | null;
    path: string;
    tab: string | null;
    query: Record<string, string>;
  };
  facts?: {
    licencePool?: AssistantLicencePool;
  };
};

export type AssistantRouteRef = Pick<FrontendKnowledgeRoute, 'routeId' | 'path' | 'environment'> & {
  productionCapability?: string | null;
  demoCapability?: string | null;
  label?: string;
  demoLabel?: string;
};

function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

function parseQuery(search?: string): Record<string, string> {
  const raw = (search ?? '').startsWith('?') ? search!.slice(1) : (search ?? '');
  const params = new URLSearchParams(raw);
  const query: Record<string, string> = {};
  params.forEach((value, key) => {
    query[key] = value;
  });
  return query;
}

function pathMatches(patternPath: string, pathname: string): boolean {
  if (patternPath === pathname) return true;
  const patternParts = patternPath.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;
  return patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
}

function routeScore(routePath: string): number {
  const [pathname, queryString] = routePath.split('?');
  const staticParts = (pathname || '/').split('/').filter((part) => part && !part.startsWith(':')).length;
  const queryKeys = queryString ? queryString.split('&').length : 0;
  return staticParts * 10 + queryKeys * 5;
}

export function resolveAssistantRoute(
  routes: AssistantRouteRef[],
  navigation: Pick<AssistantNavigation, 'pathname' | 'search'>,
  environment: AssistantEnvironment,
): AssistantContext['route'] {
  const pathname = normalizePathname(navigation.pathname || '/');
  const query = parseQuery(navigation.search);
  const tab = query.tab ?? null;

  const ranked = [...routes]
    .filter((route) => route.environment === 'both' || route.environment === environment)
    .sort((left, right) => routeScore(right.path) - routeScore(left.path));

  for (const route of ranked) {
    const [patternPath, patternQuery] = route.path.split('?');
    if (!pathMatches(patternPath || '/', pathname)) continue;
    if (patternQuery) {
      const required = new URLSearchParams(patternQuery);
      let matches = true;
      required.forEach((value, key) => {
        if (query[key] !== value) matches = false;
      });
      if (!matches) continue;
    } else if (route.routeId === 'users' && (tab === 'regions' || tab === 'teams')) {
      continue;
    }
    return { routeId: route.routeId, path: pathname, tab, query };
  }

  return { routeId: null, path: pathname, tab, query };
}

export function reportingRoleOf(
  rank: TrustedAssistantIdentity['reportingRank'],
): ReportingRole | null {
  if (rank === 'executive' || rank === 'regional_manager' || rank === 'team_leader' || rank === 'financial_advisor') {
    return rank;
  }
  return null;
}

export function advisorUsesMobileAppOf(identity: TrustedAssistantIdentity): boolean {
  return reportingRoleOf(identity.reportingRank) === 'financial_advisor';
}

export function hasLeadershipPortalAccessOf(
  identity: TrustedAssistantIdentity,
  environment: AssistantEnvironment,
): boolean {
  const isStaff = environment === 'production' && identity.isPlatformStaff;
  if (isStaff) return true;
  if (environment === 'demo') {
    const rank = reportingRoleOf(identity.reportingRank);
    return rank === 'executive' || rank === 'regional_manager' || rank === 'team_leader';
  }
  return identity.portalAccess;
}

export function hasAnyPortalAccessOf(
  identity: TrustedAssistantIdentity,
  environment: AssistantEnvironment,
): boolean {
  if (environment === 'production' && identity.isPlatformStaff) return true;
  if (identity.isOrganisationAdmin) return true;
  if (identity.permissions.includes('manage_members')) return true;
  return hasLeadershipPortalAccessOf(identity, environment);
}

export function scopeKindOf(identity: TrustedAssistantIdentity): AssistantScopeKind | null {
  if (identity.isPlatformStaff && !identity.companyId) return 'platform';
  if (identity.reportingRank === 'financial_advisor') return 'self';
  if (identity.hierarchyScopeKind === 'organisation') return 'company';
  if (identity.hierarchyScopeKind === 'region') return 'region';
  if (identity.hierarchyScopeKind === 'team') return 'team';
  if (identity.isPlatformStaff) return 'platform';
  return null;
}

export function buildAssistantContext(input: {
  environment: AssistantEnvironment;
  identity: TrustedAssistantIdentity;
  navigation: AssistantNavigation;
  capabilities: Record<string, boolean>;
  routes?: AssistantRouteRef[];
}): AssistantContext {
  const { environment, identity, navigation, capabilities } = input;
  const isStaff = environment === 'production' && identity.isPlatformStaff;
  return {
    environment,
    identity: {
      userId: identity.userId,
      companyId: identity.companyId,
      companyName: identity.companyName,
    },
    role: {
      reportingRole: reportingRoleOf(identity.reportingRank),
      isOrganisationAdmin: identity.isOrganisationAdmin,
      isPlatformStaff: isStaff,
      advisorUsesMobileApp: advisorUsesMobileAppOf(identity),
      hasAnyPortalAccess: hasAnyPortalAccessOf(identity, environment),
      hasLeadershipPortalAccess: hasLeadershipPortalAccessOf(identity, environment),
      scopeKind: scopeKindOf({ ...identity, isPlatformStaff: isStaff }),
    },
    capabilities,
    route: resolveAssistantRoute(input.routes ?? [], navigation, environment),
  };
}

export function withLicenceFacts(
  context: AssistantContext,
  pool: AssistantLicencePool | null | undefined,
): AssistantContext {
  if (!context.capabilities.canViewLicences || !pool) {
    if (!context.facts) return context;
    const next = { ...context };
    delete next.facts;
    return next;
  }
  return {
    ...context,
    facts: {
      licencePool: {
        purchased: pool.purchased,
        assigned: pool.assigned,
        available: pool.available,
      },
    },
  };
}

export function alreadyOnRouteMessage(route: AssistantRouteRef, environment: AssistantEnvironment): string {
  const label = environment === 'demo' && route.demoLabel ? route.demoLabel : (route.label ?? route.routeId);
  return `You're already on the ${label} page.`;
}

export function contextAudience(context: AssistantContext): 'customer' | 'staff' {
  return context.role.isPlatformStaff ? 'staff' : 'customer';
}

export function cardMatchesCapabilities(
  requiredCapabilities: string[],
  capabilities: Record<string, boolean>,
): boolean {
  return requiredCapabilities.every((key) => capabilities[key] === true);
}

export function capabilityForRoute(route: AssistantRouteRef, environment: AssistantEnvironment): string | null {
  if (environment === 'demo' && route.demoCapability !== undefined) {
    return route.demoCapability;
  }
  return route.productionCapability ?? null;
}

export function routeReachable(route: AssistantRouteRef, context: AssistantContext): boolean {
  if (route.environment !== 'both' && route.environment !== context.environment) return false;
  const capability = capabilityForRoute(route, context.environment);
  if (!capability) return context.role.hasAnyPortalAccess;
  if (!Object.keys(context.capabilities).length) return true;
  return context.capabilities[capability] === true;
}
