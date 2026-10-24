/**
 * AdvisorTrack Assistant A5 Option A — deterministic retrieval.
 * Mirror of Abel Backend `src/assistant/retrieve.ts`. Do not add a second card corpus.
 * No model, semantic index, or persistence. Match only against already-allowed cards.
 */
export type RetrievableCard = {
  id: string;
  title: string;
  aliases: string[];
  questionForms: string[];
  summary: string;
  routes: string[];
};

export type RetrievalHit<T extends RetrievableCard> = {
  card: T;
  score: number;
};

export type RetrievalResult<T extends RetrievableCard> =
  | { kind: 'match'; card: T; score: number }
  | { kind: 'compose'; cards: Array<RetrievalHit<T>> }
  | { kind: 'disambiguate'; cards: Array<RetrievalHit<T>> }
  | { kind: 'unknown' };

const STOP = new Set([
  'a',
  'an',
  'and',
  'are',
  'about',
  'any',
  'can',
  'could',
  'did',
  'do',
  'does',
  'for',
  'from',
  'how',
  'hows',
  'i',
  'in',
  'is',
  'it',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'please',
  'should',
  'that',
  'the',
  'this',
  'to',
  'we',
  'what',
  'whats',
  'when',
  'whens',
  'where',
  'wheres',
  'who',
  'whos',
  'why',
  'whys',
  'with',
  'would',
  'you',
  'your',
]);

const MATCH_MIN = 0.55;
const COVERAGE_MIN = 0.5;
const MATCH_LEAD = 0.12;
const COMPOSE_MIN = 0.28;
const COMPOSE_WINDOW = 0.28;
const COMPOSE_MAX = 6;
const DISAMBIGUATE_MIN = 0.62;
const DISAMBIGUATE_WINDOW = 0.04;
const DISAMBIGUATE_MAX = 3;
const ROUTE_BONUS = 0.08;

function cardFamily(cardId: string): string {
  const dot = cardId.indexOf('.');
  return (dot === -1 ? cardId : cardId.slice(0, dot)).toUpperCase();
}

function sameSubjectFamily<T extends RetrievableCard>(cards: T[], _currentRouteId: string | null): boolean {
  if (cards.length < 2) return true;
  return new Set(cards.map((card) => cardFamily(card.id))).size === 1;
}

function answeringTogetherWouldConfuse<T extends RetrievableCard>(cards: T[]): boolean {
  return new Set(cards.map((card) => cardFamily(card.id))).size >= 2;
}

export function normalizeQuestion(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/organisations?/g, 'organization')
    .replace(/licenses?/g, 'license')
    .replace(/licences?/g, 'license')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function questionTokens(value: string): string[] {
  return normalizeQuestion(value).split(/\s+/).filter((token) => token.length > 1 && !STOP.has(token));
}

function fieldScore(queryNorm: string, queryTokens: string[], field: string, weight: number): number {
  const fieldNorm = normalizeQuestion(field);
  if (!fieldNorm || !queryNorm) return 0;
  if (fieldNorm === queryNorm) return weight;
  if (queryNorm.length >= 12 && fieldNorm.includes(queryNorm)) return weight * 0.95;
  if (fieldNorm.length >= 12 && queryNorm.includes(fieldNorm)) return weight * 0.9;
  const fieldTokens = questionTokens(field);
  if (!queryTokens.length || !fieldTokens.length) return 0;
  const fieldSet = new Set(fieldTokens);
  let overlap = 0;
  for (const token of queryTokens) {
    if (fieldSet.has(token)) overlap += 1;
  }
  if (!overlap) return 0;
  const recall = overlap / queryTokens.length;
  const precision = overlap / fieldTokens.length;
  return weight * (0.7 * recall + 0.3 * precision);
}

export function scoreCard<T extends RetrievableCard>(
  question: string,
  card: T,
  currentRouteId: string | null,
): number {
  return scoreCardParts(question, card, currentRouteId).score;
}

function scoreCardParts<T extends RetrievableCard>(
  question: string,
  card: T,
  currentRouteId: string | null,
): { content: number; score: number; exactForm: boolean } {
  const queryNorm = normalizeQuestion(question);
  const queryTokens = questionTokens(question);
  if (!queryTokens.length) return { content: 0, score: 0, exactForm: false };

  let best = 0;
  let exactForm = false;
  for (const form of card.questionForms) {
    const formNorm = normalizeQuestion(form);
    if (formNorm && formNorm === queryNorm) exactForm = true;
    best = Math.max(best, fieldScore(queryNorm, queryTokens, form, 1));
  }
  for (const alias of card.aliases) {
    best = Math.max(best, fieldScore(queryNorm, queryTokens, alias, 0.86));
  }
  best = Math.max(best, fieldScore(queryNorm, queryTokens, card.title, 0.72));
  best = Math.max(best, fieldScore(queryNorm, queryTokens, card.summary, 0.28));
  const content = Math.min(1, best);
  const score =
    currentRouteId && card.routes.includes(currentRouteId)
      ? Math.min(1, content + ROUTE_BONUS)
      : content;
  return { content, score, exactForm };
}

function adviceRefusalEligible(question: string): boolean {
  const n = normalizeQuestion(question);
  if (/\bhow do i (record|capture|save|choose|select)\b/.test(n)) return false;
  return (
    /\bwhich (insurer|product|quote|policy) (should|shall|do) i (pick|choose|recommend|sell|use|push)\b/.test(n)
    || /\b(based on the quotes|which one should i pick|which insurer looks best)\b/.test(n)
    || /\bwhat (product|policy|insurer) should i (recommend|sell|advise|pick|push)\b/.test(n)
    || /\bthe client is \d+\b/.test(n)
    || /\bwhat should i sell (them|him|her|the client)\b/.test(n)
    || /\b(asset allocation|suitability|financial advice for (the |this )?client)\b/.test(n)
    || /\b(financial (adviser|advisor)|financial advice|investment advice)\b/.test(n)
    || /\b(recommend (a |an )?(product|insurer|policy)|can dex recommend)\b/.test(n)
  );
}

export function retrieveCards<T extends RetrievableCard>(
  allowedCards: T[],
  question: string,
  currentRouteId: string | null = null,
): RetrievalResult<T> {
  const queryTokens = questionTokens(question);
  if (!queryTokens.length) return { kind: 'unknown' };

  const ranked = allowedCards
    .map((card) => {
      const parts = scoreCardParts(question, card, currentRouteId);
      return { card, score: parts.score, exactForm: parts.exactForm };
    })
    .filter((hit) => hit.score > 0)
    .filter((hit) => hit.card.id !== 'PIPELINE.NO_ADVICE' || adviceRefusalEligible(question))
    .sort((left, right) => right.score - left.score || left.card.id.localeCompare(right.card.id));

  if (!ranked.length) return { kind: 'unknown' };

  const queryNormForStatus = normalizeQuestion(question);
  if (/\blead\b/.test(queryNormForStatus) && /\b(client|prospect|status)\b/.test(queryNormForStatus)) {
    const preferred = ranked.filter((hit) => /^(CONTACT\.(STATUS|CLIENT|PROSPECT))$/.test(hit.card.id));
    if (preferred.length) {
      const rest = ranked.filter((hit) => !preferred.some((item) => item.card.id === hit.card.id));
      ranked.splice(0, ranked.length, ...preferred, ...rest);
    }
  }

  const top = ranked[0];
  const second = ranked[1];
  const exactUnique = top.exactForm && (!second || !second.exactForm);
  const unique =
    exactUnique ||
    (top.score >= MATCH_MIN && (!second || top.score - second.score >= MATCH_LEAD));

  function coverage(card: T): number {
    if (!queryTokens.length) return 0;
    const fieldTokens = new Set(
      questionTokens([card.title, ...card.aliases, ...card.questionForms].join(' ')),
    );
    let overlap = 0;
    for (const token of queryTokens) {
      if (fieldTokens.has(token)) overlap += 1;
    }
    return overlap / queryTokens.length;
  }

  if (unique && (top.exactForm || coverage(top.card) >= COVERAGE_MIN)) {
    return { kind: 'match', card: top.card, score: top.score };
  }

  const related = ranked
    .filter((hit) => hit.score >= COMPOSE_MIN && top.score - hit.score <= COMPOSE_WINDOW && (hit.exactForm || coverage(hit.card) >= COVERAGE_MIN))
    .slice(0, COMPOSE_MAX);

  const queryNorm = normalizeQuestion(question);
  const stagePair = ranked.filter((hit) => /^PIPELINE\.STAGE\./.test(hit.card.id)).slice(0, 3);
  if (/\bfactfind\b/.test(queryNorm) && /\banalysis\b/.test(queryNorm) && stagePair.length >= 2) {
    return { kind: 'compose', cards: stagePair };
  }
  if (/\bquotes?\b/.test(queryNorm)) {
    const quoteCards = ranked.filter((hit) => /QUOTE|ANALYSIS/.test(hit.card.id) && cardFamily(hit.card.id) === 'PIPELINE').slice(0, 3);
    if (quoteCards.length === 1) {
      return { kind: 'match', card: quoteCards[0].card, score: quoteCards[0].score };
    }
    if (quoteCards.length >= 2) {
      return { kind: 'compose', cards: quoteCards };
    }
  }
  if (/\bunderwriting\b/.test(queryNorm)) {
    const productionCards = ranked
      .filter((hit) => cardFamily(hit.card.id) === 'PRODUCTION' && /STATUS|ISSUED|UNDERWRITING/.test(hit.card.id))
      .slice(0, 3);
    if (productionCards.length >= 2) {
      return { kind: 'compose', cards: productionCards };
    }
  }
  if (/\bfica\b/.test(queryNorm)) {
    const ficaCards = ranked.filter((hit) => /FICA/.test(hit.card.id)).slice(0, 3);
    if (ficaCards.length === 1) {
      return { kind: 'match', card: ficaCards[0].card, score: ficaCards[0].score };
    }
    if (ficaCards.length >= 2) {
      return { kind: 'compose', cards: ficaCards };
    }
  }

  const sameFamily = related.filter((hit) => cardFamily(hit.card.id) === cardFamily(top.card.id));
  if (sameFamily.length >= 2) {
    return { kind: 'compose', cards: sameFamily.slice(0, 3) };
  }
  if (
    sameFamily.length === 1
    && sameFamily[0].score >= MATCH_MIN
    && (sameFamily[0].exactForm || coverage(sameFamily[0].card) >= COVERAGE_MIN)
  ) {
    return { kind: 'match', card: sameFamily[0].card, score: sameFamily[0].score };
  }

  const close = ranked
    .filter((hit) => hit.score >= DISAMBIGUATE_MIN && top.score - hit.score <= DISAMBIGUATE_WINDOW)
    .slice(0, DISAMBIGUATE_MAX);

  if (
    close.length >= 2
    && !sameSubjectFamily(close.map((hit) => hit.card), currentRouteId)
    && answeringTogetherWouldConfuse(close.map((hit) => hit.card))
  ) {
    return { kind: 'disambiguate', cards: close };
  }

  const onRoute = ranked.filter((hit) => {
    if (!currentRouteId) return false;
    return hit.card.routes.includes(currentRouteId)
      && hit.score >= MATCH_MIN
      && (hit.exactForm || coverage(hit.card) >= COVERAGE_MIN);
  }).slice(0, COMPOSE_MAX);
  if (onRoute.length === 1) {
    return { kind: 'match', card: onRoute[0].card, score: onRoute[0].score };
  }
  if (onRoute.length >= 2) {
    return { kind: 'compose', cards: onRoute };
  }

  return { kind: 'unknown' };
}
