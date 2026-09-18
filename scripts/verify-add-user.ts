/**
 * Task 7: customer Add User form — enterprise fields on the existing /users?new=1 modal.
 * Run: npm run test:add-user
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasLeadershipPortalAccess, hasOrganisationAdminAccess } from '../src/lib/portalAccess';
import type { AuthSession } from '../src/lib/useAuth';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const fa = {
  isPlatformAdmin: false,
  isOrganisationAdmin: false,
  permissions: [] as string[],
  hierarchy: { portalAccess: false, rank: 'financial_advisor' as const },
} as AuthSession;
assert.equal(hasLeadershipPortalAccess(fa), false);

const faOrgAdmin = {
  ...fa,
  isOrganisationAdmin: true,
} as AuthSession;
assert.equal(hasLeadershipPortalAccess(faOrgAdmin), false);
assert.equal(hasOrganisationAdminAccess(faOrgAdmin), true);

const forms = fs.readFileSync(path.join(root, 'src/components/forms.tsx'), 'utf8');
assert.match(forms, /Reporting role/);
assert.match(forms, /Organisation Administrator/);
assert.match(forms, /Assign licence/);
assert.match(forms, /Send invitation/);
assert.match(forms, /Purchased:/);
assert.match(forms, /Assigned:/);
assert.match(forms, /Available:/);
assert.match(forms, /Available after creation/);
assert.match(forms, /Add \/ Request Licences/);
assert.match(forms, /createMode/);
assert.match(forms, /showRegion/);
assert.match(forms, /showTeam/);
assert.doesNotMatch(forms, /<SelectInput[^>]*company/i);
assert.doesNotMatch(forms, /label="Company"[\s\S]*SelectInput/);

const users = fs.readFileSync(path.join(root, 'src/pages/UsersPage.tsx'), 'utf8');
assert.match(users, /searchParams\.get\('new'\) === '1'/);
assert.match(users, /createCompanyMember/);
assert.match(users, /organisationAdmin/);
assert.match(users, /assignLicence/);
assert.match(users, /sendInvitation/);
assert.match(users, /createMode=\{editor\?\.mode === 'create'\}/);
assert.match(users, /Team is required for this reporting role/);
assert.match(users, /Region is required for Regional Manager/);
assert.match(users, /Mobile is required/);
assert.match(users, /Add user/);
assert.doesNotMatch(users, /path="\/users\/new"/);

const api = fs.readFileSync(path.join(root, 'src/api/companyApi.ts'), 'utf8');
assert.match(api, /organisationAdmin\?: boolean/);
assert.match(api, /assignLicence\?: boolean/);
assert.match(api, /sendInvitation\?: boolean/);
assert.match(api, /invitationChannel\?: InvitationChannel/);

console.log('Add User frontend checks passed');
