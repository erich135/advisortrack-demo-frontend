/**
 * A8.5 Advisor Pipeline / Case frontend checks.
 * Run: npm run test:advisor-pipeline
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

const app = src('src/App.tsx');
const api = src('src/api/advisorApi.ts');
const pipeline = src('src/pages/advisor/AdvisorPipelinePage.tsx');
const casePage = src('src/pages/advisor/AdvisorCasePage.tsx');
const workflow = src('src/pages/advisor/caseWorkflow.tsx');
const contacts = src('src/pages/advisor/AdvisorContactsPage.tsx');
const css = src('src/styles/advisor.css');
const layout = src('src/components/AdvisorLayout.tsx');

assert.match(app, /path="\/advisor\/pipeline"/);
assert.match(app, /path="\/advisor\/cases\/:caseId"/);
assert.match(app, /AdvisorPipelinePage/);
assert.match(app, /AdvisorCasePage/);
assert.doesNotMatch(app, /ADVISOR_COMING_SOON\['\/advisor\/pipeline'\]/);
assert.doesNotMatch(app, /team-pipeline.*AdvisorPipelinePage/);

assert.match(api, /listAdvisorCases/);
assert.match(api, /updateAdvisorCase/);
assert.match(api, /scheduleAdvisorCaseReview/);
assert.match(api, /duplicateAdvisorCase/);
assert.match(api, /submitToProduction/);
assert.doesNotMatch(api, /deleteAdvisorCase/);

assert.match(pipeline, /My Pipeline/);
assert.match(pipeline, /advisor-pipeline-board/);
assert.match(pipeline, /getPipelineStageLabel/);
assert.match(casePage, /Move to stage/);
assert.match(casePage, /Mark sent/);
assert.match(casePage, /Mark received/);
assert.match(casePage, /FACT_FIND_LABELS/);
assert.match(workflow, /Simple goal/);
assert.match(workflow, /Full FNA/);
assert.match(casePage, /Submit to Production/);
assert.match(casePage, /Schedule review/);
assert.match(casePage, /Duplicate case/);
assert.doesNotMatch(casePage, /Delete Case|type="file"/);
assert.match(contacts, /Open Case uses the existing case/);
assert.match(css, /advisor-pipeline-board/);
assert.match(css, /max-width: 1099px/);
assert.match(layout, /pathname.startsWith\('\/advisor\/cases\/'\)/);

assert.deepEqual(liveQuestionsForRoute('advisor-pipeline'), [
  'How many open cases do I have?',
  'What are the six stages?',
  'What is FICA?',
  'How do I submit to Production?',
  'Which stage has most of my cases?',
  'What needs my attention?',
]);
assert.deepEqual(liveQuestionsForRoute('advisor-case-detail'), [
  'What do I do next?',
  'Why can\'t I submit this?',
  'Do I have to finish FICA first?',
  'How do I submit this case to Production?',
]);

const labels = cardsForCurrentRoute(
  kb.cards.filter((card) => card.routes.includes('advisor-pipeline')),
  'advisor-pipeline',
).map((card) => card.questionForms[0]);
assert.ok(labels.includes('What is my pipeline?') || labels.includes('What are the six pipeline stages?'));

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
  route: { routeId: 'advisor-pipeline', path: '/advisor/pipeline', tab: null, query: {} },
} as AssistantContext;
assert.match(unknownHelpAnswer(context).body, /FICA, documents/);

console.log('A8.5 advisor pipeline frontend checks passed');
