/**
 * AdvisorTrack Assistant A5 Option A — deterministic retrieval.
 * Run: npm run test:assistant-retrieve
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capabilitiesFromSession } from '../src/assistant/capabilities';
import { answerFromQuestion } from '../src/assistant/cardToAnswer';
import { buildAssistantContext, withLicenceFacts } from '../src/assistant/context';
import { filterCardsForContext } from '../src/assistant/filter';
import { trustedIdentityFromSession } from '../src/assistant/sessionIdentity';
import type { FrontendKnowledgeBundle } from '../src/assistant/types';
import type { AuthSession } from '../src/lib/useAuth';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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

function ask(
  current: AuthSession,
  environment: 'production' | 'demo',
  question: string,
  pathname = '/',
) {
  const context = buildAssistantContext({
    environment,
    identity: trustedIdentityFromSession(current),
    navigation: { pathname },
    capabilities: capabilitiesFromSession(current, environment),
    routes: kb.routes,
  });
  const allowedCards = filterCardsForContext(kb, context);
  return {
    context,
    allowedCards,
    answer: answerFromQuestion(kb, allowedCards, question, context),
  };
}

const assign = ask(orgAdminExec, 'production', 'How do I assign a licence?');
assert.equal(assign.answer.mode, 'allowed');
assert.equal(assign.answer.intent, 'LIC.ASSIGN');
assert.equal(assign.answer.body, kb.cards.find((card) => card.id === 'LIC.ASSIGN')?.summary);
assert.ok((assign.answer.steps?.length ?? 0) > 0);

const licenseSpelling = ask(orgAdminExec, 'production', 'How do I assign a license?');
assert.equal(licenseSpelling.answer.intent, 'LIC.ASSIGN');

const hired = ask(orgAdminExec, 'production', 'I hired 50 new advisors');
assert.equal(hired.answer.intent, 'LIC.REQUEST_MORE');
assert.equal(hired.answer.mode, 'allowed');

const invoices = ask(orgAdminExec, 'production', 'Where do I find invoices?');
assert.equal(invoices.answer.intent, 'COMM.INVOICES');

const withFacts = withLicenceFacts(assign.context, { purchased: 80, assigned: 12, available: 68 });
const factAnswer = answerFromQuestion(kb, assign.allowedCards, 'How do I assign a licence?', withFacts);
assert.ok(factAnswer.facts?.some((fact) => fact.label === 'Available' && fact.value === '68'));

const licenceWord = ask(orgAdminExec, 'production', 'licence', '/licences');
assert.equal(licenceWord.answer.mode, 'disambiguate');
assert.ok((licenceWord.answer.disambiguation?.length ?? 0) >= 2);
assert.ok((licenceWord.answer.disambiguation?.length ?? 0) <= 4);
assert.equal(
  licenceWord.answer.disambiguation?.every((item) =>
    licenceWord.allowedCards.some((card) => card.id === item.cardId),
  ),
  true,
);

const unknown = ask(orgAdminExec, 'production', 'how do quantum bananas invoice the moon');
assert.equal(unknown.answer.mode, 'unknown');
assert.match(unknown.answer.body, /I don't guess/);
assert.equal(unknown.answer.sources.length, 0);

const productionReset = ask(orgAdminExec, 'production', 'How do I reset the demo?');
assert.notEqual(productionReset.answer.intent, 'DEMO.RESET');
assert.equal(
  productionReset.answer.disambiguation?.some((item) => item.cardId === 'DEMO.RESET') ?? false,
  false,
);

const demoReset = ask(executive, 'demo', 'How do I reset the demo?');
if (isDemoFrontend) {
  assert.equal(demoReset.answer.intent, 'DEMO.RESET');
  assert.equal(demoReset.answer.mode, 'allowed');
} else {
  assert.notEqual(demoReset.answer.intent, 'DEMO.RESET');
}

const customerEcl = ask(orgAdminExec, 'production', 'Where is the Engineering Change Log?');
assert.notEqual(customerEcl.answer.intent, 'STAFF.ENGINEERING_CHANGE_LOG');
assert.equal(
  customerEcl.allowedCards.some((card) => card.id.startsWith('STAFF.')),
  false,
);
assert.equal(
  customerEcl.answer.disambiguation?.some((item) => item.cardId.startsWith('STAFF.')) ?? false,
  false,
);

const staffEcl = ask(staff, 'production', 'Where is the Engineering Change Log?');
assert.notEqual(staffEcl.answer.intent, 'STAFF.ENGINEERING_CHANGE_LOG');
assert.equal(staffEcl.allowedCards.some((card) => card.id.startsWith('STAFF.')), false);

const faAssign = ask(advisor, 'production', 'How do I assign a licence?');
assert.notEqual(faAssign.answer.intent, 'LIC.ASSIGN');
assert.equal(faAssign.allowedCards.some((card) => card.id === 'LIC.ASSIGN'), false);
assert.equal(faAssign.context.role.advisorUsesMobileApp, true);
assert.equal(faAssign.context.role.hasLeadershipPortalAccess, false);
assert.equal(faAssign.context.role.hasAnyPortalAccess, false);

const faHire = ask(advisor, 'production', 'I hired 50 new advisors');
assert.notEqual(faHire.answer.intent, 'LIC.REQUEST_MORE');

const faAdminAssign = ask(orgAdminFa, 'production', 'How do I assign a licence?');
assert.equal(faAdminAssign.answer.intent, 'LIC.ASSIGN');
assert.equal(faAdminAssign.context.role.advisorUsesMobileApp, true);
assert.equal(faAdminAssign.context.role.hasLeadershipPortalAccess, false);
assert.equal(faAdminAssign.context.role.hasAnyPortalAccess, true);
assert.equal(faAdminAssign.context.capabilities.canViewPipeline, false);

const faAdminPipeline = ask(orgAdminFa, 'production', 'Where is Team Pipeline?');
assert.notEqual(faAdminPipeline.answer.intent, 'REPORT.TEAM_PIPELINE');
assert.equal(
  faAdminPipeline.allowedCards.some((card) => card.id === 'REPORT.TEAM_PIPELINE'),
  false,
);

const execInvoices = ask(executive, 'production', 'Where do I find invoices?');
assert.notEqual(execInvoices.answer.intent, 'COMM.INVOICES');

const panel = fs.readFileSync(path.join(root, 'src/components/assistant/AssistantPanel.tsx'), 'utf8');
assert.match(panel, /askAdvisorTrackAssistant/);
assert.match(panel, /answerFromQuestion/);
assert.doesNotMatch(panel, /pendingNaturalLanguageAnswer/);
assert.doesNotMatch(fs.readFileSync(path.join(root, 'src/assistant/retrieve.ts'), 'utf8'), /openai|anthropic|pinecone/i);

console.log(`Assistant retrieve checks passed (${kb.cards.length} cards, Option A)`);
