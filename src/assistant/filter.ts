import { cardMatchesCapabilities, contextAudience } from './context';
import type { AssistantContext } from './context';
import type {
  AssistantCategory,
  AssistantHomeTopic,
  CardFilter,
  FrontendKnowledgeBundle,
  FrontendKnowledgeCard,
  FrontendKnowledgeRoute,
} from './types';

function environmentMatches(value: 'both' | 'production' | 'demo', environment: CardFilter['environment']): boolean {
  return value === 'both' || value === environment;
}

function classificationFor(
  route: FrontendKnowledgeRoute,
  environment: CardFilter['environment'],
): 'customer' | 'internal' | 'demo' {
  return environment === 'demo' ? route.classificationDemo : route.classificationProduction;
}

function routesAllowedForCustomer(
  card: FrontendKnowledgeCard,
  routes: FrontendKnowledgeRoute[],
  environment: CardFilter['environment'],
): boolean {
  return card.routes.every((routeId) => {
    const route = routes.find((item) => item.routeId === routeId);
    if (!route) return false;
    if (route.environment !== 'both' && route.environment !== environment) return false;
    return classificationFor(route, environment) === 'customer';
  });
}

export function filterCards(
  bundle: FrontendKnowledgeBundle,
  filter: CardFilter,
): FrontendKnowledgeCard[] {
  return bundle.cards.filter((card) => {
    if (!environmentMatches(card.environment, filter.environment)) return false;
    if (filter.audience === 'customer' && card.audience === 'staff') return false;
    if (filter.audience === 'customer' && !routesAllowedForCustomer(card, bundle.routes, filter.environment)) {
      return false;
    }
    if (filter.capabilities && !cardMatchesCapabilities(card.requiredCapabilities, filter.capabilities)) {
      return false;
    }
    return true;
  });
}

export function filterCardsForContext(
  bundle: FrontendKnowledgeBundle,
  context: AssistantContext,
): FrontendKnowledgeCard[] {
  return filterCards(bundle, {
    environment: context.environment,
    audience: contextAudience(context),
    capabilities: context.capabilities,
  });
}

export function filterCategories(
  categories: AssistantCategory[],
  environment: CardFilter['environment'],
): AssistantCategory[] {
  return categories.filter((category) => environmentMatches(category.environment, environment));
}

export function filterHomeTopics(
  topics: AssistantHomeTopic[],
  environment: CardFilter['environment'],
): AssistantHomeTopic[] {
  return topics.filter((topic) => environmentMatches(topic.environment, environment));
}

export function cardsForTopic(
  cards: FrontendKnowledgeCard[],
  topic: AssistantHomeTopic,
): FrontendKnowledgeCard[] {
  const inCategory = cards.filter(
    (card) => card.category === topic.categoryId && card.kind !== 'blocked',
  );
  if (!topic.routeIds?.length) return inCategory;
  return inCategory.filter((card) => card.routes.some((routeId) => topic.routeIds?.includes(routeId)));
}

export function visibleHomeTopics(
  topics: AssistantHomeTopic[],
  cards: FrontendKnowledgeCard[],
  environment: CardFilter['environment'],
): AssistantHomeTopic[] {
  return filterHomeTopics(topics, environment).filter((topic) => cardsForTopic(cards, topic).length > 0);
}

export function suggestionLabel(card: FrontendKnowledgeCard): string {
  return card.questionForms[0] || card.title;
}

export function liveQuestionsForRoute(routeId: string | null): string[] {
  if (routeId === 'advisor-activities' || routeId === 'advisor-activity-detail') {
    return ['What follow-ups do I have today?', 'Do I have anything overdue?'];
  }
  if (routeId === 'advisor-pipeline') {
    return [
      'How many open cases do I have?',
      'What are the six stages?',
      'What is FICA?',
      'How do I submit to Production?',
      'Which stage has most of my cases?',
    ];
  }
  if (routeId === 'advisor-case-detail') {
    return [
      'What do I do next?',
      'What is FICA?',
      'How do I submit this case to Production?',
      'How do I schedule a review?',
    ];
  }
  if (routeId === 'advisor-production') {
    return [
      'How much have I issued this month?',
      'How many applications are pending underwriting?',
      'What does Accepted / Issued mean?',
      'How do I capture production?',
      'Why do my Home and Production totals differ?',
    ];
  }
  return [];
}

export function cardsForCurrentRoute(
  cards: FrontendKnowledgeCard[],
  routeId: string | null,
): FrontendKnowledgeCard[] {
  if (!routeId) return [];
  const matched = cards.filter((card) => card.kind !== 'blocked' && card.routes.includes(routeId));
  const exclusive = matched.filter((card) => card.routes.length === 1);
  const shared = matched.filter((card) => card.routes.length !== 1);
  return [...exclusive, ...shared].slice(0, 5);
}
