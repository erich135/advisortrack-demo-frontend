import { apiDownload, apiRequest } from './apiClient';
import type { CompanyMember, LicencePool } from './companyApi';

export type PlatformCompany = {
  id: string;
  name: string;
  slug?: string;
  seatLimit?: number | null;
  isPlatform?: boolean;
  isActive?: boolean;
  memberCount?: number;
  createdAt?: string;
};

/** Platform admin: list every company. */
export async function getPlatformCompanies(): Promise<PlatformCompany[]> {
  return apiRequest<PlatformCompany[]>('/platform/companies');
}

export type PlatformCompanyOverview = {
  company: PlatformCompany;
  roles: Array<{ id: string; name: string }>;
  members: CompanyMember[];
};

/** Platform admin: one company plus its roles and members. */
export async function getPlatformCompanyOverview(companyId: string): Promise<PlatformCompanyOverview> {
  return apiRequest<PlatformCompanyOverview>(`/platform/companies/${encodeURIComponent(companyId)}`);
}

export type CommercialPackage = {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  billingInterval: string | null;
  billingCycle: string | null;
};

export type CompanySubscription = {
  company: { id: string; name: string; slug: string; isPlatform: boolean };
  subscriptionStatus: 'active' | 'suspended' | 'cancelled' | string;
  accountStatus: 'Active' | 'Inactive' | string;
  plan: { slug: string; name: string | null; priceCents: number | null; currency: string } | null;
  licencePriceCents: number | null;
  currency: string;
  billingCycle: string | null;
  billingInterval: string | null;
  subscriptionStartedAt: string | null;
  nextBillingAt: string | null;
  vatTreatment: { registered: boolean; ratePercent: number | null; label: string };
  billingContact: { userId: string | null; name: string | null; email: string | null } | null;
  licencePool: LicencePool;
  createdAt: string;
};

export type SubscriptionAuditEvent = {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
  actor: { email: string; name: string };
  previousQuantity: number | null;
  newQuantity: number | null;
  difference: number | null;
  reason: string | null;
  targetUserId: string | null;
};

export type InvoiceSnapshot = {
  registeredName: string;
  tradingName: string | null;
  registrationNumber: string | null;
  vatRegistered: boolean;
  vatNumber: string | null;
  billingContactName: string | null;
  billingEmail: string | null;
  telephone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  planSlug: string | null;
  planName: string | null;
};

export type InvoiceLine = {
  id?: string;
  sortOrder: number;
  description: string;
  quantity: string;
  unitPriceCents: number;
  discountCents: number;
  vatRatePercent: string;
  lineSubtotalCents: number;
  lineVatCents: number;
  lineTotalCents: number;
};

export type InvoiceSummary = {
  id: string;
  companyId: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  subtotalCents: number;
  vatCents: number;
  totalCents: number;
  status: string;
  presentationStatus: string;
  paymentDate: string | null;
  issuedAt: string | null;
  createdAt: string;
};

export type InvoiceDetail = InvoiceSummary & {
  poReference: string | null;
  notes: string | null;
  paymentTerms: string | null;
  snapshot: InvoiceSnapshot;
  lines: InvoiceLine[];
  paidAt: string | null;
  cancelledAt: string | null;
  voidedAt: string | null;
  duplicatedFromInvoiceId: string | null;
  updatedAt: string;
  statusEvents: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
    actor: { email: string; name: string };
  }>;
  deliveryEvents: InvoiceDeliveryEvent[];
  lastDelivery: InvoiceDeliveryEvent | null;
};

export type InvoiceDeliveryEvent = {
  id: string;
  channel: string;
  status: string;
  recipientEmail: string | null;
  errorMessage: string | null;
  providerMessageId: string | null;
  snapshotRef: string | null;
  createdAt: string;
  actor: { email: string; name: string } | null;
};

export type CompanyBillingProfile = {
  companyId: string;
  registeredName: string;
  tradingName: string | null;
  registrationNumber: string | null;
  vatRegistered: boolean;
  vatNumber: string | null;
  vatRatePercent: number | null;
  billingContactName: string | null;
  billingEmail: string | null;
  telephone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  country: string | null;
  company: { id: string; name: string; slug: string };
  subscription: {
    planSlug: string | null;
    planName: string | null;
    licencePriceCents: number | null;
    vatRegistered: boolean;
    vatRatePercent: number | null;
    purchased: number | null;
  };
};

export type CompanySubscriptionDetail = CompanySubscription & {
  allocationHistory: SubscriptionAuditEvent[];
  invoices: InvoiceSummary[];
  invoicing: { available: boolean; message: string };
  packages: CommercialPackage[];
};

export type PlatformSubscriptionsList = {
  companies: CompanySubscription[];
  packages: CommercialPackage[];
};

export async function listPlatformSubscriptions(): Promise<PlatformSubscriptionsList> {
  return apiRequest<PlatformSubscriptionsList>('/platform/subscriptions');
}

export async function getPlatformSubscription(companyId: string): Promise<CompanySubscriptionDetail> {
  return apiRequest<CompanySubscriptionDetail>(
    `/platform/subscriptions/${encodeURIComponent(companyId)}`
  );
}

export async function patchPlatformSubscription(
  companyId: string,
  body: {
    packageSlug?: string;
    billingInterval?: 'month' | 'year';
    vatRegistered?: boolean;
    vatRatePercent?: number | null;
    billingContactName?: string | null;
    billingContactEmail?: string | null;
    reason?: string;
  }
): Promise<CompanySubscriptionDetail> {
  return apiRequest<CompanySubscriptionDetail>(
    `/platform/subscriptions/${encodeURIComponent(companyId)}`,
    { method: 'PATCH', body }
  );
}

export async function setPlatformPurchasedLicences(
  companyId: string,
  body: { purchased: number | null; reason?: string }
): Promise<CompanySubscriptionDetail> {
  return apiRequest<CompanySubscriptionDetail>(
    `/platform/subscriptions/${encodeURIComponent(companyId)}/licences`,
    { method: 'PATCH', body }
  );
}

export async function addPlatformLicences(
  companyId: string,
  body: { quantity: number; reason?: string }
): Promise<CompanySubscriptionDetail> {
  return apiRequest<CompanySubscriptionDetail>(
    `/platform/subscriptions/${encodeURIComponent(companyId)}/licences/add`,
    { method: 'POST', body }
  );
}

export async function reducePlatformLicences(
  companyId: string,
  body: { quantity: number; reason?: string }
): Promise<CompanySubscriptionDetail> {
  return apiRequest<CompanySubscriptionDetail>(
    `/platform/subscriptions/${encodeURIComponent(companyId)}/licences/reduce`,
    { method: 'POST', body }
  );
}

export async function activatePlatformSubscription(
  companyId: string,
  reason?: string
): Promise<CompanySubscriptionDetail> {
  return apiRequest<CompanySubscriptionDetail>(
    `/platform/subscriptions/${encodeURIComponent(companyId)}/activate`,
    { method: 'POST', body: { reason } }
  );
}

export async function suspendPlatformSubscription(
  companyId: string,
  reason?: string
): Promise<CompanySubscriptionDetail> {
  return apiRequest<CompanySubscriptionDetail>(
    `/platform/subscriptions/${encodeURIComponent(companyId)}/suspend`,
    { method: 'POST', body: { reason } }
  );
}

export async function cancelPlatformSubscription(
  companyId: string,
  reason?: string
): Promise<CompanySubscriptionDetail> {
  return apiRequest<CompanySubscriptionDetail>(
    `/platform/subscriptions/${encodeURIComponent(companyId)}/cancel`,
    { method: 'POST', body: { reason } }
  );
}

export type InvoiceLineWrite = {
  description: string;
  quantity: string | number;
  unitPriceCents?: number;
  unitPrice?: string | number;
  discountCents?: number;
  discount?: string | number;
  vatRatePercent?: string | number;
};

export type InvoiceWriteBody = {
  companyId?: string;
  invoiceDate: string;
  dueDate: string;
  poReference?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  billing?: {
    registeredName: string;
    tradingName?: string | null;
    registrationNumber?: string | null;
    vatRegistered: boolean;
    vatNumber?: string | null;
    billingContactName?: string | null;
    billingEmail?: string | null;
    telephone?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  lines: InvoiceLineWrite[];
};

export async function listPlatformInvoices(companyId?: string): Promise<{ invoices: InvoiceSummary[] }> {
  const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  return apiRequest<{ invoices: InvoiceSummary[] }>(`/platform/invoices${query}`);
}

export async function getPlatformInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/platform/invoices/${encodeURIComponent(invoiceId)}`);
}

export async function getPlatformBillingProfile(companyId: string): Promise<CompanyBillingProfile> {
  return apiRequest<CompanyBillingProfile>(`/platform/billing-profiles/${encodeURIComponent(companyId)}`);
}

export async function createPlatformInvoice(body: InvoiceWriteBody & { companyId: string }): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>('/platform/invoices', { method: 'POST', body });
}

export async function updatePlatformDraftInvoice(
  invoiceId: string,
  body: Partial<InvoiceWriteBody>
): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/platform/invoices/${encodeURIComponent(invoiceId)}`, {
    method: 'PATCH',
    body,
  });
}

export async function sendPlatformInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/platform/invoices/${encodeURIComponent(invoiceId)}/send`, {
    method: 'POST',
    body: {},
  });
}

export async function markPlatformInvoicePaid(
  invoiceId: string,
  paymentDate: string
): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/platform/invoices/${encodeURIComponent(invoiceId)}/mark-paid`, {
    method: 'POST',
    body: { paymentDate },
  });
}

export async function cancelPlatformInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/platform/invoices/${encodeURIComponent(invoiceId)}/cancel`, {
    method: 'POST',
    body: {},
  });
}

export async function voidPlatformInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/platform/invoices/${encodeURIComponent(invoiceId)}/void`, {
    method: 'POST',
    body: {},
  });
}

export async function duplicatePlatformInvoice(invoiceId: string): Promise<InvoiceDetail> {
  return apiRequest<InvoiceDetail>(`/platform/invoices/${encodeURIComponent(invoiceId)}/duplicate`, {
    method: 'POST',
    body: {},
  });
}

export async function downloadPlatformInvoicePdf(invoiceId: string): Promise<{ blob: Blob; filename: string }> {
  return apiDownload(`/platform/invoices/${encodeURIComponent(invoiceId)}/pdf`);
}

export type PlatformCustomerAccount = {
  company: PlatformCompany;
  members: CompanyMember[];
  roles: Array<{ id: string; name: string }>;
  subscription: CompanySubscriptionDetail;
  invoices: InvoiceSummary[];
  tabs: Array<'overview' | 'users' | 'subscription' | 'licences' | 'invoices'>;
};

export async function getPlatformCustomer(companyId: string): Promise<PlatformCustomerAccount> {
  return apiRequest<PlatformCustomerAccount>(`/platform/customers/${encodeURIComponent(companyId)}`);
}

export async function listPlatformCustomerAssignableRoles(companyId: string) {
  return apiRequest<Array<{ id: string; name: string; rank: string; rankLabel: string }>>(
    `/platform/customers/${encodeURIComponent(companyId)}/assignable-roles`
  );
}

export async function getPlatformCustomerLicencePool(companyId: string): Promise<LicencePool> {
  return apiRequest<LicencePool>(`/platform/customers/${encodeURIComponent(companyId)}/licence-pool`);
}

export async function createPlatformCustomerMember(
  companyId: string,
  body: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    roleId: string;
    reportsToUserId?: string | null;
    regionId?: string | null;
    teamId?: string | null;
  }
) {
  return apiRequest<CompanyMember>(`/platform/customers/${encodeURIComponent(companyId)}/members`, {
    method: 'POST',
    body,
  });
}

export async function updatePlatformCustomerMember(
  companyId: string,
  memberId: string,
  body: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string | null;
    roleId?: string;
    reportsToUserId?: string | null;
    regionId?: string | null;
    teamId?: string | null;
    isActive?: boolean;
  }
) {
  return apiRequest<CompanyMember>(
    `/platform/customers/${encodeURIComponent(companyId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'PATCH', body }
  );
}

export async function assignPlatformCustomerLicence(companyId: string, memberId: string) {
  return apiRequest<CompanyMember>(
    `/platform/customers/${encodeURIComponent(companyId)}/members/${encodeURIComponent(memberId)}/licence`,
    { method: 'POST' }
  );
}

export async function removePlatformCustomerLicence(companyId: string, memberId: string) {
  return apiRequest<CompanyMember>(
    `/platform/customers/${encodeURIComponent(companyId)}/members/${encodeURIComponent(memberId)}/licence`,
    { method: 'DELETE' }
  );
}

export async function resendPlatformCustomerInvitation(companyId: string, memberId: string) {
  return apiRequest<{ sent: boolean; email: string }>(
    `/platform/customers/${encodeURIComponent(companyId)}/members/${encodeURIComponent(memberId)}/resend-invitation`,
    { method: 'POST' }
  );
}

export type AdminAuditEvent = {
  id: string;
  action: string;
  resourceType: string;
  createdAt: string;
  actor: { email: string; name: string };
  companyId: string | null;
  previousValue: string | number | boolean | null;
  newValue: string | number | boolean | null;
  difference: number | null;
  reason: string | null;
  targetUserId: string | null;
  invoiceNumber: string | null;
};

export async function listPlatformAudit(filters?: {
  companyId?: string;
  resourceType?: string;
}): Promise<{ events: AdminAuditEvent[] }> {
  const params = new URLSearchParams();
  if (filters?.companyId) params.set('companyId', filters.companyId);
  if (filters?.resourceType) params.set('resourceType', filters.resourceType);
  const query = params.toString();
  return apiRequest<{ events: AdminAuditEvent[] }>(`/platform/audit${query ? `?${query}` : ''}`);
}
