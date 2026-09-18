/**
 * Generated from Abel Backend `src/assistant`. Do not author cards here.
 * Refresh with `npm run assistant:export-kb` in the production backend.
 */
export type CardEnvironment = 'both' | 'production' | 'demo';
export type CardAudience = 'customer' | 'staff' | 'both';
export type RouteClassification = 'customer' | 'internal' | 'demo';

export type AssistantCategory = {
  id: string;
  label: string;
  environment: CardEnvironment;
  description: string;
};

export type AssistantHomeTopic = {
  id: string;
  label: string;
  categoryId: string;
  environment: CardEnvironment;
  routeIds?: string[];
};

export type KnowledgeStep = {
  label: string;
  routeId?: string;
};

export type FrontendKnowledgeCard = {
  id: string;
  kind: string;
  title: string;
  aliases: string[];
  questionForms: string[];
  audience: CardAudience;
  environment: CardEnvironment;
  requiredCapabilities: string[];
  routes: string[];
  category: string;
  summary: string;
  steps: KnowledgeStep[];
  blockedGuidance: string | null;
  requiredFacts?: string[];
};

export type FrontendKnowledgeRoute = {
  routeId: string;
  path: string;
  label: string;
  environment: CardEnvironment;
  classification: RouteClassification;
  demoLabel?: string;
  classificationProduction: RouteClassification;
  classificationDemo: RouteClassification;
  productionCapability?: string | null;
  demoCapability?: string | null;
};

export type FrontendKnowledgeBundle = {
  version: string;
  categories: AssistantCategory[];
  homeTopics: AssistantHomeTopic[];
  routes: FrontendKnowledgeRoute[];
  cards: FrontendKnowledgeCard[];
};

export type CardFilter = {
  environment: 'production' | 'demo';
  audience: 'customer' | 'staff';
  capabilities?: Record<string, boolean>;
};

export type NavigateAction = {
  type: 'navigate';
  routeId: string;
  path: string;
  label: string;
};

export type AssistantAnswer = {
  answerId: string;
  intent: string;
  confidence: number;
  mode: 'allowed' | 'blocked' | 'not_applicable' | 'unknown' | 'disambiguate' | 'clarify';
  headline: string;
  body: string;
  facts?: { label: string; value: string; source: string }[];
  steps?: { label: string; action?: NavigateAction }[];
  caveats?: string[];
  actions?: NavigateAction[];
  sources: { cardId: string; title: string }[];
  clarifyingQuestion?: string;
  disambiguation?: { cardId: string; label: string; title: string }[];
  escalation?: { label: string; kind: 'support' | 'org_admin' };
};
