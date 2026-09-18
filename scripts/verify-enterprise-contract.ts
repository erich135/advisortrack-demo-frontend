/**
 * Task 11: customer-facing enterprise subscription summary (demo).
 * Run: npm run test:enterprise-contract
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADVISORTRACK_VAT_REGISTERED, sellerChargesVat } from '../src/lib/advisortrackVat';
import { canViewCompanySubscription } from '../src/lib/portalAccess';
import type { AuthSession } from '../src/lib/useAuth';
import { DEFAULT_VAT_RATE_PERCENT } from '../src/lib/invoiceMoney';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(ADVISORTRACK_VAT_REGISTERED, false);
assert.equal(sellerChargesVat(), false);
assert.equal(DEFAULT_VAT_RATE_PERCENT, '0.00');
assert.equal(
  canViewCompanySubscription({
    isPlatformAdmin: false,
    isOrganisationAdmin: true,
    permissions: [],
    hierarchy: { portalAccess: false, rank: 'financial_advisor' },
  } as AuthSession),
  true
);

const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
assert.match(app, /path="\/subscription"/);
assert.match(app, /CompanySubscriptionPage/);

const layout = fs.readFileSync(path.join(root, 'src/components/Layout.tsx'), 'utf8');
assert.match(layout, /\/subscription/);

const page = fs.readFileSync(path.join(root, 'src/pages/CompanySubscriptionPage.tsx'), 'utf8');
assert.match(page, /getCompanySubscription/);
assert.doesNotMatch(page, /internalNotes/);
assert.doesNotMatch(page, /method:\s*'PATCH'/);

const summary = fs.readFileSync(path.join(root, 'src/components/CompanySubscriptionSummary.tsx'), 'utf8');
assert.match(summary, /committed/);
assert.match(summary, /currently purchased/);
assert.doesNotMatch(summary, /internalNotes/);

const invoiceDoc = fs.readFileSync(path.join(root, 'src/components/InvoiceDocument.tsx'), 'utf8');
assert.match(invoiceDoc, /sellerChargesVat/);

console.log('Demo enterprise contract frontend checks passed');
