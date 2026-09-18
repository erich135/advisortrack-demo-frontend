/**
 * AdvisorTrack Assistant A4 context.
 * Run: npm run test:assistant-context
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capabilitiesFromSession } from '../src/assistant/capabilities';
import { answerFromCard } from '../src/assistant/cardToAnswer';
import {
  alreadyOnRouteMessage,
  buildAssistantContext,
  resolveAssistantRoute,
  withLicenceFacts,
} from '../src/assistant/context';
import { filterCards, filterCardsForContext, visibleHomeTopics } from '../src/assistant/filter';
import { trustedIdentityFromSession } from '../src/assistant/sessionIdentity';
import type { FrontendKnowledgeBundle } from '../src/assistant/types';
import type { AuthSession } from '../src/lib/useAuth';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const isDemoFrontend = fs.existsSync(path.join(root, 'src/lib/publicDemo.ts'));

const kb = JSON.parse(
  fs.readFileSync(path.join(root, 'src/assistant/knowledge-bundle.json'), 'utf8'),
) as FrontendKnowledgeBundle;

function session(partial: Partial<AuthSession> & { hierarchy?: AuthSession['hierarchy'] }): AuthSession {
  return {
    user: {
      id: 'user-1',
      email: 'alex@northstar.test',
      firstName: 'Alex',
      lastName: 'Reed',
      company: 'ignore-this-free-text',
    },
    subscription: null,
    organisation: { id: 'company-northstar', name: 'Northstar Advisory' },
    company: { id: 'company-northstar', name: 'Northstar Advisory' },
    role: { id: 'role-exec', name: 'Executive' },
    permissions: [],
    reportsToUserId: null,
    isPlatformAdmin: false,
    isOrganisationAdmin: false,
    canAccessEngineeringChangelog: false,
    hierarchy: {
      rank: 'executive',
      label: 'Executive',
      comparisonRank: null,
      comparisonRoleLabel: null,
      portalAccess: true,
      scopeKind: 'organisation',
      structureAccess: {
        canViewRegions: true,
        canManageRegions: true,
        canViewTeams: true,
        canManageTeams: true,
      },
    },
    ...partial,
  };
}

const executive = session({});
const regional = session({
  user: { id: 'rm-1', email: 'rm@northstar.test', firstName: 'Riley', lastName: 'Manager' },
  hierarchy: {
    rank: 'regional_manager',
    label: 'Regional Manager',
    comparisonRank: null,
    comparisonRoleLabel: null,
    portalAccess: true,
    scopeKind: 'region',
    structureAccess: {
      canViewRegions: true,
      canManageRegions: false,
      canViewTeams: true,
      canManageTeams: false,
    },
  },
});
const teamLeader = session({
  user: { id: 'tl-1', email: 'tl@northstar.test', firstName: 'Taylor', lastName: 'Lead' },
  hierarchy: {
    rank: 'team_leader',
    label: 'Team Leader',
    comparisonRank: null,
    comparisonRoleLabel: null,
    portalAccess: true,
    scopeKind: 'team',
    structureAccess: {
      canViewRegions: false,
      canManageRegions: false,
      canViewTeams: true,
      canManageTeams: false,
    },
  },
});
const advisor = session({
  user: { id: 'fa-1', email: 'fa@northstar.test', firstName: 'Finn', lastName: 'Advisor' },
  hierarchy: {
    rank: 'financial_advisor',
    label: 'Financial Advisor',
    comparisonRank: null,
    comparisonRoleLabel: null,
    portalAccess: false,
    scopeKind: null,
    structureAccess: {
      canViewRegions: false,
      canManageRegions: false,
      canViewTeams: false,
      canManageTeams: false,
    },
  },
});
const orgAdminFa = session({
  ...advisor,
  user: { id: 'fa-admin-1', email: 'adminfa@northstar.test', firstName: 'Ada', lastName: 'Admin' },
  isOrganisationAdmin: true,
  hierarchy: advisor.hierarchy,
});
const orgAdminExec = session({ isOrganisationAdmin: true });
const staff = session({
  isPlatformAdmin: true,
  canAccessEngineeringChangelog: true,
  hierarchy: {
    rank: 'platform_admin',
    label: 'Platform Admin',
    comparisonRank: null,
    comparisonRoleLabel: null,
    portalAccess: true,
    scopeKind: 'organisation',
  },
});

function contextFor(
  current: AuthSession,
  environment: 'production' | 'demo',
  navigation: { pathname: string; search?: string; companyId?: string; role?: string; isOrganisationAdmin?: boolean },
) {
  return buildAssistantContext({
    environment,
    identity: trustedIdentityFromSession(current),
    navigation,
    capabilities: capabilitiesFromSession(current, environment),
    routes: kb.routes,
  });
}

const execProd = contextFor(executive, 'production', { pathname: '/' });
assert.equal(execProd.environment, 'production');
assert.equal(execProd.identity.companyName, 'Northstar Advisory');
assert.equal(execProd.identity.companyId, 'company-northstar');
assert.equal(execProd.role.reportingRole, 'executive');
assert.equal(execProd.role.advisorUsesMobileApp, false);
assert.equal(execProd.role.hasLeadershipPortalAccess, true);
assert.equal(execProd.role.hasAnyPortalAccess, true);
assert.equal(execProd.role.scopeKind, 'company');
assert.equal(execProd.route.routeId, 'dashboard');
assert.equal(execProd.capabilities.canViewPipeline, true);
assert.equal(execProd.capabilities.canViewInvoices, false);

const execDemo = contextFor(executive, 'demo', { pathname: '/' });
assert.equal(execDemo.environment, 'demo');
assert.equal(execDemo.role.isPlatformStaff, false);

const rm = contextFor(regional, 'production', { pathname: '/team-pipeline' });
assert.equal(rm.role.reportingRole, 'regional_manager');
assert.equal(rm.role.scopeKind, 'region');
assert.equal(rm.role.advisorUsesMobileApp, false);
assert.equal(rm.role.hasLeadershipPortalAccess, true);
assert.equal(rm.capabilities.canViewPipeline, true);

const tl = contextFor(teamLeader, 'production', { pathname: '/invoices' });
assert.equal(tl.role.reportingRole, 'team_leader');
assert.equal(tl.role.advisorUsesMobileApp, false);
assert.equal(tl.role.hasLeadershipPortalAccess, true);
assert.equal(tl.role.hasAnyPortalAccess, true);
assert.equal(tl.capabilities.canViewInvoices, false);
assert.equal(tl.route.routeId, 'invoices');
assert.equal(tl.capabilities.canViewInvoices, false, 'route does not grant capability');

const fa = contextFor(advisor, 'production', { pathname: '/' });
assert.equal(fa.role.reportingRole, 'financial_advisor');
assert.equal(fa.role.advisorUsesMobileApp, true);
assert.equal(fa.role.hasLeadershipPortalAccess, false);
assert.equal(fa.role.hasAnyPortalAccess, false);
assert.equal(fa.role.scopeKind, 'self');
assert.equal(fa.capabilities.canViewDashboard, false);
assert.equal(fa.capabilities.canViewPipeline, false);
assert.equal(fa.capabilities.canViewLicences, false);
assert.equal(fa.capabilities.canViewUsers, false);
assert.equal(fa.capabilities.canBulkImport, false);
assert.equal(fa.capabilities.canViewSubscription, false);
assert.equal(fa.capabilities.canViewInvoices, false);

const faAdmin = contextFor(orgAdminFa, 'production', { pathname: '/users' });
assert.equal(faAdmin.role.reportingRole, 'financial_advisor');
assert.equal(faAdmin.role.advisorUsesMobileApp, true);
assert.equal(faAdmin.role.hasLeadershipPortalAccess, false);
assert.equal(faAdmin.role.hasAnyPortalAccess, true);
assert.equal(faAdmin.role.scopeKind, 'self');
assert.equal(faAdmin.role.isOrganisationAdmin, true);
assert.equal(faAdmin.capabilities.canViewUsers, true);
assert.equal(faAdmin.capabilities.canViewLicences, true);
assert.equal(faAdmin.capabilities.canBulkImport, true);
assert.equal(faAdmin.capabilities.canViewSubscription, true);
assert.equal(faAdmin.capabilities.canViewInvoices, true);
assert.equal(faAdmin.capabilities.canViewPipeline, false);
assert.equal(faAdmin.capabilities.canViewAdvisors, false);
assert.equal(faAdmin.capabilities.canViewProduction, false);
assert.equal(faAdmin.capabilities.canViewPerformance, false);

const orgAdmin = contextFor(orgAdminExec, 'production', { pathname: '/subscription' });
assert.equal(orgAdmin.capabilities.canViewSubscription, true);
assert.equal(orgAdmin.capabilities.canViewInvoices, true);

const staffProd = contextFor(staff, 'production', { pathname: '/licence-requests' });
assert.equal(staffProd.role.reportingRole, null);
assert.equal(staffProd.role.isPlatformStaff, true);
assert.equal(staffProd.capabilities.canAccessEngineeringChangelog, true);

const staffDemo = contextFor(staff, 'demo', { pathname: '/licence-requests' });
assert.equal(staffDemo.role.isPlatformStaff, false);
assert.equal(staffDemo.capabilities.canAccessEngineeringChangelog, false);
assert.equal(staffDemo.route.routeId, null);

const spoof = contextFor(teamLeader, 'production', {
  pathname: '/users',
  search: '?tab=regions',
  companyId: 'some-other-company',
  role: 'executive',
  isOrganisationAdmin: true,
});
assert.equal(spoof.role.isOrganisationAdmin, false, 'client cannot spoof Organisation Admin');
assert.equal(spoof.role.reportingRole, 'team_leader', 'client cannot spoof Executive');
assert.equal(spoof.identity.companyId, 'company-northstar', 'client cannot spoof another company');
assert.equal(spoof.route.routeId, 'users-regions');

assert.equal(resolveAssistantRoute(kb.routes, { pathname: '/users' }, 'production').routeId, 'users');
assert.equal(
  resolveAssistantRoute(kb.routes, { pathname: '/users', search: '?tab=regions' }, 'production').routeId,
  'users-regions',
);
assert.equal(
  resolveAssistantRoute(kb.routes, { pathname: '/users', search: '?tab=teams' }, 'production').routeId,
  'users-teams',
);
assert.equal(resolveAssistantRoute(kb.routes, { pathname: '/licences' }, 'production').routeId, 'licences');
assert.equal(resolveAssistantRoute(kb.routes, { pathname: '/bulk-import' }, 'production').routeId, 'bulk-import');
assert.equal(resolveAssistantRoute(kb.routes, { pathname: '/subscription' }, 'production').routeId, 'subscription');
assert.equal(resolveAssistantRoute(kb.routes, { pathname: '/invoices' }, 'production').routeId, 'invoices');
assert.equal(resolveAssistantRoute(kb.routes, { pathname: '/team-pipeline' }, 'production').routeId, 'team-pipeline');
const unknown = resolveAssistantRoute(kb.routes, { pathname: '/not-a-real-page' }, 'production');
assert.equal(unknown.routeId, null);
assert.equal(unknown.path, '/not-a-real-page');

const withFacts = withLicenceFacts(orgAdmin, { purchased: 80, assigned: 12, available: 68 });
assert.equal(withFacts.facts?.licencePool?.purchased, 80);
const withheld = withLicenceFacts(fa, { purchased: 80, assigned: 12, available: 68 });
assert.equal(withheld.facts, undefined);

const tlCards = filterCardsForContext(kb, tl);
assert.equal(tlCards.some((card) => card.id === 'COMM.INVOICES'), false, 'Team Leader does not see invoice help');
assert.equal(
  filterCardsForContext(kb, execDemo).some((card) => card.id === 'DEMO.RESET'),
  isDemoFrontend,
  'Demo Executive may see Demo Tips only in the demo customer snapshot',
);
assert.equal(filterCardsForContext(kb, execProd).some((card) => card.id === 'DEMO.RESET'), false);
assert.equal(filterCardsForContext(kb, orgAdmin).some((card) => card.id === 'STAFF.LICENCE_REQUEST_QUEUE'), false);
assert.equal(filterCardsForContext(kb, staffProd).some((card) => card.id === 'STAFF.LICENCE_REQUEST_QUEUE'), false);
assert.equal(filterCardsForContext(kb, orgAdmin).some((card) => card.id === 'COMM.INVOICES'), true);

const commercial = kb.homeTopics.find((topic) => topic.id === 'commercial');
assert.ok(commercial);
assert.equal(visibleHomeTopics(kb.homeTopics, tlCards, 'production').some((topic) => topic.id === 'commercial'), false);

const licenceCard = kb.cards.find((card) => card.id === 'LIC.ASSIGN');
assert.ok(licenceCard);
const onLicences = contextFor(orgAdminExec, 'production', { pathname: '/licences' });
const already = answerFromCard(kb, licenceCard, withLicenceFacts(onLicences, { purchased: 80, assigned: 12, available: 68 }));
assert.equal(already.steps?.[0]?.label, "You're already on the Licences page.");
assert.equal(already.actions?.some((action) => action.routeId === 'licences') ?? false, false);
assert.deepEqual(
  already.facts?.map((fact) => fact.label),
  ['Purchased', 'Assigned', 'Available'],
);
const licencesRoute = kb.routes.find((route) => route.routeId === 'licences');
assert.ok(licencesRoute);
assert.equal(alreadyOnRouteMessage(licencesRoute, 'production'), "You're already on the Licences page.");

assert.equal(
  filterCards(kb, { environment: 'production', audience: 'customer' }).some((card) => card.id.startsWith('STAFF.')),
  false,
);

assert.match(src('src/assistant/capabilities.ts'), /from '\.\.\/lib\/portalAccess'/);
assert.doesNotMatch(src('src/assistant/context.ts'), /portalNavigation/);
assert.match(src('src/assistant/useAssistantContext.ts'), /getCompanyLicencePool/);
assert.doesNotMatch(src('src/assistant/useAssistantContext.ts'), /seat_limit|purchased\s*-\s*assigned/);
assert.doesNotMatch(src('src/assistant/sessionIdentity.ts'), /user\.company|email domain/);
assert.match(src('src/assistant/sessionIdentity.ts'), /sessionCompanyName/);
assert.doesNotMatch(src('src/components/assistant/AssistantPanel.tsx'), /JSON\.stringify/);
assert.match(src('src/assistant/useAssistantContext.ts'), /advisortrackAssistantDebug/);

if (isDemoFrontend) {
  assert.match(src('src/lib/portalAccess.ts'), /isPublicDemo && isCustomerExecutive/);
  assert.doesNotMatch(src('src/assistant/useAssistantContext.ts'), /api\.advisortrack/);
} else {
  assert.doesNotMatch(src('src/lib/portalAccess.ts'), /isPublicDemo/);
}

console.log(`Assistant context checks passed (${isDemoFrontend ? 'demo' : 'production'} frontend)`);
