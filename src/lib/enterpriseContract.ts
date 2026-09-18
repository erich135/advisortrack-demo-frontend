import { customerInvoiceVatLabel } from './advisortrackVat';

export const BILLING_FREQUENCY_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  custom: 'Custom',
} as const;

export type CustomerSubscriptionSummary = {
  company: { id: string; name: string };
  planName: string;
  commercialStatus: string;
  contractStartDate: string | null;
  contractEndDate: string | null;
  autoRenew: boolean;
  billingModel: string;
  billingFrequency: string;
  billingFrequencyLabel: string;
  pricingBasis: string;
  currency: string;
  committedLicences: number | null;
  currentPurchasedLicences: number | null;
  unitPriceCents: number | null;
  fixedAmountCents: number | null;
  amountDueCents: number | null;
  amountDueLabel: string;
  paymentTermsCode: string;
  paymentTermsLabel: string;
  poReference: string | null;
  billingContactName: string | null;
  billingEmail: string | null;
  billingNotes: string | null;
  vatCharged: boolean;
  vatLabel: string;
  readOnly: true;
};

export const ENTERPRISE_PLAN_NAME = 'AdvisorTrack Enterprise';

export function formatLicenceCount(value: number | null | undefined): string {
  if (value == null) return '—';
  return value.toLocaleString('en-ZA');
}

export function contractVatCaption(): string {
  return customerInvoiceVatLabel();
}
