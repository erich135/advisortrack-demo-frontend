import type { FrontendKnowledgeBundle } from './types';

export async function loadAssistantBundle(): Promise<FrontendKnowledgeBundle> {
  const mod = await import('./knowledge-bundle.json');
  return (mod.default ?? mod) as FrontendKnowledgeBundle;
}
