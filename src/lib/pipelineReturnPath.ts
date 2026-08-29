const TEAM_PIPELINE_PREFIX = '/team-pipeline';

/**
 * Accepts only same-app Team Pipeline paths. Rejects open redirects.
 */
export const parsePipelineReturnPath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  if (trimmed.startsWith('//') || trimmed.includes('://')) return null;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  if (trimmed.includes('\\') || /[\0\r\n]/.test(trimmed)) return null;
  if (!trimmed.startsWith(TEAM_PIPELINE_PREFIX)) return null;
  if (trimmed !== TEAM_PIPELINE_PREFIX && !trimmed.startsWith(`${TEAM_PIPELINE_PREFIX}?`)) {
    return null;
  }
  return trimmed;
};

export const advisorDetailsPath = (advisorId: string, returnPath?: string | null): string => {
  const safeReturn = parsePipelineReturnPath(returnPath ?? null);
  if (!safeReturn) return `/advisors/${advisorId}`;
  return `/advisors/${advisorId}?return=${encodeURIComponent(safeReturn)}`;
};
