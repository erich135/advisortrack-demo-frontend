/**
 * Tenant company display: authenticated company record only.
 * Run: npm run test:company-context
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sessionCompanyName } from '../src/lib/companyContext';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

assert.equal(
  sessionCompanyName({ company: { name: 'Northstar Advisory' }, organisation: { name: 'Other' } }),
  'Northstar Advisory',
);
assert.equal(
  sessionCompanyName({ company: { name: '  SANLAM  ' }, organisation: { name: 'Ignored' } }),
  'SANLAM',
);
assert.equal(sessionCompanyName({ organisation: { name: 'Momentum' } }), 'Momentum');
assert.equal(sessionCompanyName({ company: { name: '' }, organisation: { name: 'Momentum' } }), 'Momentum');
assert.equal(sessionCompanyName(null), null);
assert.equal(sessionCompanyName({ company: { name: '   ' } }), null);

const helper = fs.readFileSync(path.join(root, 'src/lib/companyContext.ts'), 'utf8');
const helperBody = helper.slice(helper.indexOf('export function sessionCompanyName'));
assert.doesNotMatch(helperBody, /email|split\('@'\)/);
assert.doesNotMatch(helperBody, /user\.company/);

const layout = fs.readFileSync(path.join(root, 'src/components/Layout.tsx'), 'utf8');
assert.match(layout, /sessionCompanyName/);
assert.match(layout, /CompanyContextMark/);
assert.match(layout, /ENTERPRISE_PLAN_NAME/);
assert.match(layout, /portal-company-context|sidebar-company-context/);
assert.doesNotMatch(layout, /<select[^>]*company/i);

const usersPage = fs.readFileSync(path.join(root, 'src/pages/UsersPage.tsx'), 'utf8');
assert.match(usersPage, /sessionCompanyName/);
assert.match(usersPage, /CompanyContextBanner/);
assert.match(usersPage, /companyName=\{pageCompanyName\}/);
assert.match(usersPage, /session\?\.isPlatformAdmin && !scopedCompanyId/);
assert.match(usersPage, /StructureCompanyFilter/);

const forms = fs.readFileSync(path.join(root, 'src/components/forms.tsx'), 'utf8');
assert.match(forms, /CompanyContextField/);
assert.match(forms, /companyName/);
assert.doesNotMatch(forms, /<SelectInput[^>]*company/i);
assert.doesNotMatch(forms, /label="Company"[\s\S]*SelectInput/);

const field = fs.readFileSync(path.join(root, 'src/components/CompanyContext.tsx'), 'utf8');
assert.match(field, /readOnly/);
assert.match(field, /disabled/);
assert.match(field, /data-testid="company-context-field"/);
assert.match(field, /company-context-mark-plan/);
assert.match(field, /planLabel/);

const dashboard = fs.readFileSync(path.join(root, 'src/pages/DashboardPage.tsx'), 'utf8');
assert.match(dashboard, /sessionCompanyName/);
assert.match(dashboard, /You are signed in to/);

const advisors = fs.readFileSync(path.join(root, 'src/pages/AdvisorsPage.tsx'), 'utf8');
assert.match(advisors, /CompanyContextBanner/);
assert.match(advisors, /sessionCompanyName/);

const settings = fs.readFileSync(path.join(root, 'src/pages/SettingsPage.tsx'), 'utf8');
assert.match(settings, /CompanyContextBanner/);
assert.match(settings, /me\.company\?\.name/);

const licences = fs.readFileSync(path.join(root, 'src/pages/licencesPanel.tsx'), 'utf8');
assert.match(licences, /companyName/);
assert.match(licences, /CompanyContextBanner/);

const structure = fs.readFileSync(path.join(root, 'src/pages/organisationStructurePanels.tsx'), 'utf8');
assert.match(structure, /regions-company-context/);
assert.match(structure, /teams-company-context/);

const customer = fs.readFileSync(path.join(root, 'src/pages/CustomerAccountPage.tsx'), 'utf8');
assert.match(customer, /scopedCompanyName=\{account\.company\.name\}/);
assert.match(customer, /companyName=\{account\.company\.name\}/);

console.log('Company context checks passed');
