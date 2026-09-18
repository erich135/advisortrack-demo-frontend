/**
 * Customer-facing Organisation → Licences dashboard.
 * Run: npm run test:licence-dashboard
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasLeadershipPortalAccess, hasOrganisationAdminAccess } from '../src/lib/portalAccess';
import type { AuthSession } from '../src/lib/useAuth';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const faOrgAdmin = {
  isPlatformAdmin: false,
  isOrganisationAdmin: true,
  permissions: [] as string[],
  hierarchy: { portalAccess: false, rank: 'financial_advisor' as const },
} as AuthSession;

assert.equal(hasLeadershipPortalAccess(faOrgAdmin), false);
assert.equal(hasOrganisationAdminAccess(faOrgAdmin), true);
assert.equal(
  hasOrganisationAdminAccess({
    isPlatformAdmin: false,
    isOrganisationAdmin: false,
    permissions: ['manage_members'],
    hierarchy: { portalAccess: true, rank: 'team_leader' },
  }),
  true
);
assert.equal(
  hasOrganisationAdminAccess({
    isPlatformAdmin: false,
    isOrganisationAdmin: false,
    permissions: [],
    hierarchy: { portalAccess: false, rank: 'financial_advisor' },
  }),
  false
);

const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
assert.match(app, /path="\/licences"/);
assert.match(app, /RequireOrganisation[\s\S]*LicencesPage/);
assert.match(app, /function RequireOrganisation/);
assert.doesNotMatch(
  app.match(/function RequireLeadership[\s\S]*?\n\}/)?.[0] ?? '',
  /isOrganisationAdmin/
);

const layout = fs.readFileSync(path.join(root, 'src/components/Layout.tsx'), 'utf8');
assert.match(layout, /buildCustomerNav/);
const portalNav = fs.readFileSync(path.join(root, 'src/lib/portalNavigation.ts'), 'utf8');
assert.match(portalNav, /Organisation/);
assert.match(portalNav, /\/licences/);
assert.match(portalNav, /hasOrganisationAdminAccess/);

const page = fs.readFileSync(path.join(root, 'src/pages/LicencesPage.tsx'), 'utf8');
assert.match(page, /sessionCompanyName/);
assert.match(page, /Purchased/);
assert.match(page, /Assigned/);
assert.match(page, /Available/);
assert.match(page, /Add User/);
assert.match(page, /Import users/);
assert.match(page, /\/bulk-import/);
assert.doesNotMatch(page, /importCompanyMembers/);
assert.match(page, /Add \/ Request Licences/);
assert.match(page, /Request Additional Licences/);
assert.match(page, /listCompanyLicenceRequests/);
assert.match(page, /Contract billing treatment/);
assert.match(page, /Proposed new total/);
assert.doesNotMatch(page, /internalNotes/);
assert.match(page, /StickyHorizontalScroll/);
assert.match(page, /assignCompanyMemberLicence/);
assert.match(page, /removeCompanyMemberLicence/);
assert.match(page, /NO_LICENCES|noneAvailable/);
assert.doesNotMatch(page, /<select[^>]*company/i);
assert.doesNotMatch(page, /getPlatformCompanies/);

console.log('Licence dashboard frontend checks passed');
