import { apiDownload, apiRequest } from './apiClient';
import type { Organisation } from './authApi';
import type { AdminAuditEvent, CompanySubscription, InvoiceDetail, InvoiceSummary } from './platformApi';

export type CompanyRole = {
  id: string;
  name: string;
};

export type CompanyMe = {
  company: Organisation;
  role: CompanyRole | null;
  permissions: string[];
  reportsToUserId: string | null;
  isPlatformAdmin: boolean;
  isOrganisationAdmin?: boolean;
  canAccessEngineeringChangelog?: boolean;
  hierarchy?: {
    rank: 'platform_admin' | 'executive' | 'regional_manager' | 'team_leader' | 'financial_advisor';
    label: string;
    comparisonRank: string | null;
    comparisonRoleLabel: string | null;
    portalAccess: boolean;
    scopeKind: 'organisation' | 'region' | 'team' | null;
    structureAccess?: {
      canViewRegions: boolean;
      canManageRegions: boolean;
      canViewTeams: boolean;
      canManageTeams: boolean;
    };
  };
};

export type CompanyMemberSubscription = {
  slug: string;
  name: string;
  status: string;
};

export type ReportingUnit = {
  id: string;
  name: string;
};

export type MemberActions = {
  view: boolean;
  edit: boolean;
  changeRole: boolean;
  assignTeam: boolean;
  assignRegion: boolean;
  assignLicence: boolean;
  removeLicence: boolean;
  activateAccount: boolean;
  deactivateAccount: boolean;
  resendInvitation: boolean;
};

export type HierarchyRank =
  | 'platform_admin'
  | 'executive'
  | 'regional_manager'
  | 'team_leader'
  | 'financial_advisor';

export type InvitationChannel = 'mobile' | 'portal';

export type InvitationStatusValue =
  | 'queued'
  | 'sent'
  | 'accepted'
  | 'expired'
  | 'failed'
  | 'revoked';

export type MemberInvitation = {
  id: string;
  companyId: string;
  userId: string;
  channel: InvitationChannel;
  email: string;
  status: InvitationStatusValue;
  statusLabel: string;
  sentAt: string | null;
  acceptedAt: string | null;
  expiresAt: string | null;
  resendCount: number;
  failureReason: string | null;
};

export type CompanyMember = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  role: CompanyRole | null;
  reportsToUserId: string | null;
  isPlatformAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: string | null;
  lastMobileActivityAt?: string | null;
  subscription: CompanyMemberSubscription | null;
  licenceStatus: 'Licensed' | 'Unlicensed';
  accountStatus: 'Active' | 'Inactive';
  invitationStatus?: string;
  invitation?: MemberInvitation | null;
  rank?: HierarchyRank;
  rankLabel?: string;
  team?: ReportingUnit | null;
  region?: ReportingUnit | null;
  actions?: MemberActions;
  createdAt: string;
};

export type CompanyMemberDetail = CompanyMember & {
  company: Organisation;
  invitationSent?: boolean;
  invitationRequested?: boolean;
  invitationChannel?: InvitationChannel;
  organisationAdminGranted?: boolean;
  licenceAssigned?: boolean;
  portalAccess?: boolean;
  activationUrl?: string;
  invitation?: MemberInvitation | null;
  demoSimulated?: boolean;
  message?: string;
};

export type AssignableRole = {
  id: string;
  name: string;
  rank: HierarchyRank;
  rankLabel: string;
};

export type CreateCompanyMemberInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  roleId: string;
  reportsToUserId?: string | null;
  regionId?: string | null;
  teamId?: string | null;
  organisationAdmin?: boolean;
  assignLicence?: boolean;
  sendInvitation?: boolean;
};

export type UpdateCompanyMemberInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  roleId?: string;
  reportsToUserId?: string | null;
  regionId?: string | null;
  teamId?: string | null;
  isActive?: boolean;
};

export type LicencePool = {
  purchased: number | null;
  assigned: number;
  available: number | null;
};

export type OrganisationRegion = {
  id: string;
  companyId: string;
  name: string;
  managerUserId: string | null;
  managerName: string | null;
  isActive: boolean;
  status: 'Active' | 'Archived';
  createdAt: string;
  updatedAt: string;
};

export type OrganisationTeam = {
  id: string;
  companyId: string;
  regionId: string;
  regionName: string;
  name: string;
  leaderUserId: string | null;
  leaderName: string | null;
  isActive: boolean;
  status: 'Active' | 'Archived';
  createdAt: string;
  updatedAt: string;
};

function withCompanyQuery(path: string, companyId?: string): string {
  if (!companyId) return path;
  const join = path.includes('?') ? '&' : '?';
  return `${path}${join}companyId=${encodeURIComponent(companyId)}`;
}

export type CompanyRoleDetail = {
  id: string;
  name: string;
  isDefault?: boolean;
  isSystem?: boolean;
  permissions: string[];
  createdAt?: string;
};

export type CreateCompanyRoleInput = {
  name: string;
  permissions?: string[];
};

export type UpdateCompanyRoleInput = {
  name?: string;
  permissions?: string[];
};

export async function getCompanyMe(): Promise<CompanyMe> {
  return apiRequest<CompanyMe>('/company/me');
}

/** Role-scoped member list for the signed-in user's company. */
export async function getCompanyMembers(): Promise<CompanyMember[]> {
  return apiRequest<CompanyMember[]>('/company/members');
}

/** Roles the signed-in user is authorised to assign. */
export async function getAssignableRoles(): Promise<AssignableRole[]> {
  return apiRequest<AssignableRole[]>('/company/assignable-roles');
}

/** One member visible within the signed-in user's management scope. */
export async function getCompanyMember(memberId: string): Promise<CompanyMemberDetail> {
  return apiRequest<CompanyMemberDetail>(`/company/members/${encodeURIComponent(memberId)}`);
}

/** Invite a member into the signed-in user's company. */
export async function createCompanyMember(
  input: CreateCompanyMemberInput,
): Promise<CompanyMemberDetail> {
  return apiRequest<CompanyMemberDetail>('/company/members', {
    method: 'POST',
    body: input,
  });
}

/** Update a scoped member. Backend remains authoritative. */
export async function updateCompanyMember(
  memberId: string,
  input: UpdateCompanyMemberInput,
): Promise<CompanyMemberDetail> {
  return apiRequest<CompanyMemberDetail>(`/company/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    body: input,
  });
}

/** Assign a paid licence from existing subscriptions (not the Phase 5 pool). */
export async function assignCompanyMemberLicence(memberId: string): Promise<CompanyMemberDetail> {
  return apiRequest<CompanyMemberDetail>(`/company/members/${encodeURIComponent(memberId)}/licence`, {
    method: 'POST',
  });
}

/** Remove a paid licence and return the user to the default free subscription. */
export async function removeCompanyMemberLicence(memberId: string): Promise<CompanyMemberDetail> {
  return apiRequest<CompanyMemberDetail>(`/company/members/${encodeURIComponent(memberId)}/licence`, {
    method: 'DELETE',
  });
}

export type MemberOffboardingResult = {
  member: CompanyMemberDetail;
  licencePool: LicencePool;
  licenceReturned: boolean;
  organisationAdminRevoked: boolean;
  alreadyInactive: boolean;
};

/** Deactivate a member, return any assigned licence, and keep history. */
export async function deactivateCompanyMember(memberId: string): Promise<MemberOffboardingResult> {
  return apiRequest<MemberOffboardingResult>(`/company/members/${encodeURIComponent(memberId)}/deactivate`, {
    method: 'POST',
  });
}

/** Resend the role-appropriate invitation. */
export async function resendCompanyMemberInvitation(
  memberId: string,
): Promise<{
  sent: boolean;
  email: string;
  channel?: InvitationChannel;
  activationUrl?: string;
  invitation?: MemberInvitation | null;
  demoSimulated?: boolean;
  message?: string;
}> {
  return apiRequest(`/company/members/${encodeURIComponent(memberId)}/resend-invitation`, {
    method: 'POST',
  });
}

/** Roles + permission keys for the signed-in user's company. */
export async function getCompanyRoles(): Promise<CompanyRoleDetail[]> {
  return apiRequest<CompanyRoleDetail[]>('/company/roles');
}

/** Creates a custom company role. Backend manage_roles permission remains authoritative. */
export async function createCompanyRole(
  input: CreateCompanyRoleInput,
): Promise<CompanyRoleDetail> {
  return apiRequest<CompanyRoleDetail>('/company/roles', {
    method: 'POST',
    body: input,
  });
}

/** Renames a company role and/or replaces its permission keys. */
export async function updateCompanyRole(
  roleId: string,
  input: UpdateCompanyRoleInput,
): Promise<CompanyRoleDetail> {
  return apiRequest<CompanyRoleDetail>(`/company/roles/${encodeURIComponent(roleId)}`, {
    method: 'PATCH',
    body: input,
  });
}

/** Deletes a non-system company role. */
export async function deleteCompanyRole(roleId: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/company/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
  });
}

export type CompanyPermission = {
  key: string;
  label?: string;
  description?: string;
};

/** Fixed organisation permission catalogue. */
export async function getCompanyPermissions(): Promise<CompanyPermission[]> {
  return apiRequest<CompanyPermission[]>('/company/permissions');
}

/** Customer licence pool for the signed-in user's company. */
export async function getCompanyLicencePool(): Promise<LicencePool> {
  return apiRequest<LicencePool>('/company/licence-pool');
}

export type LicenceIncreaseRequest = {
  id: string;
  currentPurchased: number | null;
  additionalRequested: number;
  proposedTotal: number | null;
  status: string;
  statusLabel?: string;
  notes: string | null;
  createdAt: string;
  appliedAt?: string | null;
  billingTreatment?: string | null;
  billingTreatmentLabel?: string | null;
  seatLimitUnchanged?: boolean;
  contractTerms?: {
    billingModel?: string | null;
    additionalSeatPolicy?: string | null;
    handledAccordingToContract: boolean;
  } | null;
};

export type LicenceIncreaseContext = {
  purchased: number | null;
  assigned: number;
  available: number | null;
  additionalSeatPolicy: string | null;
  additionalSeatPolicyLabel: string | null;
  requests: LicenceIncreaseRequest[];
};

export async function listCompanyLicenceRequests(): Promise<LicenceIncreaseContext> {
  return apiRequest<LicenceIncreaseContext>('/company/licence-requests');
}

export async function requestCompanyLicences(body: {
  additional: number;
  notes?: string | null;
}): Promise<LicenceIncreaseRequest> {
  return apiRequest<LicenceIncreaseRequest>('/company/licence-requests', {
    method: 'POST',
    body,
  });
}

export async function cancelCompanyLicenceRequest(requestId: string): Promise<LicenceIncreaseRequest> {
  return apiRequest<LicenceIncreaseRequest>(`/company/licence-requests/${encodeURIComponent(requestId)}/cancel`, {
    method: 'POST',
    body: {},
  });
}

export async function importCompanyMembers(
  rows: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    roleId?: string;
  }>
): Promise<{
  created: Array<{ email: string; id: string }>;
  errors: Array<{ email: string; message: string }>;
  licencesAssigned: number;
}> {
  return apiRequest('/company/members/import', {
    method: 'POST',
    body: { rows },
  });
}

export type BulkImportPreviewRow = {
  rowNumber: number;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  role: string;
  region: string;
  team: string;
  licence: 'YES' | 'NO';
  invite: 'YES' | 'NO';
  organisationAdmin: 'YES' | 'NO';
  invitationChannel: InvitationChannel | null;
  status: 'valid' | 'error';
  errors: string[];
};

export type BulkImportPreview = {
  fingerprint: string;
  wrote: false;
  canConfirm: boolean;
  blockReasons: string[];
  summary: {
    totalRows: number;
    valid: number;
    errors: number;
    financialAdvisors: number;
    teamLeaders: number;
    regionalManagers: number;
    executives: number;
    organisationAdmins: number;
    licences: {
      purchased: number | null;
      assigned: number;
      available: number | null;
      requested: number;
      remaining: number | null;
      shortfall: number;
    };
    invitations: {
      mobile: number;
      portal: number;
      none: number;
    };
  };
  rows: BulkImportPreviewRow[];
};

export type BulkImportConfirmResult = {
  importId: string | null;
  wrote: true;
  status: 'completed' | 'completed_with_row_failures' | 'failed';
  createdCount: number;
  failedCount: number;
  summary: BulkImportPreview['summary'];
  rows: Array<{
    rowNumber: number;
    email: string;
    status: 'imported' | 'failed';
    error: string | null;
  }>;
};

export type BulkImportPayloadRow = {
  rowNumber: number;
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  role: string;
  region: string;
  team: string;
  organisation_admin: string;
  assign_licence: string;
  send_invitation: string;
  hasFormula?: boolean;
};

export async function previewCompanyBulkImport(input: {
  fileName?: string;
  rows: BulkImportPayloadRow[];
}): Promise<BulkImportPreview> {
  return apiRequest('/company/members/import/preview', {
    method: 'POST',
    body: input,
  });
}

export async function confirmCompanyBulkImport(input: {
  fileName?: string;
  fingerprint: string;
  rows: BulkImportPayloadRow[];
}): Promise<BulkImportConfirmResult> {
  return apiRequest('/company/members/import/confirm', {
    method: 'POST',
    body: input,
  });
}

/** Own-company commercial subscription. Session-scoped; never a client companyId. */
export async function getCompanySubscription(): Promise<CompanySubscription> {
  return apiRequest<CompanySubscription>('/company/subscription');
}

/** Own-company administrative history. */
export async function listCompanyAudit(): Promise<{ events: AdminAuditEvent[] }> {
  return apiRequest<{ events: AdminAuditEvent[] }>('/company/audit');
}

export async function listCompanyInvoices(): Promise<{ invoices: InvoiceSummary[] }> {
  return apiRequest<{ invoices: InvoiceSummary[] }>('/company/invoices');
}

export async function getCompanyInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/company/invoices/${encodeURIComponent(invoiceId)}`);
}

export async function sendCompanyInvoice(
  invoiceId: string,
): Promise<InvoiceDetail & { demoSimulated?: boolean; message?: string }> {
  return apiRequest<InvoiceDetail & { demoSimulated?: boolean; message?: string }>(
    `/company/invoices/${encodeURIComponent(invoiceId)}/send`,
    { method: 'POST' },
  );
}

export async function downloadCompanyInvoicePdf(invoiceId: string): Promise<{ blob: Blob; filename: string }> {
  return apiDownload(`/company/invoices/${encodeURIComponent(invoiceId)}/pdf`);
}

export async function getCompanyRegions(companyId?: string): Promise<OrganisationRegion[]> {
  return apiRequest<OrganisationRegion[]>(withCompanyQuery('/company/regions', companyId));
}

export async function createCompanyRegion(
  input: { name: string; managerUserId?: string | null },
  companyId?: string,
): Promise<OrganisationRegion> {
  return apiRequest<OrganisationRegion>(withCompanyQuery('/company/regions', companyId), {
    method: 'POST',
    body: input,
  });
}

export async function updateCompanyRegion(
  regionId: string,
  input: { name?: string; managerUserId?: string | null; isActive?: boolean },
  companyId?: string,
): Promise<OrganisationRegion> {
  return apiRequest<OrganisationRegion>(
    withCompanyQuery(`/company/regions/${encodeURIComponent(regionId)}`, companyId),
    { method: 'PATCH', body: input },
  );
}

export async function getCompanyTeams(companyId?: string): Promise<OrganisationTeam[]> {
  return apiRequest<OrganisationTeam[]>(withCompanyQuery('/company/teams', companyId));
}

export async function createCompanyTeam(
  input: { name: string; regionId: string; leaderUserId?: string | null },
  companyId?: string,
): Promise<OrganisationTeam> {
  return apiRequest<OrganisationTeam>(withCompanyQuery('/company/teams', companyId), {
    method: 'POST',
    body: input,
  });
}

export async function updateCompanyTeam(
  teamId: string,
  input: { name?: string; regionId?: string; leaderUserId?: string | null; isActive?: boolean },
  companyId?: string,
): Promise<OrganisationTeam> {
  return apiRequest<OrganisationTeam>(
    withCompanyQuery(`/company/teams/${encodeURIComponent(teamId)}`, companyId),
    { method: 'PATCH', body: input },
  );
}
