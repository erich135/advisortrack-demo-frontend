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
