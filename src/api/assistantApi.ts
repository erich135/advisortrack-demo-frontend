import { apiRequest } from './apiClient';
import type { AssistantAnswer } from '../assistant/types';

export type AssistantAskRequest = {
  question: string;
  pathname?: string;
  search?: string;
  previousQuestion?: string;
  history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  viewport?: 'desktop' | 'phone' | 'unknown';
  resetConversation?: boolean;
};

export type AssistantConversationTurn = {
  role: 'user' | 'assistant';
  text: string;
};

/**
 * Server-side Assistant ask (A6). Identity is reconstructed by the API.
 * The browser may send only the question and current path.
 * Demo uses the demo API base URL only.
 */
export async function askAdvisorTrackAssistant(input: AssistantAskRequest): Promise<AssistantAnswer> {
  return apiRequest<AssistantAnswer>('/assistant/ask', {
    method: 'POST',
    body: {
      question: input.question,
      pathname: input.pathname,
      search: input.search,
      previousQuestion: input.previousQuestion,
      history: input.history,
      viewport: input.viewport,
      resetConversation: input.resetConversation,
    },
  });
}

export async function getAdvisorTrackAssistantConversation(): Promise<{
  turns: AssistantConversationTurn[];
}> {
  return apiRequest('/assistant/conversation');
}

export async function resetAdvisorTrackAssistantConversation(options?: {
  token?: string;
}): Promise<{ cleared: boolean }> {
  return apiRequest('/assistant/conversation/reset', {
    method: 'POST',
    token: options?.token,
    skipUnauthorizedHandler: true,
  });
}
