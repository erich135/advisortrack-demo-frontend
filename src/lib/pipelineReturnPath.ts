const TEAM_PIPELINE_PREFIX = '/team-pipeline';
const ADVISORS_LIST_PREFIX = '/advisors';

const isUnsafeReturn = (trimmed: string): boolean =>
  trimmed.startsWith('//') ||
  trimmed.includes('://') ||
  /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ||
  trimmed.includes('\\') ||
  /[\0\r\n]/.test(trimmed);

/**
 * Same-app return targets for Advisor Details. Rejects open redirects and
 * nested advisor URLs so Back cannot bounce to another advisor id.
 */
export const parseAdvisorReturnPath = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  if (isUnsafeReturn(trimmed)) return null;
  if (trimmed === '/' || trimmed.startsWith('/?')) return trimmed;
  if (trimmed === ADVISORS_LIST_PREFIX || trimmed.startsWith(`${ADVISORS_LIST_PREFIX}?`)) {
    return trimmed;
  }
  if (trimmed === TEAM_PIPELINE_PREFIX || trimmed.startsWith(`${TEAM_PIPELINE_PREFIX}?`)) {
    return trimmed;
  }
  return null;
};

/**
 * Team Pipeline-only parser. Dashboard and Advisors returns are ignored here
 * so existing pipeline filter preservation stays explicit.
 */
export const parsePipelineReturnPath = (value: string | null | undefined): string | null => {
  const parsed = parseAdvisorReturnPath(value);
  if (!parsed) return null;
  if (parsed === TEAM_PIPELINE_PREFIX || parsed.startsWith(`${TEAM_PIPELINE_PREFIX}?`)) {
    return parsed;
  }
  return null;
};

export const advisorDetailsPath = (advisorId: string, returnPath?: string | null): string => {
  const safeReturn = parseAdvisorReturnPath(returnPath ?? null);
  if (!safeReturn) return `/advisors/${advisorId}`;
  return `/advisors/${advisorId}?return=${encodeURIComponent(safeReturn)}`;
};

export const advisorReturnBackLabel = (returnPath: string | null): string => {
  if (!returnPath) return 'Back to advisors';
  if (returnPath === '/' || returnPath.startsWith('/?')) return 'Back to Dashboard';
  if (returnPath === ADVISORS_LIST_PREFIX || returnPath.startsWith(`${ADVISORS_LIST_PREFIX}?`)) {
    return 'Back to advisors';
  }
  return 'Back to Team Pipeline';
};

export const DASHBOARD_RETURN_PATH = '/';
export const ADVISORS_RETURN_PATH = '/advisors';
