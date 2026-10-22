import { ApiError } from '../../api/apiClient';

export const TERMS_VERSION = '2026-06';

export const ADVISOR_TYPES = [
  { value: 'independent', label: 'Independent' },
  { value: 'employee', label: 'Employee' },
] as const;

export const WEEKLY_TARGET_ROWS = [
  { key: 'coldCallsPerWeek', label: 'Initial contacts' },
  { key: 'interviewsPerWeek', label: 'Fact-finding' },
  { key: 'quotesPerWeek', label: 'Analysis & quotes' },
  { key: 'recommendationsPerWeek', label: 'Recommendations' },
  { key: 'casesSubmittedPerWeek', label: 'Implementations' },
  { key: 'casesIssuedPerWeek', label: 'Issued cases / week' },
] as const;

export const RATIO_FIELDS = [
  {
    ratio: 'coldCallToInterviewRatio',
    override: 'coldCallToInterviewOverride',
    label: 'Initial contact → Fact-finding',
  },
  {
    ratio: 'interviewToAnalysisRatio',
    override: 'interviewToAnalysisOverride',
    label: 'Fact-finding → Analysis',
  },
  {
    ratio: 'analysisToRecommendationRatio',
    override: 'analysisToRecommendationOverride',
    label: 'Analysis → Recommendation',
  },
  {
    ratio: 'recommendationToImplementationRatio',
    override: 'recommendationToImplementationOverride',
    label: 'Recommendation → Implementation',
  },
  {
    ratio: 'submissionToIssuedRatio',
    override: 'submissionToIssuedOverride',
    label: 'Implementation → Issued',
  },
] as const;

export function sliderPercent(value: number): string {
  return `${Math.round(value * 10)}% conversion`;
}

export function configErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  const message = error.message?.trim() ?? '';
  if (!message || /stack|sqlstate|postgres|relation |column /i.test(message)) {
    return fallback;
  }
  return message;
}

export function advisorTypeLabel(value?: string | null): string {
  if (value === 'employee') return 'Employee';
  if (value === 'independent') return 'Independent';
  return 'Not set';
}
