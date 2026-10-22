import { ApiError } from '../../api/apiClient';
import type {
  AdvisorCaseListItem,
  AdvisorCaseQuote,
  AdvisorContactCase,
  AdvisorFactFindMode,
  AdvisorPipelineStage,
} from '../../api/advisorApi';
import { getPipelineStageLabel, PIPELINE_STAGES } from '../../lib/pipelineStages';

export const CASE_TABS = [
  'overview',
  'fica',
  'factfind',
  'quotes',
  'next',
  'review',
] as const;

export type CaseTab = (typeof CASE_TABS)[number];

export const CASE_TAB_LABELS: Record<CaseTab, string> = {
  overview: 'Overview',
  fica: 'FICA & Documents',
  factfind: 'Fact-find',
  quotes: 'Quotes',
  next: 'Next Action',
  review: 'Review',
};

export const CASE_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  won: 'Won',
  lost: 'Lost',
  closed: 'Closed',
};

export const FACT_FIND_LABELS: Record<AdvisorFactFindMode, string> = {
  simple_goal: 'Simple goal',
  full_fna: 'Full FNA',
};

export const RISK_PROFILE_OPTIONS = [
  'Conservative',
  'Moderate',
  'Moderately aggressive',
  'Aggressive',
];

export const MARITAL_STATUS_OPTIONS = [
  'Single',
  'Married in community of property',
  'Married ANC',
  'Married ANC with accrual',
  'Divorced',
  'Widowed',
];

export function caseErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error && error.message ? error.message : fallback;
  }
  if (error.status === 404 || error.code === 'NOT_FOUND') {
    return 'This case is not in your book.';
  }
  const message = error.message?.trim() ?? '';
  if (!message || /stack|sqlstate|postgres|relation |column /i.test(message)) {
    return fallback;
  }
  return message;
}

export function emptyQuote(): AdvisorCaseQuote {
  return { productType: '', insurer: '', premium: undefined, commission: undefined };
}

export function quotesFromCase(item: AdvisorContactCase): AdvisorCaseQuote[] {
  const quotes = item.analysisQuotes?.length ? [...item.analysisQuotes] : [];
  return quotes.slice(0, 3);
}

export function canSubmitToProduction(item: AdvisorContactCase): boolean {
  return Number(item.estimatedCommission ?? 0) > 0;
}

export function pipelineSummary(items: AdvisorCaseListItem[]): {
  open: number;
  commission: number;
  stages: Record<string, number>;
} {
  const stages = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage, 0]));
  return items.reduce(
    (summary, item) => {
      if (item.status === 'open') {
        summary.open += 1;
        summary.commission += Number(item.estimatedCommission ?? 0);
        if (item.currentStage in summary.stages) {
          summary.stages[item.currentStage] += 1;
        }
      }
      return summary;
    },
    { open: 0, commission: 0, stages },
  );
}

export function stageHint(item: AdvisorCaseListItem): string {
  if (item.status !== 'open') return CASE_STATUS_LABELS[item.status] ?? item.status;
  if (item.nextStepDate) return `Next: ${item.nextStepDate}`;
  if (!item.ficaComplete) return 'FICA incomplete';
  if (item.documentCount > 0 && item.documentsReceived < item.documentCount) {
    return `Docs ${item.documentsReceived}/${item.documentCount}`;
  }
  if (item.chosenInsurer) return item.chosenInsurer;
  return getPipelineStageLabel(item.currentStage);
}

export function toDateInputValue(value?: string): string {
  return value ? value.slice(0, 10) : '';
}

export function toTimeInputValue(iso?: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(11, 16);
}

export function combineNextStep(date: string, time: string): {
  nextStepDate: string | null;
  nextStepScheduledAt?: string | null;
} {
  if (!date) return { nextStepDate: null, nextStepScheduledAt: null };
  if (!time) return { nextStepDate: date };
  return { nextStepDate: date, nextStepScheduledAt: `${date}T${time}:00.000Z` };
}

export function asStage(value: string): AdvisorPipelineStage | '' {
  return PIPELINE_STAGES.includes(value as AdvisorPipelineStage) ? (value as AdvisorPipelineStage) : '';
}
