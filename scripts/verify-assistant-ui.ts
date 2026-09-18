/**
 * AdvisorTrack Assistant A3 UI shell.
 * Run: npm run test:assistant-ui
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { answerFromCard } from '../src/assistant/cardToAnswer';
import { cardsForTopic, filterCards, filterHomeTopics } from '../src/assistant/filter';
import type { FrontendKnowledgeBundle } from '../src/assistant/types';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');
const isDemoFrontend = fs.existsSync(path.join(root, 'src/lib/publicDemo.ts'));

const layout = src('src/components/Layout.tsx');
const shell = src('src/components/assistant/AssistantShell.tsx');
const panel = src('src/components/assistant/AssistantPanel.tsx');
const answerView = src('src/components/assistant/AssistantAnswerView.tsx');
const loader = src('src/assistant/loadBundle.ts');
const css = src('src/styles/global.css');
const iconComponent = src('src/components/assistant/AssistantIcon.tsx');
const iconPath = path.join(root, 'public/brand/advisortrack-assistant.png');
const icon = fs.readFileSync(iconPath);
const kb = JSON.parse(
  fs.readFileSync(path.join(root, 'src/assistant/knowledge-bundle.json'), 'utf8'),
) as FrontendKnowledgeBundle;
assert.match(shell, /Ask AdvisorTrack/);
assert.match(shell, /aria-label="Ask AdvisorTrack"/);
assert.match(shell, /data-testid="assistant-launcher"/);
assert.match(shell, /aria-expanded=\{open\}/);
assert.match(shell, /hidden=\{open\}/);
assert.match(shell, /hidden=\{!open\}/);
assert.match(shell, /aria-hidden=\{!open\}/);
assert.match(shell, /lazy\(\(\) => import\('\.\/AssistantPanel'\)\)/);
assert.match(panel, /id="assistant-panel"/);
assert.match(panel, /data-testid="assistant-panel"/);
assert.match(panel, /data-testid="assistant-close"/);
assert.match(panel, /Ask AdvisorTrack anything\.\.\./);
assert.match(panel, /Popular topics/);
assert.match(shell, /Escape/);
assert.match(panel, /Escape/);
assert.match(answerView, /useNavigate/);
assert.match(answerView, /onNavigate/);
assert.doesNotMatch(answerView, /window\.location/);
assert.doesNotMatch(panel, /window\.location/);
assert.match(css, /--assistant-fab-size:\s*60px/);
assert.match(css, /z-index:\s*30/);
assert.match(css, /\.modal-overlay[\s\S]*z-index:\s*40/);
assert.match(css, /\.toast-stack[\s\S]*z-index:\s*60/);
assert.match(css, /@media \(max-width: 720px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(iconComponent, /advisortrack-assistant\.png/);
assert.match(shell, /size=\{60\}/);
assert.match(css, /\.assistant-launcher \{[^}]*background:\s*transparent/);
assert.doesNotMatch(css, /\.assistant-launcher \{[^}]*background:\s*var\(--color-navy\)/);
assert.equal(icon.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), true);
assert.ok(icon.length > 100_000, 'approved assistant PNG is a high-resolution raster');
assert.equal(fs.existsSync(path.join(root, 'public/brand/assistant-robot.svg')), false);

assert.equal(kb.cards.some((card) => card.audience === 'staff' || card.id.startsWith('STAFF.')), false, 'shipped bundle has no staff cards');
assert.equal(
  kb.routes.some((route) => (isDemoFrontend ? route.classificationDemo : route.classificationProduction) === 'internal'),
  false,
  'shipped bundle has no internal routes for this portal',
);

const productionCustomer = filterCards(kb, { environment: 'production', audience: 'customer' });
const demoCustomer = filterCards(kb, { environment: 'demo', audience: 'customer' });
const productionStaff = filterCards(kb, { environment: 'production', audience: 'staff' });

assert.equal(
  productionCustomer.some((card) => card.id.startsWith('STAFF.')),
  false,
  'production customers do not see staff cards',
);
assert.equal(
  demoCustomer.some((card) => card.id.startsWith('STAFF.')),
  false,
  'demo customers do not see staff cards',
);
assert.equal(productionStaff.some((card) => card.id.startsWith('STAFF.')), false, 'API-down staff fallback cannot read staff cards from the customer bundle');

const productionTopics = filterHomeTopics(kb.homeTopics, 'production');
const demoTopics = filterHomeTopics(kb.homeTopics, 'demo');
assert.equal(productionTopics.some((topic) => topic.id === 'demo-tips'), false);
if (isDemoFrontend) {
  assert.ok(demoTopics.some((topic) => topic.id === 'demo-tips'));
} else {
  assert.equal(kb.homeTopics.some((topic) => topic.id === 'demo-tips'), false);
}
assert.deepEqual(
  productionTopics.map((topic) => topic.label),
  [
    'People & Access',
    'Licences & Capacity',
    'Bulk Import',
    'Organisation Structure',
    'Reporting & Performance',
    'Commercial',
    'Troubleshooting',
    'Getting Started',
  ],
);

const people = kb.homeTopics.find((topic) => topic.id === 'people-access');
assert.ok(people);
const peopleCards = cardsForTopic(productionCustomer, people);
assert.ok(peopleCards.some((card) => card.id === 'PEOPLE.ADD_USER'));
assert.ok(peopleCards.some((card) => card.id === 'PEOPLE.ORGANISATION_ADMIN'));

const licences = kb.homeTopics.find((topic) => topic.id === 'licences-capacity');
assert.ok(licences);
const licenceCard = cardsForTopic(productionCustomer, licences).find((card) => card.id === 'LIC.ASSIGN');
assert.ok(licenceCard);
const answer = answerFromCard(kb, licenceCard, 'production');
assert.equal(answer.headline, licenceCard.title);
assert.equal(answer.body, licenceCard.summary);
assert.ok((answer.steps?.length ?? 0) > 0);
assert.ok(answer.actions?.some((action) => action.path === '/licences'));
assert.equal(answer.actions?.every((action) => action.type === 'navigate'), true);

assert.match(panel, /askAdvisorTrackAssistant/);
assert.match(panel, /answerFromQuestion/);
assert.match(panel, /answerFromCard/);
assert.match(panel, /onSelectDisambiguation/);
assert.match(panel, /loadAssistantBundle/);
assert.match(panel, /useAssistantContext/);
assert.doesNotMatch(panel, /pendingNaturalLanguageAnswer/);
assert.doesNotMatch(panel, /JSON\.stringify/);
assert.doesNotMatch(panel, /assistant-debug-dump/);
assert.match(loader, /import\('\.\/knowledge-bundle\.json'\)/);
assert.doesNotMatch(loader, /api\.advisortrack|\/assistant\/ask/i);
assert.doesNotMatch(panel, /openai|anthropic|pinecone/i);
assert.doesNotMatch(panel, /companyId|reportingRank|isPlatformStaff/);
assert.doesNotMatch(src('src/assistant/retrieve.ts'), /openai|anthropic|pinecone/i);
assert.match(answerView, /assistant-disambiguation/);

assert.match(panel, /shouldAutoScroll/);
assert.match(panel, /pinTranscriptToLatest/);
assert.match(panel, /scrollTranscriptToLatest/);
assert.match(panel, /transcriptEndRef/);
assert.match(panel, /data-testid="assistant-transcript-scroller"/);
assert.match(panel, /data-testid="assistant-transcript-end"/);
assert.match(panel, /onScroll=\{onTranscriptScroll\}/);
assert.match(panel, /scroller\.scrollTop = scroller\.scrollHeight/);
assert.match(panel, /preventScroll:\s*true/);
assert.match(shell, /preventScroll:\s*true/);
assert.match(panel, /submitQuestion/);
assert.match(panel, /assistant-asking/);
assert.doesNotMatch(panel, /window\.scrollTo/);
assert.doesNotMatch(shell, /window\.scrollTo/);
assert.doesNotMatch(panel, /scrollIntoView/);
assert.doesNotMatch(shell, /scrollIntoView/);
assert.doesNotMatch(panel, /scrollTop\s*=\s*0/);
assert.doesNotMatch(css, /html::-webkit-scrollbar/);
assert.doesNotMatch(css, /\*::-webkit-scrollbar/);
assert.match(css, /\.sidebar nav::-webkit-scrollbar \{/);
assert.match(css, /\.sidebar nav::-webkit-scrollbar-thumb \{/);
assert.match(css, /\.sidebar nav::-webkit-scrollbar-track \{/);
assert.match(css, /\.sidebar nav \{[^}]*scrollbar-width:\s*thin/);
assert.match(css, /\.sidebar nav \{[^}]*scrollbar-color:/);
assert.match(css, /\.assistant-panel-body::-webkit-scrollbar \{/);
assert.match(css, /\.assistant-panel-body::-webkit-scrollbar-thumb \{/);
assert.match(css, /\.assistant-panel-body::-webkit-scrollbar-track \{/);
assert.match(css, /\.assistant-panel-body \{[^}]*scrollbar-width:\s*thin/);
assert.match(css, /\.assistant-panel-body \{[^}]*scrollbar-color:/);
assert.match(css, /@supports not selector\(::-webkit-scrollbar\)/);

if (isDemoFrontend) {
  assert.match(layout, /environment=\{isPublicDemo \? 'demo' : 'production'\}/);
} else {
  assert.match(layout, /environment="production"/);
  assert.doesNotMatch(layout, /isPublicDemo/);
}

console.log(
  `Assistant UI checks passed (${kb.cards.length} cards, ${productionCustomer.length} production customer, ${demoCustomer.length} demo customer)`,
);
