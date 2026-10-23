/**
 * A8.4 Advisor Activities frontend checks.
 * Run: npm run test:advisor-activities
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cardsForCurrentRoute, liveQuestionsForRoute } from '../src/assistant/filter';
import { unknownHelpAnswer } from '../src/assistant/cardToAnswer';
import type { AssistantContext } from '../src/assistant/context';
import type { FrontendKnowledgeBundle } from '../src/assistant/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const kb = JSON.parse(src('src/assistant/knowledge-bundle.json')) as FrontendKnowledgeBundle;

const page = src('src/pages/advisor/AdvisorActivitiesPage.tsx');
const workflow = src('src/pages/advisor/activityWorkflow.tsx');
const api = src('src/api/advisorApi.ts');
const app = src('src/App.tsx');
const home = src('src/pages/advisor/AdvisorHomePage.tsx');
const contacts = src('src/pages/advisor/AdvisorContactsPage.tsx');
const css = src('src/styles/advisor.css');

assert.match(app, /path="\/advisor\/activities"/);
assert.match(app, /path="\/advisor\/activities\/:activityId"/);
assert.match(app, /AdvisorActivitiesPage/);
assert.doesNotMatch(app, /ADVISOR_COMING_SOON\['\/advisor\/activities'\]/);

assert.match(api, /\/activities\/\$\{encodeURIComponent\(activityId\)\}\/outcome/);
assert.match(api, /action: 'proceed' \| 'lost' \| 'complete'/);
assert.doesNotMatch(api, /userId.*body/);

assert.match(page, /Today/);
assert.match(page, /Upcoming/);
assert.match(page, /Overdue/);
assert.match(page, /Completed/);
assert.match(page, /New Activity/);
assert.match(page, /Complete \/ Record Outcome/);
assert.match(page, /You're clear for today/);
assert.match(page, /Africa\/Johannesburg|johannesburgYmd/);
assert.doesNotMatch(page, /bulk-delete/);
assert.match(workflow, /action === 'lost'/);
assert.match(workflow, /related prospect as inactive and the open case as lost/);
assert.match(workflow, /createAdvisorActivity/);
assert.match(workflow, /updateAdvisorActivity/);
assert.match(contacts, /ActivityFormModal/);
assert.match(home, /\/advisor\/activities\/\$\{event\.id\}/);
assert.match(css, /advisor-activities/);
assert.match(css, /advisor-activity-tabs/);
assert.match(css, /advisor-activities-list.has-selection/);

const listCards = cardsForCurrentRoute(
  kb.cards.filter((card) => card.routes.includes('advisor-activities')),
  'advisor-activities',
);
const labels = listCards.map((card) => card.questionForms[0]);
assert.ok(labels.includes('How do I add an activity?'));
assert.ok(labels.includes('What does Proceed do?'));
assert.ok(labels.includes('What happens if I choose Lost?'));
assert.ok(labels.includes('How do I reschedule an activity?'));
assert.deepEqual(liveQuestionsForRoute('advisor-activities'), [
  'What follow-ups do I have today?',
  'What calls do I have today?',
  'Do I have anything overdue?',
  'I finished this meeting, what now?',
]);

const context = {
  environment: 'production',
  workspace: 'advisor',
  identity: { userId: 'fa-1', companyId: 'c1', companyName: 'Northstar' },
  role: {
    reportingRole: 'financial_advisor',
    isOrganisationAdmin: false,
    isPlatformStaff: false,
    advisorUsesMobileApp: true,
    hasAnyPortalAccess: true,
    hasLeadershipPortalAccess: false,
    scopeKind: 'self',
  },
  capabilities: { canViewAdvisorWorkspace: true },
  route: { routeId: 'advisor-activities', path: '/advisor/activities', tab: null, query: {} },
} as AssistantContext;
assert.match(unknownHelpAnswer(context).body, /recording an outcome/);

console.log('A8.4 advisor activities frontend checks passed');
