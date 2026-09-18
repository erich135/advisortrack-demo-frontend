export const ADVISORTRACK_VAT_REGISTERED = false as const;

export function sellerChargesVat(): boolean {
  return Boolean(ADVISORTRACK_VAT_REGISTERED);
}

export function customerInvoiceVatLabel(): string {
  return sellerChargesVat() ? 'VAT registered' : 'VAT not charged';
}
