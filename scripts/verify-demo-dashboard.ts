import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

const app = src('src/App.tsx');
assert.match(app, /path="\/performance"/);
assert.match(app, /path="\/audit"/);
assert.match(app, /path="\/subscriptions"/);
assert.match(app, /path="\/invoices"/);
assert.match(app, /path="\/companies"/);
assert.match(app, /RequireLeadership/);
assert.match(app, /<PerformancePage/);
assert.match(app, /RequireAuditViewer/);
assert.match(app, /RequireExecutive/);
assert.match(app, /PermissionDenied/);

const layout = src('src/components/Layout.tsx');
for (const label of [
  'Dashboard',
  'Team Pipeline',
  'Advisors',
  'Production',
  'Subscriptions',
  'Invoices',
  'Companies',
  'Performance',
  'Audit',
  'Users & Access',
  'Settings & Roles',
]) {
  assert.match(layout, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.match(layout, /customerBusinessNav/);
assert.match(layout, /customerManagementNav/);
assert.match(layout, /isCustomerExecutive/);
assert.match(layout, /isCustomerPeopleManager/);
assert.match(layout, /isCustomerAuditViewer/);

const users = src('src/pages/UsersPage.tsx');
assert.match(users, /Demo user updated successfully/);
assert.match(users, /No real invitation was sent/);
assert.match(users, /Demo action completed — no real message was sent/);
assert.match(users, /Add user/);

const settings = src('src/pages/SettingsPage.tsx');
assert.match(settings, /Roles cannot be hard-deleted in the public demo/);

const invoices = src('src/pages/InvoicesPage.tsx');
assert.match(invoices, /listCompanyInvoices/);
assert.match(invoices, /sendCompanyInvoice/);
assert.match(invoices, /customerMode/);

const subscriptions = src('src/pages/SubscriptionsPage.tsx');
assert.match(subscriptions, /getCompanySubscription/);
assert.match(subscriptions, /Payment actions are disabled in the public demo/);

const audit = src('src/pages/AuditPage.tsx');
assert.match(audit, /listCompanyAudit/);
assert.match(audit, /user_updated/);
assert.match(audit, /isPermissionDeniedError/);
assert.match(audit, /AUDIT_PERMISSION_DENIED_TITLE/);

const permissionDenied = src('src/components/PermissionDenied.tsx');
assert.match(permissionDenied, /You don’t have access to this feature/);
assert.match(permissionDenied, /Your current role does not have permission to view this area\./);
assert.match(permissionDenied, /Audit Trail is available to Regional Managers and Executives/);
assert.match(permissionDenied, /Back to Dashboard/);

const portalAccess = src('src/lib/portalAccess.ts');
assert.match(portalAccess, /export function isCustomerAuditViewer/);
assert.match(portalAccess, /rank === 'executive' \|\| rank === 'regional_manager'/);

const companies = src('src/pages/CompaniesPage.tsx');
assert.match(companies, /mode: 'own'/);
assert.match(companies, /mode === 'platform' && !c.isPlatform/);

console.log('demo-dashboard frontend static checks passed');
