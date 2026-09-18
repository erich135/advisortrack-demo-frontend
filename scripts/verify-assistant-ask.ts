/**
 * AdvisorTrack Assistant A6 frontend wiring.
 * Run: npm run test:assistant-ask
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const isDemoFrontend = fs.existsSync(path.join(root, 'src/lib/publicDemo.ts'));

const api = src('src/api/assistantApi.ts');
const panel = src('src/components/assistant/AssistantPanel.tsx');
const answerView = src('src/components/assistant/AssistantAnswerView.tsx');
const client = src('src/api/apiClient.ts');

assert.match(api, /\/assistant\/ask/);
assert.match(api, /askAdvisorTrackAssistant/);
assert.match(api, /question: input\.question/);
assert.match(api, /pathname: input\.pathname/);
assert.match(api, /search: input\.search/);
assert.doesNotMatch(api, /body:[\s\S]*(companyId|reportingRank|isOrganisationAdmin|isPlatformStaff)/);
assert.doesNotMatch(api, /ASSISTANT_MODEL_API_KEY|openai|anthropic|xai/i);
assert.match(panel, /askAdvisorTrackAssistant/);
assert.match(panel, /answerFromQuestion/);
assert.match(panel, /answerFromCard/);
assert.match(panel, /pathname: location\.pathname/);
assert.doesNotMatch(panel, /origin/);
assert.doesNotMatch(panel, /openai|anthropic|Grok|Claude/i);
assert.doesNotMatch(panel, /detectConversationIntent|conversation\.greeting/);
assert.equal(fs.existsSync(path.join(root, 'src/assistant/conversation.ts')), false);
assert.equal(fs.existsSync(path.join(root, 'src/assistant/live')), false);
assert.doesNotMatch(src('src/assistant/retrieve.ts'), /Hi! I'm doing well/);
assert.match(answerView, /assistant-disambiguation/);
assert.match(answerView, /clarifyingQuestion/);
assert.match(answerView, /assistant-answer-steps/);

if (isDemoFrontend) {
  assert.match(client, /Demo frontend must never call the production backend/);
  assert.doesNotMatch(api, /api\.advisortrack\.co\.za/);
} else {
  assert.doesNotMatch(api, /demo\.advisortrack/);
}

console.log(`Assistant ask UI checks passed (${isDemoFrontend ? 'demo' : 'production'} portal)`);
