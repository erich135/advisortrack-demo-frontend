/**
 * A8.2 Advisor Home and Forgot Password frontend checks.
 * Run: npm run test:advisor-home
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cardsForCurrentRoute } from '../src/assistant/filter';
import { unknownHelpAnswer } from '../src/assistant/cardToAnswer';
import type { FrontendKnowledgeBundle } from '../src/assistant/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const isDemoFrontend = fs.existsSync(path.join(root, 'src/lib/publicDemo.ts'));
const kb = JSON.parse(src('src/assistant/knowledge-bundle.json')) as FrontendKnowledgeBundle;

const home = src('src/pages/advisor/AdvisorHomePage.tsx');
assert.match(home, /getAdvisorDashboard/);
assert.match(home, /getAdvisorPlanningTargets/);
assert.match(home, /Monthly Progress/);
assert.match(home, /Weekly Activity/);
assert.match(home, /Upcoming activities/);
assert.match(home, /Fact-finding|getPipelineStageLabel/);
assert.match(home, /advisor-home-loading/);
assert.match(home, /advisor-home-error/);
assert.match(home, /advisor-home-locked/);
assert.match(home, /No monthly nett goal/);
assert.doesNotMatch(home, /management\/pipeline|getManagement/);
assert.match(src('src/api/advisorApi.ts'), /COALESCE\(due_date, created_at\)/);

const forgot = src('src/pages/ForgotPasswordPage.tsx');
assert.match(forgot, /\/auth\/forgot-password|forgotPassword/);
assert.match(forgot, /maxLength=\{6\}/);
assert.match(forgot, /Resend code/);
assert.match(forgot, /Password updated/);
assert.doesNotMatch(forgot, /reset link|magic link/i);

const login = src('src/pages/LoginPage.tsx');
assert.match(login, /Forgot password\?/);
if (isDemoFrontend) {
  assert.match(src('src/pages/DemoEntryPage.tsx'), /financial_advisor/);
}

const pageCards = cardsForCurrentRoute(
  kb.cards.filter((card) => card.routes.includes('advisor-home')),
  'advisor-home',
);
assert.ok(pageCards.some((card) => card.id === 'HOME.DASHBOARD'));
assert.match(
  unknownHelpAnswer({
    environment: isDemoFrontend ? 'demo' : 'production',
    workspace: 'advisor',
    identity: { userId: 'fa-1', companyId: 'c1', companyName: 'Northstar' },
    role: {
      reportingRole: 'financial_advisor',
      isOrganisationAdmin: false,
      isPlatformStaff: false,
      advisorUsesMobileApp: false,
      hasAnyPortalAccess: false,
      hasLeadershipPortalAccess: false,
      scopeKind: 'self',
    },
    capabilities: { canViewAdvisorWorkspace: true },
    route: { routeId: 'advisor-home', path: '/advisor', tab: null, query: {} },
  }).body,
  /dashboard, monthly target/,
);

console.log(`Advisor Home frontend checks passed (${isDemoFrontend ? 'demo' : 'production'})`);
