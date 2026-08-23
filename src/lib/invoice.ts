import type { Invoice } from '../domain/types';

export interface InvoiceTotals {
  subtotal: number;
  vat: number;
  total: number;
}

export function invoiceTotals(inv: Invoice): InvoiceTotals {
  const subtotal = inv.lineItems.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const vat = subtotal * inv.vatRate;
  return { subtotal, vat, total: subtotal + vat };
}
