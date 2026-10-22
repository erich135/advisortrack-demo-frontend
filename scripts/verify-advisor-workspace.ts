/**
 * A8.1 Advisor Workspace foundation.
 * Run: npm run test:advisor-workspace
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuthSession } from '../src/lib/useAuth';
import {
  canUseAdvisorWorkspace,
  eligibleWorkspaces,
  isAdvisorWorkspacePath,
  shouldShowWorkspaceSwitcher,
  workspaceFromPath,
} from '../src/lib/workspace';
import { capabilitiesFromSession } from '../src/assistant/capabilities';
import { buildAssistantContext } from '../src/assistant/context';
import { trustedIdentityFromSession } from '../src/assistant/sessionIdentity';
import { buildCustomerNav } from '../src/lib/portalNavigation';
import type { FrontendKnowledgeBundle } from '../src/assistant/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const isDemoFrontend = fs.existsSync(path.join(root, 'src/lib/publicDemo.ts'));

const kb = JSON.parse(
  fs.readFileSync(path.join(root, 'src/assistant/knowledge-bundle.json'), 'utf8'),
) as FrontendKnowledgeBundle;

function session(partial: {
  rank?: 'executive' | 'regional_manager' | 'team_leader' | 'financial_advisor' | 'platform_admin';
  portalAccess?: boolean;
  isOrganisationAdmin?: boolean;
  isPlatformAdmin?: boolean;
}): AuthSession {
  const rank = partial.rank ?? 'executive';
  return {
    user: {
      id: 'user-1',
      email: 'alex@northstar.test',
      firstName: 'Alex',
      lastName: 'Reed',
      company: 'ignore',
    },
    subscription: null,
    organisation: { id: 'company-northstar', name: 'Northstar Advisory' },
    company: { id: 'company-northstar', name: 'Northstar Advisory' },
    role: { id: 'role-1', name: rank },
    permissions: [],
    reportsToUserId: null,
    isPlatformAdmin: Boolean(partial.isPlatformAdmin),
    isOrganisationAdmin: Boolean(partial.isOrganisationAdmin),
    canAccessEngineeringChangelog: false,
    hierarchy: {
      rank,
      label: rank,
      comparisonRank: null,
      comparisonRoleLabel: null,
      portalAccess: partial.portalAccess ?? rank !== 'financial_advisor',
      scopeKind: rank === 'executive' ? 'organisation' : rank === 'regional_manager' ? 'region' : rank === 'team_leader' ? 'team' : null,
      structureAccess: {
        canViewRegions: false,
        canManageRegions: false,
        canViewTeams: false,
        canManageTeams: false,
      },
    },
  } as AuthSession;
}

const fa = session({ rank: 'financial_advisor', portalAccess: false });
const faAdmin = session({ rank: 'financial_advisor', portalAccess: false, isOrganisationAdmin: true });
const exec = session({ rank: 'executive' });
const platform = session({ rank: 'executive', isPlatformAdmin: true });

assert.equal(canUseAdvisorWorkspace(fa), true);
assert.equal(canUseAdvisorWorkspace(faAdmin), true);
assert.equal(canUseAdvisorWorkspace(exec), false);
assert.equal(canUseAdvisorWorkspace(platform), false);
assert.deepEqual(eligibleWorkspaces(fa), ['advisor']);
assert.deepEqual(eligibleWorkspaces(faAdmin), ['advisor', 'organisation']);
assert.equal(eligibleWorkspaces(exec).includes('advisor'), false);
assert.equal(shouldShowWorkspaceSwitcher(fa), false);
assert.equal(shouldShowWorkspaceSwitcher(faAdmin), true);
assert.equal(workspaceFromPath('/advisor', 'production'), 'advisor');
assert.equal(workspaceFromPath('/advisor/contacts', 'production'), 'advisor');
assert.equal(workspaceFromPath('/users', 'production'), 'organisation');
assert.equal(workspaceFromPath('/', 'production'), 'management');
assert.equal(isAdvisorWorkspacePath('/advisor/pipeline'), true);

const faNav = buildCustomerNav(fa, isDemoFrontend ? 'demo' : 'production');
assert.equal(
  faNav.some((section) => section.items.some((item) => item.to === '/team-pipeline')),
  false,
);
assert.equal(
  faNav.some((section) => section.items.some((item) => item.to === '/advisors')),
  false,
);
assert.equal(
  faNav.some((section) => section.items.some((item) => item.to === '/production')),
  false,
);

const faAdminNav = buildCustomerNav(faAdmin, isDemoFrontend ? 'demo' : 'production');
assert.equal(
  faAdminNav.some((section) => section.items.some((item) => item.to === '/team-pipeline')),
  false,
  'FA+OrgAdmin does not gain leadership nav',
);
assert.ok(faAdminNav.some((section) => section.items.some((item) => item.to === '/users')));

const faWorkspace = buildAssistantContext({
  environment: isDemoFrontend ? 'demo' : 'production',
  identity: trustedIdentityFromSession(fa),
  navigation: { pathname: '/advisor' },
  capabilities: capabilitiesFromSession(fa, isDemoFrontend ? 'demo' : 'production'),
  routes: kb.routes,
});
assert.equal(faWorkspace.workspace, 'advisor');
assert.equal(faWorkspace.role.scopeKind, 'self');
assert.equal(faWorkspace.role.advisorUsesMobileApp, false);
assert.equal(faWorkspace.route.routeId, 'advisor-home');
assert.equal(faWorkspace.capabilities.canViewAdvisorWorkspace, true);
assert.equal(faWorkspace.capabilities.canViewPipeline, false);
assert.equal(faWorkspace.capabilities.canViewAdvisors, false);
assert.equal(faWorkspace.capabilities.canViewProduction, false);

const spoof = buildAssistantContext({
  environment: isDemoFrontend ? 'demo' : 'production',
  identity: trustedIdentityFromSession(fa),
  navigation: { pathname: '/advisors' },
  capabilities: capabilitiesFromSession(fa, isDemoFrontend ? 'demo' : 'production'),
  routes: kb.routes,
});
assert.equal(spoof.role.scopeKind, 'self', 'changing URL does not change scope');
assert.equal(spoof.capabilities.canViewAdvisors, false);

const app = src('src/App.tsx');
assert.match(app, /AdvisorHomePage/);
assert.doesNotMatch(app, /ADVISOR_COMING_SOON\['\/advisor'\]/);
assert.match(src('src/pages/advisor/AdvisorHomePage.tsx'), /getAdvisorDashboard/);
assert.match(src('src/pages/advisor/AdvisorHomePage.tsx'), /getAdvisorPlanningTargets/);
assert.match(src('src/pages/LoginPage.tsx'), /Forgot password\?/);
assert.match(src('src/pages/ForgotPasswordPage.tsx'), /forgot-password/);
assert.match(src('src/api/authApi.ts'), /\/auth\/forgot-password/);
assert.match(src('src/api/authApi.ts'), /\/auth\/reset-password/);
assert.match(src('src/styles/advisor.css'), /advisor-home-grid/);
for (const route of [
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
]) {
  assert.match(app, new RegExp(`path="${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`));
}
assert.match(app, /RequireAdvisorWorkspace/);
assert.match(app, /PostLoginRedirect/);
assert.match(app, /Navigate to="\/advisor"/);
assert.match(app, /RequireLeadership/);
assert.match(app, /path="\/advisors"/);
assert.match(app, /path="\/team-pipeline"/);
assert.match(app, /path="\/production"/);

const layout = src('src/components/AdvisorLayout.tsx');
assert.match(layout, /advisor-shell/);
assert.doesNotMatch(layout, /className="app-shell"/);
assert.doesNotMatch(layout, /className="sidebar"/);
assert.match(layout, /Home/);
assert.match(layout, /Contacts/);
assert.match(layout, /Activities/);
assert.match(layout, /Pipeline/);
assert.match(layout, /Production/);
assert.match(layout, /More/);
assert.match(layout, /Planning & Targets/);
assert.match(layout, /AssistantShell/);
assert.doesNotMatch(layout, /permanent FAB|floating action/i);

const css = src('src/styles/advisor.css');
assert.match(css, /@media \(max-width: 1099px\)/);
assert.match(css, /@media \(max-width: 767px\)/);
assert.match(css, /advisor-bottom-nav/);
assert.match(css, /overflow-x:\s*hidden/);
assert.match(css, /grid-template-columns: var\(--advisor-rail-wide\)/);

const api = src('src/api/apiClient.ts');
assert.match(api, /X-AdvisorTrack-Client/);
assert.match(api, /web/);

if (isDemoFrontend) {
  const entry = src('src/pages/DemoEntryPage.tsx');
  assert.match(entry, /financial_advisor/);
  assert.match(layout, /Viewing as/);
  assert.match(layout, /Reset Demo/);
} else {
  assert.doesNotMatch(layout, /Viewing as/);
  assert.doesNotMatch(layout, /Reset Demo/);
}

console.log('Advisor Workspace foundation checks passed');
