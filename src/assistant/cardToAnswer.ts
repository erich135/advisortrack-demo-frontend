import {
  alreadyOnRouteMessage,
  routeReachable,
  type AssistantContext,
  type AssistantEnvironment,
  type AssistantLicencePool,
} from './context';
import { retrieveCards } from './retrieve';
import type {
  AssistantAnswer,
  FrontendKnowledgeBundle,
  FrontendKnowledgeCard,
  NavigateAction,
} from './types';

function isConcretePath(path: string): boolean {
  return !path.includes(':');
}

function asContext(
  environmentOrContext: AssistantEnvironment | AssistantContext,
): AssistantContext {
  if (typeof environmentOrContext !== 'string') return environmentOrContext;
  return {
    environment: environmentOrContext,
    workspace: 'management',
    identity: { userId: '', companyId: null, companyName: null },
    role: {
      reportingRole: null,
      isOrganisationAdmin: false,
      isPlatformStaff: false,
      advisorUsesMobileApp: false,
      hasAnyPortalAccess: true,
      hasLeadershipPortalAccess: true,
      scopeKind: null,
    },
    capabilities: {},
    route: { routeId: null, path: '/', tab: null, query: {} },
  };
}

function formatPoolCount(value: number | null): string {
  return value == null ? 'Unlimited' : String(value);
}

function licenceFacts(pool: AssistantLicencePool): AssistantAnswer['facts'] {
  return [
    { label: 'Purchased', value: formatPoolCount(pool.purchased), source: 'Company licence pool' },
    { label: 'Assigned', value: String(pool.assigned), source: 'Company licence pool' },
    { label: 'Available', value: formatPoolCount(pool.available), source: 'Company licence pool' },
  ];
}

export function navigateActionForRoute(
  bundle: FrontendKnowledgeBundle,
  routeId: string,
  environment: AssistantEnvironment,
): NavigateAction | undefined {
  const route = bundle.routes.find((item) => item.routeId === routeId);
  if (!route || !isConcretePath(route.path)) return undefined;
  const label = environment === 'demo' && route.demoLabel ? route.demoLabel : route.label;
  return {
    type: 'navigate',
    routeId: route.routeId,
    path: route.path,
    label: `Open ${label}`,
  };
}

export function answerFromCard(
  bundle: FrontendKnowledgeBundle,
  card: FrontendKnowledgeCard,
  environmentOrContext: AssistantEnvironment | AssistantContext,
): AssistantAnswer {
  const context = asContext(environmentOrContext);
  const steps = card.steps.map((step) => {
    if (step.routeId && step.routeId === context.route.routeId) {
      const route = bundle.routes.find((item) => item.routeId === step.routeId);
      if (route) return { label: alreadyOnRouteMessage(route, context.environment) };
    }
    return { label: step.label };
  });
  const actions = card.steps
    .map((step) => {
      if (!step.routeId) return undefined;
      if (step.routeId === context.route.routeId) return undefined;
      const route = bundle.routes.find((item) => item.routeId === step.routeId);
      if (route && !routeReachable(route, context)) return undefined;
      return navigateActionForRoute(bundle, step.routeId, context.environment);
    })
    .filter((action): action is NavigateAction => Boolean(action))
    .filter((action, index, list) => list.findIndex((item) => item.routeId === action.routeId) === index);

  const facts =
    card.requiredFacts?.includes('licencePool') && context.facts?.licencePool
      ? licenceFacts(context.facts.licencePool)
      : undefined;

  return {
    answerId: card.id,
    intent: card.id,
    confidence: 1,
    mode: 'allowed',
    headline: card.title,
    body: card.summary,
    facts,
    steps: steps.length ? steps : undefined,
    actions: actions.length ? actions : undefined,
    sources: [{ cardId: card.id, title: card.title }],
  };
}

function isAdvisorActivitiesRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return (
    context?.workspace === 'advisor' &&
    (routeId === 'advisor-activities' ||
      routeId === 'advisor-activity-detail' ||
      path === '/advisor/activities' ||
      path.startsWith('/advisor/activities/'))
  );
}

function isAdvisorPipelineRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return (
    context?.workspace === 'advisor' &&
    (routeId === 'advisor-pipeline' || path === '/advisor/pipeline')
  );
}

function isAdvisorCaseRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return (
    context?.workspace === 'advisor' &&
    (routeId === 'advisor-case-detail' || path.startsWith('/advisor/cases/'))
  );
}

function isAdvisorProductionRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return (
    context?.workspace === 'advisor' &&
    (routeId === 'advisor-production' || path === '/advisor/production')
  );
}

function isAdvisorPlanningRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return context?.workspace === 'advisor' && (routeId === 'advisor-planning' || path === '/advisor/planning');
}

function isAdvisorProfileRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return context?.workspace === 'advisor' && (routeId === 'advisor-profile' || path === '/advisor/profile');
}

function isAdvisorSettingsRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return context?.workspace === 'advisor' && (routeId === 'advisor-settings' || path === '/advisor/settings');
}

function isAdvisorSubscriptionRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return context?.workspace === 'advisor' && (routeId === 'advisor-subscription' || path === '/advisor/subscription');
}

function isAdvisorSetupRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return context?.workspace === 'advisor' && (routeId === 'advisor-setup' || path === '/advisor/setup');
}

function isAdvisorContactsRoute(context?: AssistantContext): boolean {
  const routeId = context?.route.routeId;
  const path = context?.route.path ?? '';
  return (
    context?.workspace === 'advisor' &&
    (routeId === 'advisor-contacts' ||
      routeId === 'advisor-contact-detail' ||
      path === '/advisor/contacts' ||
      path.startsWith('/advisor/contacts/'))
  );
}

export function unknownHelpAnswer(context?: AssistantContext): AssistantAnswer {
  if (context?.workspace === 'advisor' && (context.route.routeId === 'advisor-home' || context.route.path === '/advisor')) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about your dashboard, monthly target, weekly activity, pipeline or upcoming activities?',
      sources: [],
    };
  }
  if (isAdvisorActivitiesRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about scheduling an activity, follow-ups, rescheduling, completing an activity, or recording an outcome?',
      sources: [],
    };
  }
  if (isAdvisorPipelineRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about a pipeline stage, FICA, documents, quotes, next actions, submitting to Production or reviews?',
      sources: [],
    };
  }
  if (isAdvisorCaseRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: "Are you asking about this case's stage, FICA, documents, quotes, next action, submitting to Production or scheduling a review?",
      sources: [],
    };
  }
  if (isAdvisorProductionRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about capturing production, application status, issued production, pending applications or editing an entry?',
      sources: [],
    };
  }
  if (isAdvisorPlanningRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about your monthly target, weekly activity targets, conversion ratios, or how progress is calculated?',
      sources: [],
    };
  }
  if (isAdvisorProfileRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about updating your profile, Financial Settings, commission split, or advisor type?',
      sources: [],
    };
  }
  if (isAdvisorSettingsRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about conversion ratios, average commission, tax override, or adaptive ratios?',
      sources: [],
    };
  }
  if (isAdvisorSubscriptionRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about your current plan, Live Preview, locked features, or how to upgrade in the mobile app?',
      sources: [],
    };
  }
  if (isAdvisorSetupRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about completing Setup, monthly nett goal, commission split, or conversion ratios?',
      sources: [],
    };
  }
  if (isAdvisorContactsRoute(context)) {
    return {
      answerId: 'unknown',
      intent: 'unknown',
      confidence: 0,
      mode: 'unknown',
      headline: "I couldn't confidently match that yet",
      body: 'Are you asking about adding or editing a contact, contact status, importing contacts, POPIA consent, Live Preview, activities or cases?',
      sources: [],
    };
  }
  return {
    answerId: 'unknown',
    intent: 'unknown',
    confidence: 0,
    mode: 'unknown',
    headline: "I don't have an article for that",
    body: "I only use AdvisorTrack help articles you are allowed to see. I don't guess. Try a topic below, or ask about a specific page such as Licences, Users & Access, or Invoices.",
    sources: [],
  };
}

export function answerFromQuestion(
  bundle: FrontendKnowledgeBundle,
  allowedCards: FrontendKnowledgeCard[],
  question: string,
  context: AssistantContext,
): AssistantAnswer {
  const retrieved = retrieveCards(allowedCards, question, context.route.routeId);
  if (retrieved.kind === 'match') {
    return { ...answerFromCard(bundle, retrieved.card, context), confidence: retrieved.score };
  }
  if (retrieved.kind === 'disambiguate') {
    return {
      answerId: `disambiguate:${retrieved.cards.map((hit) => hit.card.id).join(',')}`,
      intent: 'disambiguate',
      confidence: retrieved.cards[0]?.score ?? 0,
      mode: 'disambiguate',
      headline: 'Which of these did you mean?',
      body: 'A few help articles could match your question. Choose one — I will not guess.',
      clarifyingQuestion: 'Which of these did you mean?',
      disambiguation: retrieved.cards.map(({ card }) => ({
        cardId: card.id,
        label: card.questionForms[0] || card.title,
        title: card.title,
      })),
      sources: retrieved.cards.map(({ card }) => ({ cardId: card.id, title: card.title })),
    };
  }
  return unknownHelpAnswer(context);
}
