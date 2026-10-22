import { apiRequest } from './apiClient';

/**
 * Advisor Home uses GET /dashboard exactly.
 *
 * Issued vs Production-page inconsistency (do not “fix” in A8.2):
 * Home issued = this month’s production_entries dated by COALESCE(due_date, created_at)
 *   where is_issued OR application_status = 'accepted_issued'.
 * Home estimated/potential = ALL production this month (same date rule)
 *   plus open cases’ estimated_commission with no linked production.
 * The Production page uses the same issued flag rule but a different date/period basis.
 */
export type AdvisorDashboardActivityIcon = 'call' | 'people' | 'document' | 'upload';

export type AdvisorDashboardActivityStat = {
  id: string;
  label: string;
  current: number;
  target: number;
  icon: AdvisorDashboardActivityIcon;
  locked?: boolean;
};

export type AdvisorDashboardUpcomingEvent = {
  id: string;
  title: string;
  type: 'call' | 'meeting' | 'email' | 'follow_up' | 'presentation' | 'other' | 'case_step';
  status: 'scheduled' | 'completed' | 'cancelled';
  contactName?: string;
  contactId?: string;
  scheduledAt: string;
  pipelineStage?: string;
};

export type AdvisorDashboardPipelineStage = {
  stage: string;
  proceeded: number;
  lost: number;
  completed: number;
  conversionPercent: number;
  lostPercent: number;
};

export type AdvisorDashboardSummary = {
  income: {
    estimatedCommission: number;
    issuedCommission: number;
    progressPercent: number;
    estimatedProgressPercent: number;
    monthlyGoal: number;
  };
  weeklyPoints: {
    earned: number;
    total: number;
    locked?: boolean;
  };
  weeklyStats: AdvisorDashboardActivityStat[];
  upcomingEvents: AdvisorDashboardUpcomingEvent[];
  upcomingEventsLocked?: boolean;
  pipeline: {
    period: { month: string };
    stages: AdvisorDashboardPipelineStage[];
    overall: {
      totalProceeded: number;
      totalLost: number;
      lostRatio: number;
      conversionRatio: number;
    };
    locked?: boolean;
  };
  period: {
    month: string;
    weekStart: string;
    weekEnd: string;
  };
};

export async function getAdvisorDashboard(): Promise<AdvisorDashboardSummary> {
  return apiRequest<AdvisorDashboardSummary>('/dashboard');
}

export async function getAdvisorPlanningTargets(): Promise<{
  weeklyPointTarget?: number;
  weekly?: unknown;
}> {
  return apiRequest('/planning/targets');
}

export type AdvisorContactStatus = 'prospect' | 'active' | 'inactive' | 'client';
export type AdvisorContactPriority = 'low' | 'medium' | 'high';
export type AdvisorContactActivation = 'active' | 'archived';
export type AdvisorActivityType = 'call' | 'meeting' | 'email' | 'follow_up' | 'presentation' | 'other';
export type AdvisorActivityStatus = 'scheduled' | 'completed' | 'cancelled';
export type AdvisorPipelineStage =
  | 'Initial Contact'
  | 'Interview'
  | 'Analysis'
  | 'Recommendation'
  | 'Implementation'
  | 'Review';

export type AdvisorContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  status: AdvisorContactStatus;
  priority: AdvisorContactPriority;
  rating: number;
  notes?: string;
  lastContactedAt?: string;
  consentRecordedAt?: string;
  importSource?: string;
  popiaNoticeVersion?: string;
  isPractice: boolean;
  activationStatus: AdvisorContactActivation;
  createdAt: string;
};

export type AdvisorContactWrite = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  status?: AdvisorContactStatus;
  priority?: AdvisorContactPriority;
  rating?: number;
  notes?: string;
  consentAccepted?: boolean;
};

export type AdvisorContactImportResult = {
  imported: number;
  skipped: number;
  duplicates: number;
  total: number;
};

export type AdvisorActivity = {
  id: string;
  title: string;
  type: AdvisorActivityType;
  status: AdvisorActivityStatus;
  pipelineStage?: string;
  outcome?: 'proceeded' | 'lost' | 'completed';
  lostReason?: string;
  sourceActivityId?: string;
  contactId?: string;
  contactName?: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  createdAt: string;
};

export type AdvisorActivityWrite = {
  title: string;
  type: AdvisorActivityType;
  contactId?: string;
  contactName?: string;
  scheduledAt: string;
  durationMinutes?: number;
  description?: string;
  pipelineStage?: AdvisorPipelineStage;
};

export type AdvisorActivityPatch = {
  title?: string;
  scheduledAt?: string;
  description?: string;
  status?: AdvisorActivityStatus;
};

export type AdvisorActivityOutcomeInput = {
  action: 'proceed' | 'lost' | 'complete';
  lostReason?: string;
  production?: { amount: number; date: string; notes?: string };
  advanceCase?: boolean;
  submitToProduction?: boolean;
  nextScheduledAt?: string;
  nextPipelineStage?: AdvisorPipelineStage;
};

export type AdvisorActivityOutcomeResult = {
  activity: AdvisorActivity;
  nextActivity?: AdvisorActivity;
  production?: { id: string };
};

export type AdvisorCaseStatus = 'open' | 'won' | 'lost' | 'closed';
export type AdvisorFactFindMode = 'simple_goal' | 'full_fna';

export type AdvisorCaseQuote = {
  productType?: string;
  insurer?: string;
  premium?: number;
  commission?: number;
};

export type AdvisorCaseDocument = {
  id: string;
  documentType: string;
  label: string;
  sentAt?: string;
  receivedAt?: string;
  notes?: string;
};

export type AdvisorCaseListItem = {
  id: string;
  contactId: string;
  contactName: string;
  currentStage: AdvisorPipelineStage | string;
  status: string;
  title?: string;
  estimatedCommission?: number;
  chosenInsurer?: string;
  nextStepDate?: string;
  reviewDueAt?: string;
  ficaComplete: boolean;
  ficaSkipAcknowledged: boolean;
  documentCount: number;
  documentsSent: number;
  documentsReceived: number;
  linkedProductionId?: string;
  updatedAt: string;
};

export type AdvisorContactCase = {
  id: string;
  contactId: string;
  contactName: string;
  currentStage: string;
  status: string;
  title?: string;
  nextStepDate?: string;
  nextStepScheduledAt?: string;
  estimatedCommission?: number;
  chosenInsurer?: string;
  reviewDueAt?: string;
  ficaComplete?: boolean;
  ficaIdReceived?: boolean;
  ficaResidenceReceived?: boolean;
  ficaBankReceived?: boolean;
  ficaSkipAcknowledged?: boolean;
  ficaWarning?: string;
  factFindMode?: string;
  simpleGoalProduct?: string;
  simpleGoalAmount?: number;
  maritalStatus?: string;
  dependentsNotes?: string;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  financialGoals?: string;
  riskProfile?: string;
  factFindNotes?: string;
  fixedAssetsTotal?: number;
  nonFixedAssetsTotal?: number;
  investmentsTotal?: number;
  liabilitiesTotal?: number;
  savingsMonthly?: number;
  employerBenefitsNotes?: string;
  businessInterestsNotes?: string;
  retirementFundsNotes?: string;
  lifeCoverNotes?: string;
  estatePlanningNotes?: string;
  quotesRequestedNotes?: string;
  analysisQuotes?: AdvisorCaseQuote[];
  quoteProductType?: string;
  quotePremium?: number;
  replacementAdviceRequired?: boolean;
  replacementAdviceConfirmed?: boolean;
  clientApproved?: boolean;
  linkedProductionId?: string;
  documents?: AdvisorCaseDocument[];
  updatedAt?: string;
};

export type AdvisorCasePatch = {
  currentStage?: AdvisorPipelineStage;
  status?: AdvisorCaseStatus;
  title?: string;
  ficaIdReceived?: boolean;
  ficaResidenceReceived?: boolean;
  ficaBankReceived?: boolean;
  ficaSkipAcknowledged?: boolean;
  factFindMode?: AdvisorFactFindMode | null;
  simpleGoalProduct?: string | null;
  simpleGoalAmount?: number | null;
  maritalStatus?: string | null;
  dependentsNotes?: string | null;
  monthlyIncome?: number | null;
  monthlyExpenses?: number | null;
  financialGoals?: string | null;
  riskProfile?: string | null;
  factFindNotes?: string | null;
  fixedAssetsTotal?: number | null;
  nonFixedAssetsTotal?: number | null;
  investmentsTotal?: number | null;
  liabilitiesTotal?: number | null;
  savingsMonthly?: number | null;
  employerBenefitsNotes?: string | null;
  businessInterestsNotes?: string | null;
  retirementFundsNotes?: string | null;
  lifeCoverNotes?: string | null;
  estatePlanningNotes?: string | null;
  quotesRequestedNotes?: string | null;
  analysisQuotes?: AdvisorCaseQuote[];
  nextStepDate?: string | null;
  nextStepScheduledAt?: string | null;
  quoteProductType?: string | null;
  chosenInsurer?: string | null;
  quotePremium?: number | null;
  estimatedCommission?: number | null;
  replacementAdviceRequired?: boolean;
  replacementAdviceConfirmed?: boolean;
  clientApproved?: boolean | null;
  acknowledgeFicaIncomplete?: boolean;
  submitToProduction?: boolean;
};

export type AdvisorContactQuota = {
  practiceCount: number;
  activeRealCount: number;
  archivedRealCount: number;
  maxActiveRealContacts: number;
  canCreateRealContact: boolean;
  canImportContacts: boolean;
  livePreviewEnabled: boolean;
  sandboxCompleted: boolean;
};

export type AdvisorEntitlements = {
  tier?: string;
  livePreviewEnabled?: boolean;
  isPro?: boolean;
  contacts?: AdvisorContactQuota;
};

export type AdvisorSubscriptionMe = {
  name?: string;
  slug?: string;
  packageName?: string;
  packageSlug?: string;
  entitlements?: AdvisorEntitlements;
};

export type AdvisorPopiaAuditEntry = {
  id: string;
  action: string;
  resourceType: string;
  resourceCount: number | null;
  createdAt: string;
};

function searchQuery(search?: string): string {
  const q = search?.trim();
  return q ? `?search=${encodeURIComponent(q)}` : '';
}

export async function listAdvisorContacts(search?: string): Promise<AdvisorContact[]> {
  return apiRequest<AdvisorContact[]>(`/contacts${searchQuery(search)}`);
}

export async function getAdvisorContact(contactId: string): Promise<AdvisorContact> {
  return apiRequest<AdvisorContact>(`/contacts/${encodeURIComponent(contactId)}`);
}

export async function createAdvisorContact(input: AdvisorContactWrite): Promise<AdvisorContact> {
  return apiRequest<AdvisorContact>('/contacts', { method: 'POST', body: input });
}

export async function updateAdvisorContact(
  contactId: string,
  input: Partial<AdvisorContactWrite>,
): Promise<AdvisorContact> {
  return apiRequest<AdvisorContact>(`/contacts/${encodeURIComponent(contactId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteAdvisorContact(contactId: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/contacts/${encodeURIComponent(contactId)}`, {
    method: 'DELETE',
  });
}

export async function activateAdvisorContact(contactId: string): Promise<AdvisorContact> {
  return apiRequest<AdvisorContact>(`/contacts/${encodeURIComponent(contactId)}/activate`, {
    method: 'POST',
  });
}

export async function importAdvisorContacts(
  contacts: AdvisorContactWrite[],
  options: { consentAccepted: true; popiaNoticeVersion?: string },
): Promise<AdvisorContactImportResult> {
  return apiRequest<AdvisorContactImportResult>('/contacts/import', {
    method: 'POST',
    body: {
      contacts,
      consentAccepted: options.consentAccepted,
      popiaNoticeVersion: options.popiaNoticeVersion,
    },
  });
}

export async function getAdvisorPopiaAudit(): Promise<AdvisorPopiaAuditEntry[]> {
  return apiRequest<AdvisorPopiaAuditEntry[]>('/contacts/popia-audit');
}

export async function listAdvisorActivities(): Promise<AdvisorActivity[]> {
  return apiRequest<AdvisorActivity[]>('/activities');
}

export async function createAdvisorActivity(input: AdvisorActivityWrite): Promise<AdvisorActivity> {
  return apiRequest<AdvisorActivity>('/activities', { method: 'POST', body: input });
}

export async function updateAdvisorActivity(
  activityId: string,
  input: AdvisorActivityPatch,
): Promise<AdvisorActivity> {
  return apiRequest<AdvisorActivity>(`/activities/${encodeURIComponent(activityId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function deleteAdvisorActivity(activityId: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/activities/${encodeURIComponent(activityId)}`, {
    method: 'DELETE',
  });
}

export async function recordAdvisorActivityOutcome(
  activityId: string,
  input: AdvisorActivityOutcomeInput,
): Promise<AdvisorActivityOutcomeResult> {
  return apiRequest<AdvisorActivityOutcomeResult>(`/activities/${encodeURIComponent(activityId)}/outcome`, {
    method: 'POST',
    body: input,
  });
}

export async function getAdvisorContactOpenCaseCount(contactId: string): Promise<{ count: number }> {
  return apiRequest<{ count: number }>(
    `/cases/contact/${encodeURIComponent(contactId)}/open-count`,
  );
}

export async function getOrCreateAdvisorContactCase(contactId: string): Promise<AdvisorContactCase> {
  return apiRequest<AdvisorContactCase>(`/cases/contact/${encodeURIComponent(contactId)}`);
}

export async function listAdvisorCases(filters?: {
  status?: AdvisorCaseStatus;
  stage?: AdvisorPipelineStage;
}): Promise<AdvisorCaseListItem[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.stage) params.set('stage', filters.stage);
  const query = params.toString();
  return apiRequest<AdvisorCaseListItem[]>(`/cases${query ? `?${query}` : ''}`);
}

export async function getAdvisorCase(caseId: string): Promise<AdvisorContactCase> {
  return apiRequest<AdvisorContactCase>(`/cases/${encodeURIComponent(caseId)}`);
}

export async function updateAdvisorCase(
  caseId: string,
  input: AdvisorCasePatch,
): Promise<AdvisorContactCase> {
  return apiRequest<AdvisorContactCase>(`/cases/${encodeURIComponent(caseId)}`, {
    method: 'PATCH',
    body: input,
  });
}

export async function updateAdvisorCaseDocument(
  caseId: string,
  documentId: string,
  input: { markSent?: boolean; markReceived?: boolean; notes?: string | null },
): Promise<AdvisorContactCase> {
  return apiRequest<AdvisorContactCase>(
    `/cases/${encodeURIComponent(caseId)}/documents/${encodeURIComponent(documentId)}`,
    { method: 'PATCH', body: input },
  );
}

export async function scheduleAdvisorCaseReview(caseId: string): Promise<AdvisorContactCase> {
  return apiRequest<AdvisorContactCase>(`/cases/${encodeURIComponent(caseId)}/schedule-review`, {
    method: 'POST',
  });
}

export async function duplicateAdvisorCase(caseId: string): Promise<AdvisorContactCase> {
  return apiRequest<AdvisorContactCase>(`/cases/${encodeURIComponent(caseId)}/duplicate`, {
    method: 'POST',
  });
}

export async function getAdvisorSubscriptionMe(): Promise<AdvisorSubscriptionMe> {
  return apiRequest<AdvisorSubscriptionMe>('/subscription/me');
}

export async function enableAdvisorLivePreview(): Promise<AdvisorSubscriptionMe> {
  return apiRequest<AdvisorSubscriptionMe>('/subscription/enable-live-preview', { method: 'POST' });
}
