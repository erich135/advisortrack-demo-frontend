import { apiRequest } from './apiClient';

export type ManagementProductionAdvisor = {
  userId: string;
  firstName: string;
  lastName: string;
  issuedAmount: number;
  issuedCount: number;
  nonIssuedAmount: number;
  nonIssuedCount: number;
  goalAmount: number | null;
  attainmentPercent: number | null;
};

export type ManagementProductionSummary = {
  period: string;
  advisorCount: number;
  issuedAmount: number;
  issuedCount: number;
  nonIssuedAmount: number;
  nonIssuedCount: number;
  advisors: ManagementProductionAdvisor[];
};

export type ManagementProductionEntry = {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  contactName: string | null;
  title: string;
  productName: string | null;
  amount: number;
  isIssued: boolean;
  applicationStatus: string | null;
  submittedAt: string;
  issuedAt: string | null;
};

export type ManagementProductionEntries = {
  period: string;
  issuedAmount: number;
  issuedCount: number;
  nonIssuedAmount: number;
  nonIssuedCount: number;
  entries: ManagementProductionEntry[];
};

export type ManagementPipelineFilters = {
  advisorId?: string;
  stage?: string;
  status?: string;
  search?: string;
};

export type ManagementPipelineCase = {
  caseId: string;
  advisor: {
    userId: string;
    firstName: string;
    lastName: string;
  };
  contactName: string | null;
  title: string | null;
  currentStage: string;
  status: string;
  createdAt: string;
  lastUpdatedAt: string;
  estimatedCommission: number | null;
  nextStepDate: string | null;
  nextScheduledActivity: {
    title: string | null;
    pipelineStage: string | null;
    dueAt: string | null;
    dueDate: string | null;
  } | null;
  fica: {
    idReceived: boolean;
    residenceReceived: boolean;
    bankReceived: boolean;
    skipAcknowledged: boolean;
  };
  documents: {
    totalCount: number;
    receivedCount: number;
  };
};

export type ManagementPipelineResponse = {
  advisorCount: number;
  caseCount: number;
  overviewCaseCount: number;
  overviewActiveCaseCount: number;
  stageCounts: Record<string, number>;
  totalEstimatedCommission: number;
  estimatedCommissionCaseCount: number;
  cases: ManagementPipelineCase[];
};

/** AdvisorTrack-recorded production for the authenticated management scope. */
export async function getManagementProductionSummary(
  month: string,
): Promise<ManagementProductionSummary> {
  return apiRequest<ManagementProductionSummary>(
    `/management/production/summary?month=${encodeURIComponent(month)}`,
  );
}

/** Case-level production rows for the same month and scope as the summary. */
export async function getManagementProductionEntries(
  month: string,
): Promise<ManagementProductionEntries> {
  return apiRequest<ManagementProductionEntries>(
    `/management/production/entries?month=${encodeURIComponent(month)}`,
  );
}

/** Real case pipeline limited by the authenticated user's management scope. */
export async function getManagementPipeline(
  filters: ManagementPipelineFilters = {},
): Promise<ManagementPipelineResponse> {
  const query = new URLSearchParams();
  if (filters.advisorId) query.set('advisorId', filters.advisorId);
  if (filters.stage) query.set('stage', filters.stage);
  if (filters.status) query.set('status', filters.status);
  if (filters.search) query.set('search', filters.search);

  const queryString = query.toString();
  return apiRequest<ManagementPipelineResponse>(
    `/management/pipeline${queryString ? `?${queryString}` : ''}`,
  );
}

export type ManagementPerformancePeriod = 'last_week' | 'last_month' | 'year_to_date';

export type ManagementPerformer = {
  userId: string;
  name: string;
  role: string;
  issuedAmount: number;
};

export type ManagementPerformanceResponse = {
  period: ManagementPerformancePeriod;
  periodLabel: string;
  periodStart: string;
  periodEnd: string;
  timezone: string;
  comparisonRole: string | null;
  scopeKind: 'organisation' | 'region' | 'team';
  topPerformer: ManagementPerformer | null;
  worstPerformer: ManagementPerformer | null;
  emptyReason: 'no_subordinates' | 'no_issued_cases' | 'single_subordinate' | 'tied' | null;
  emptyMessage: string | null;
};

/** Issued-performance Top/Worst Performer for the authenticated leadership scope. */
export async function getManagementPerformance(
  period: ManagementPerformancePeriod = 'last_month',
): Promise<ManagementPerformanceResponse> {
  return apiRequest<ManagementPerformanceResponse>(
    `/management/performance?period=${encodeURIComponent(period)}`,
  );
}

export type AdvisorAttentionReason = {
  code: 'mobile_inactive' | 'stalled' | 'missing_documents' | 'no_next_action';
  label: string;
};

export type AdvisorStageDistribution = {
  stage: string;
  caseCount: number;
  estimatedCommission: number;
  estimatedCommissionCaseCount: number;
};

export type AdvisorSummaryResponse = {
  advisorId: string;
  lastMobileActivityAt: string | null;
  activeCases: number;
  pipelineValue: number;
  estimatedCommissionCaseCount: number;
  issuedThisMonth: {
    month: string;
    amount: number;
    count: number;
  };
  stalledOpenCases: number;
  missingDocumentsCases: number;
  noNextActionCases: number;
  attentionReasons: AdvisorAttentionReason[];
  health: 'healthy' | 'needs_attention';
  stageDistribution: AdvisorStageDistribution[];
  cases: ManagementPipelineCase[];
};

/** Management-scoped advisor drilldown metrics and current open cases. */
export async function getAdvisorSummary(advisorId: string): Promise<AdvisorSummaryResponse> {
  return apiRequest<AdvisorSummaryResponse>(
    `/management/advisors/${encodeURIComponent(advisorId)}/summary`,
  );
}
