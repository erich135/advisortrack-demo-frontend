/**
 * Tenant display context for the Management Portal.
 * Always the authenticated (or explicitly scoped) company record — never
 * inferred from email/domain or the free-text profile "company" field.
 */
export type CompanyNameSource = {
  company?: { name?: string | null } | null;
  organisation?: { name?: string | null } | null;
};

export function sessionCompanyName(source: CompanyNameSource | null | undefined): string | null {
  const fromCompany = source?.company?.name?.trim() ?? '';
  if (fromCompany) return fromCompany;
  const fromOrganisation = source?.organisation?.name?.trim() ?? '';
  return fromOrganisation || null;
}
