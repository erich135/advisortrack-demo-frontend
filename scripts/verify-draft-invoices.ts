/**
 * Task 12: customer invoice list/detail parity (demo).
 * Run: npm run test:draft-invoices
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADVISORTRACK_VAT_REGISTERED, sellerChargesVat } from '../src/lib/advisortrackVat';
import { canViewCompanyInvoices } from '../src/lib/portalAccess';
import { calculateInvoiceTotals, calculateLine, DEFAULT_VAT_RATE_PERCENT } from '../src/lib/invoiceMoney';
import type { AuthSession } from '../src/lib/useAuth';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(ADVISORTRACK_VAT_REGISTERED, false);
assert.equal(sellerChargesVat(), false);
assert.equal(DEFAULT_VAT_RATE_PERCENT, '0.00');

assert.equal(
  canViewCompanyInvoices({
    isPlatformAdmin: false,
    isOrganisationAdmin: true,
    permissions: [],
    hierarchy: { portalAccess: false, rank: 'financial_advisor' },
  } as AuthSession),
  true
);

const discount = calculateLine({
  description: 'Negotiated discount',
  quantity: '1',
  unitPriceCents: -1_000_000,
});
const annual = calculateLine({
  description: 'AdvisorTrack Enterprise Annual Subscription',
  quantity: '1',
  unitPriceCents: 12_000_000,
});
assert.equal(calculateInvoiceTotals([annual, discount]).totalCents, 11_000_000);
assert.equal(calculateInvoiceTotals([annual, discount]).vatCents, 0);

const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
assert.match(app, /path="\/invoices"/);
assert.match(app, /RequireCompanyInvoices/);

const layout = fs.readFileSync(path.join(root, 'src/components/Layout.tsx'), 'utf8');
assert.match(layout, /\/invoices/);
const portalNav = fs.readFileSync(path.join(root, 'src/lib/portalNavigation.ts'), 'utf8');
assert.match(portalNav, /canViewCompanyInvoices/);

const page = fs.readFileSync(path.join(root, 'src/pages/InvoicesPage.tsx'), 'utf8');
assert.match(page, /listCompanyInvoices/);
assert.match(page, /downloadCompanyInvoicePdf/);
assert.match(page, /issuePlatformInvoice/);
assert.match(page, /getInvoicePrefill/);
assert.match(page, /Issue Invoice/);
assert.match(page, /Add discount line/);
assert.match(page, /customerMode/);
assert.doesNotMatch(page, /sendCompanyInvoice/);
assert.match(page, /sellerChargesVat/);
assert.match(page, /Customers cannot issue|view and download|View and download/);

const invoiceDoc = fs.readFileSync(path.join(root, 'src/components/InvoiceDocument.tsx'), 'utf8');
assert.match(invoiceDoc, /sellerChargesVat\(\) \? 'TAX INVOICE' : 'INVOICE'/);
assert.match(invoiceDoc, /Total due/);

const platformApi = fs.readFileSync(path.join(root, 'src/api/platformApi.ts'), 'utf8');
assert.match(platformApi, /\/issue/);
assert.match(platformApi, /invoice-prefill/);

console.log('Draft invoice demo frontend checks passed');
