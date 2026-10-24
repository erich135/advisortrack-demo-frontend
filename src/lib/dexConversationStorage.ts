const PREFIX = 'at_dex_transcript:';

export type DexTranscriptItem =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'assistant'; answer: { headline: string; body: string; [key: string]: unknown } };

export function dexTranscriptStorageKey(input: {
  environment: 'production' | 'demo';
  userId?: string | null;
  companyId?: string | null;
  demoSessionId?: string | null;
}): string | null {
  if (input.environment === 'demo') {
    const scope = input.demoSessionId?.trim();
    if (!scope) return null;
    return `${PREFIX}demo:${scope}`;
  }
  const userId = input.userId?.trim();
  if (!userId) return null;
  return `${PREFIX}production:${userId}:${input.companyId ?? 'none'}`;
}

export function readDexTranscript(key: string | null): DexTranscriptItem[] | null {
  if (!key || typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DexTranscriptItem[]) : null;
  } catch {
    return null;
  }
}

export function writeDexTranscript(key: string | null, transcript: DexTranscriptItem[]): void {
  if (!key || typeof sessionStorage === 'undefined') return;
  try {
    if (!transcript.length) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(transcript));
  } catch {
    // Ignore storage failures.
  }
}

export function clearDexTranscript(key: string | null): void {
  if (!key || typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export const DEX_CLEARED_EVENT = 'at-dex-cleared';

export function clearAllDexTranscripts(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const keys: string[] = [];
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index);
      if (key?.startsWith(PREFIX)) keys.push(key);
    }
    keys.forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Ignore storage failures.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(DEX_CLEARED_EVENT));
  }
}
