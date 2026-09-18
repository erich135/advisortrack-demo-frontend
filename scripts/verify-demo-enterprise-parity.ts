/**
 * Task 15: public-demo frontend must showcase customer enterprise pages and hide platform admin.
 * Run: npm run test:demo-enterprise-parity
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTERPRISE_PLAN_NAME } from '../src/lib/enterpriseContract';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

assert.equal(ENTERPRISE_PLAN_NAME, 'AdvisorTrack Enterprise');

const app = src('src/App.tsx');
assert.doesNotMatch(app, /EnterpriseCustomerOnboardingPage|EnterpriseCustomersPage/);
assert.doesNotMatch(app, /LicenceRequestsPage/);
assert.doesNotMatch(app, /EngineeringChangelogPage/);
assert.match(app, /path="\/subscription"/);
assert.match(app, /path="\/licences"/);
assert.match(app, /path="\/bulk-import"/);
assert.match(app, /path="\/users"/);
assert.match(app, /path="\/invoices"/);

const layout = src('src/components/Layout.tsx');
assert.match(layout, /ENTERPRISE_PLAN_NAME/);
assert.match(layout, /demo-pill/);
assert.match(layout, /Reset Demo/);
assert.match(layout, /Viewing as/);
assert.doesNotMatch(layout, /Enterprise customers/);
assert.doesNotMatch(layout, /Licence requests/);
assert.doesNotMatch(layout, /Change Log/);

const mark = src('src/components/CompanyContext.tsx');
assert.match(mark, /company-context-mark-plan/);

const subscription = src('src/pages/CompanySubscriptionPage.tsx');
assert.match(subscription, /toCustomerSummary|enterprise/);
assert.doesNotMatch(subscription, /internalNotes/);

const users = src('src/pages/UsersPage.tsx');
assert.match(users, /organisationAdmin/);
assert.match(users, /assignLicence/);
assert.match(users, /Resend invitation|resendInvitation/);

const licences = src('src/pages/LicencesPage.tsx');
assert.match(licences, /Request Additional Licences/);
assert.doesNotMatch(licences, /Approve/);

const invoices = src('src/pages/InvoicesPage.tsx');
assert.match(invoices, /listCompanyInvoices/);
assert.match(invoices, /downloadCompanyInvoicePdf/);
assert.doesNotMatch(invoices, /sendCompanyInvoice/);

const bulk = src('src/pages/BulkImportPage.tsx');
assert.match(bulk, /Download Excel Template|template/);
assert.match(bulk, /preview|Preview/);
assert.match(bulk, /confirm|Confirm/);

console.log('Demo enterprise parity frontend checks passed');
