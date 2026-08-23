import { apiRequest } from './apiClient';
import type { Organisation } from './authApi';

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
  subscription: CompanyMemberSubscription | null;
  licenceStatus: 'Licensed' | 'Unlicensed';
  accountStatus: 'Active' | 'Inactive';
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

/** Resend the existing invitation / password-reset PIN. */
export async function resendCompanyMemberInvitation(
  memberId: string,
): Promise<{ sent: boolean; email: string; demoSimulated?: boolean; message?: string }> {
  return apiRequest<{ sent: boolean; email: string; demoSimulated?: boolean; message?: string }>(
    `/company/members/${encodeURIComponent(memberId)}/resend-invitation`,
    { method: 'POST' },
  );
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
