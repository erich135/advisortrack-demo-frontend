/**
 * A8.3 Advisor Contacts frontend checks.
 * Run: npm run test:advisor-contacts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cardsForCurrentRoute } from '../src/assistant/filter';
import { unknownHelpAnswer } from '../src/assistant/cardToAnswer';
import type { AssistantContext } from '../src/assistant/context';
import type { FrontendKnowledgeBundle } from '../src/assistant/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const isDemoFrontend = fs.existsSync(path.join(root, 'src/lib/publicDemo.ts'));
const kb = JSON.parse(src('src/assistant/knowledge-bundle.json')) as FrontendKnowledgeBundle;

const page = src('src/pages/advisor/AdvisorContactsPage.tsx');
const api = src('src/api/advisorApi.ts');
const app = src('src/App.tsx');
const css = src('src/styles/advisor.css');
const placeholder = src('src/pages/advisor/AdvisorCasePlaceholderPage.tsx');

assert.match(app, /path="\/advisor\/contacts"/);
assert.match(app, /path="\/advisor\/contacts\/:contactId"/);
assert.match(app, /AdvisorContactsPage/);
assert.match(app, /path="\/advisor\/cases\/:caseId"/);
assert.doesNotMatch(app, /ADVISOR_COMING_SOON\['\/advisor\/contacts'\]/);
assert.doesNotMatch(app, /path="\/advisors\/contacts"/);
assert.doesNotMatch(page, /\/management\//);

assert.match(api, /\/contacts/);
assert.match(api, /\/contacts\/\$\{encodeURIComponent\(contactId\)\}/);
assert.match(api, /\/contacts\/import/);
assert.match(api, /\/contacts\/\$\{encodeURIComponent\(contactId\)\}\/activate/);
assert.match(api, /\/activities/);
assert.match(api, /\/cases\/contact\//);
assert.match(api, /consentAccepted: true/);
assert.doesNotMatch(api, /userId.*body/);

assert.match(page, /listAdvisorContacts/);
assert.match(page, /createAdvisorContact/);
assert.match(page, /updateAdvisorContact/);
assert.match(page, /ActivityFormModal/);
assert.match(page, /getOrCreateAdvisorContactCase/);
assert.match(page, /importAdvisorContacts/);
assert.match(page, /activateAdvisorContact/);
assert.match(page, /deleteAdvisorContact/);
assert.match(page, /Add Contact/);
assert.match(page, /Add Activity/);
assert.match(page, /Open Case/);
assert.match(page, /Search name or company/);
assert.match(page, /You don&apos;t have any contacts yet/);
assert.match(page, /At least email or phone is required/);
assert.match(page, /A case was opened automatically/);
assert.match(page, /Live Preview/);
assert.match(page, /POPIA/);
assert.match(page, /Practice/);
assert.match(page, /linked activities, cases, and production/);
assert.doesNotMatch(page, /hot lead|qualified|converted/);
assert.doesNotMatch(page, /idNumber|gender|latitude|longitude|interests/);
assert.doesNotMatch(page, /seat_limit|Purchased|Assigned licences/);
assert.doesNotMatch(page, /bulk-delete/);

assert.match(placeholder, /later phase/);
assert.match(placeholder, /getAdvisorCase/);

assert.match(css, /advisor-contacts/);
assert.match(css, /grid-template-columns: minmax\(280px, 360px\)/);
assert.match(css, /@media \(max-width: 767px\)/);
assert.match(css, /advisor-contacts-list.has-selection/);
assert.match(css, /overflow-x: hidden/);

const listCards = cardsForCurrentRoute(
  kb.cards.filter((card) => card.routes.includes('advisor-contacts')),
  'advisor-contacts',
);
const listLabels = listCards.map((card) => card.questionForms[0]);
assert.ok(listLabels.includes('How do I add a contact?'));
assert.ok(listLabels.includes('How do I import contacts?'));
assert.ok(listLabels.includes('What is Live Preview?'));
assert.ok(listLabels.includes('What is POPIA consent?'));

const detailCards = cardsForCurrentRoute(
  kb.cards.filter((card) => card.routes.includes('advisor-contact-detail')),
  'advisor-contact-detail',
);
const detailLabels = detailCards.map((card) => card.questionForms[0]);
assert.ok(detailLabels.includes('How do I edit this contact?'));
assert.ok(detailLabels.includes('How do I create an activity?'));
assert.ok(detailLabels.includes('How do I open a case?'));
assert.ok(detailLabels.includes("What does this contact's status mean?"));

const ctx = (routeId: string, path: string): AssistantContext => ({
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
  route: { routeId, path, tab: null, query: {} },
});

assert.match(
  unknownHelpAnswer(ctx('advisor-contacts', '/advisor/contacts')).body,
  /adding or editing a contact/,
);
assert.match(
  unknownHelpAnswer(ctx('advisor-contact-detail', '/advisor/contacts/abc')).body,
  /POPIA consent, Live Preview/,
);
assert.match(unknownHelpAnswer(ctx('advisor-home', '/advisor')).body, /dashboard, monthly target/);
assert.match(
  unknownHelpAnswer({
    ...ctx('licences', '/licences'),
    workspace: 'management',
    role: {
      reportingRole: 'executive',
      isOrganisationAdmin: true,
      isPlatformStaff: false,
      advisorUsesMobileApp: false,
      hasAnyPortalAccess: true,
      hasLeadershipPortalAccess: true,
      scopeKind: 'company',
    },
  }).body,
  /I don't guess/,
);

console.log(`Advisor Contacts frontend checks passed (${isDemoFrontend ? 'demo' : 'production'})`);
