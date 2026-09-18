import { apiRequest } from './apiClient';
import type { AssistantAnswer } from '../assistant/types';

export type AssistantAskRequest = {
  question: string;
  pathname?: string;
  search?: string;
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
    },
  });
}
