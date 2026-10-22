/**
 * A8.6 Advisor Production frontend checks.
 * Run: npm run test:advisor-production
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
const page = src('src/pages/advisor/AdvisorProductionPage.tsx');
const workflow = src('src/pages/advisor/productionWorkflow.tsx');
const css = src('src/styles/advisor.css');
const management = src('src/pages/ProductionPage.tsx');

assert.match(app, /path="\/advisor\/production"/);
assert.match(app, /AdvisorProductionPage/);
assert.doesNotMatch(app, /ADVISOR_COMING_SOON\['\/advisor\/production'\]/);
assert.match(app, /path="\/production"/);
assert.match(app, /<ProductionPage \/>/);

assert.match(api, /listAdvisorProduction/);
assert.match(api, /createAdvisorProduction/);
assert.match(api, /updateAdvisorProduction/);
assert.match(api, /deleteAdvisorProduction/);
assert.match(api, /\/production/);

assert.match(page, /My Production/);
assert.match(page, /Capture Production/);
assert.match(page, /advisor-production-month/);
assert.match(page, /Issued flag only/);
assert.match(page, /This permanently removes the production record/);
assert.match(page, /No production captured for/);
assert.match(workflow, /APPLICATION_STATUS_LABELS/);
assert.match(workflow, /accepted_issued: 'Accepted \/ Issued'/);
assert.match(workflow, /Africa\/Johannesburg/);
assert.doesNotMatch(workflow, /userId|advisorId|companyId/);
assert.match(css, /advisor-production-split/);
assert.match(css, /max-width: 1099px/);
assert.match(management, /function ProductionPage|export default function ProductionPage/);

assert.deepEqual(liveQuestionsForRoute('advisor-production'), [
  'How much have I issued this month?',
  'How many applications are pending underwriting?',
  'What does Accepted / Issued mean?',
  'How do I capture production?',
  'Why do my Home and Production totals differ?',
]);

const labels = cardsForCurrentRoute(
  kb.cards.filter((card) => card.routes.includes('advisor-production')),
  'advisor-production',
).map((card) => card.questionForms[0]);
assert.ok(labels.includes('What is Production?') || labels.includes('How do I capture production?'));

const context = {
  environment: 'production',
  workspace: 'advisor',
  route: { routeId: 'advisor-production', path: '/advisor/production', label: 'My Production' },
} as AssistantContext;
assert.match(unknownHelpAnswer(context).body, /capturing production/);
assert.match(unknownHelpAnswer(context).body, /issued production/);

console.log('A8.6 advisor production frontend checks passed');
