/**
 * A8.7 Advisor Planning / Profile / Settings / Setup / Subscription frontend checks.
 * Run: npm run test:advisor-planning
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { liveQuestionsForRoute } from '../src/assistant/filter';
import { unknownHelpAnswer } from '../src/assistant/cardToAnswer';
import type { AssistantContext } from '../src/assistant/context';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

const app = src('src/App.tsx');
const api = src('src/api/advisorApi.ts');
assert.match(app, /AdvisorPlanningPage/);
assert.match(app, /AdvisorProfilePage/);
assert.match(app, /AdvisorSettingsPage/);
assert.match(app, /AdvisorSetupPage/);
assert.match(app, /AdvisorSubscriptionPage/);
assert.match(app, /AdvisorSetupGate/);
assert.doesNotMatch(app, /ADVISOR_COMING_SOON\['\/advisor\/planning'\]/);
assert.match(api, /getAdvisorPlanningSettings/);
assert.match(api, /updateAdvisorFinancial/);
assert.match(api, /completeAdvisorSetup/);
assert.match(api, /listAdvisorSubscriptionPackages/);
assert.match(api, /workingWeeksPerYear/);
assert.doesNotMatch(api, /checkout|stripe|payfast/i);

assert.match(src('src/pages/advisor/AdvisorPlanningPage.tsx'), /Home issued definition/);
assert.match(src('src/pages/advisor/configWorkflow.tsx'), /Fact-finding/);
assert.match(src('src/pages/advisor/AdvisorProfilePage.tsx'), /Financial settings/);
assert.match(src('src/pages/advisor/AdvisorSettingsPage.tsx'), /Conversion ratios/);
assert.match(src('src/pages/advisor/AdvisorSetupPage.tsx'), /termsAccepted: true/);
assert.match(src('src/pages/advisor/AdvisorSubscriptionPage.tsx'), /AdvisorTrack mobile app/);
assert.doesNotMatch(src('src/pages/advisor/AdvisorSubscriptionPage.tsx'), /seat_limit|enterprise contract/i);
assert.match(src('src/pages/advisor/AdvisorSetupGate.tsx'), /needsSetup/);
assert.match(src('src/styles/advisor.css'), /advisor-config-card/);

assert.deepEqual(liveQuestionsForRoute('advisor-planning'), [
  'How far am I from my target?',
  'How do I change my monthly target?',
  'How do weekly targets work?',
  'What are conversion ratios?',
]);
assert.deepEqual(liveQuestionsForRoute('advisor-subscription'), [
  'What plan am I on?',
  'What is Live Preview?',
  'Why is this feature locked?',
  'How do I upgrade?',
]);

const planningContext = {
  environment: 'production',
  workspace: 'advisor',
  route: { routeId: 'advisor-planning', path: '/advisor/planning', label: 'Planning & Targets' },
} as AssistantContext;
assert.match(unknownHelpAnswer(planningContext).body, /monthly target/);

console.log('A8.7 advisor planning frontend checks passed');
