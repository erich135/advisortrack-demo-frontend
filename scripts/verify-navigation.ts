/**
 * Task 16: demo customer sidebar structure, role visibility, forbidden internal links.
 * Run: npm run test:navigation
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import type { AuthSession } from '../src/lib/useAuth';
import { buildCustomerNav, flattenNavTos, navItemIsActive } from '../src/lib/portalNavigation';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8');

function session(partial: {
  rank?: 'executive' | 'regional_manager' | 'team_leader' | 'financial_advisor';
  portalAccess?: boolean;
  isOrganisationAdmin?: boolean;
  isPlatformAdmin?: boolean;
  canViewRegions?: boolean;
  canViewTeams?: boolean;
  permissions?: string[];
}): AuthSession {
  const rank = partial.rank ?? 'executive';
  return {
    isPlatformAdmin: Boolean(partial.isPlatformAdmin),
    isOrganisationAdmin: Boolean(partial.isOrganisationAdmin),
    permissions: partial.permissions ?? [],
    hierarchy: {
      rank,
      label: rank,
      comparisonRank: null,
      comparisonRoleLabel: null,
      portalAccess: partial.portalAccess ?? rank !== 'financial_advisor',
      scopeKind: rank === 'executive' ? 'organisation' : rank === 'regional_manager' ? 'region' : 'team',
      structureAccess: {
        canViewRegions: Boolean(partial.canViewRegions),
        canManageRegions: Boolean(partial.canViewRegions),
        canViewTeams: Boolean(partial.canViewTeams),
        canManageTeams: Boolean(partial.canViewTeams),
      },
    },
  } as AuthSession;
}

function itemLabels(sections: ReturnType<typeof buildCustomerNav>): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.label));
}

function assertNoDuplicates(sections: ReturnType<typeof buildCustomerNav>, label: string) {
  const tos = flattenNavTos(sections);
  assert.equal(tos.length, new Set(tos).size, `${label} has duplicate routes: ${tos.join(', ')}`);
}

const exec = session({
  rank: 'executive',
  isOrganisationAdmin: true,
  canViewRegions: true,
  canViewTeams: true,
});
const rm = session({ rank: 'regional_manager', canViewRegions: true, canViewTeams: true });
const tl = session({ rank: 'team_leader', canViewTeams: true });
const orgAdminFa = session({
  rank: 'financial_advisor',
  portalAccess: false,
  isOrganisationAdmin: true,
});
const fa = session({ rank: 'financial_advisor', portalAccess: false });

const execNav = buildCustomerNav(exec, 'demo');
const rmNav = buildCustomerNav(rm, 'demo');
const tlNav = buildCustomerNav(tl, 'demo');
const orgAdminNav = buildCustomerNav(orgAdminFa, 'demo');
const faNav = buildCustomerNav(fa, 'demo');

assertNoDuplicates(execNav, 'demo executive');
assertNoDuplicates(rmNav, 'demo rm');
assertNoDuplicates(tlNav, 'demo tl');
assertNoDuplicates(orgAdminNav, 'demo org-admin-fa');
assertNoDuplicates(faNav, 'demo fa');

assert.deepEqual(
  execNav.map((section) => section.id),
  ['overview', 'management', 'organisation', 'account'],
);
assert.deepEqual(itemLabels(execNav.filter((section) => section.id === 'overview')), [
  'Dashboard',
  'Team Pipeline',
  'Advisors',
  'Production',
]);
assert.deepEqual(itemLabels(execNav.filter((section) => section.id === 'management')), [
  'Performance',
  'Audit',
]);
assert.deepEqual(itemLabels(execNav.filter((section) => section.id === 'organisation')), [
  'Users & Access',
  'Regions & Teams',
  'Licences',
  'Bulk Import',
  'Settings & Roles',
]);
assert.deepEqual(itemLabels(execNav.filter((section) => section.id === 'account')), [
  'Subscription',
  'Invoices',
  'Company Details',
]);

const forbidden = [
  '/enterprise-customers',
  '/licence-requests',
  '/engineering/changelog',
  '/subscriptions',
];
for (const route of forbidden) {
  assert.equal(flattenNavTos(execNav).includes(route), false, `demo exec must not list ${route}`);
  assert.equal(flattenNavTos(rmNav).includes(route), false, `demo rm must not list ${route}`);
  assert.equal(flattenNavTos(tlNav).includes(route), false, `demo tl must not list ${route}`);
}

const rmItems = itemLabels(rmNav);
assert.ok(rmItems.includes('Performance'));
assert.ok(rmItems.includes('Audit'));
assert.ok(rmItems.includes('Users & Access'));
assert.ok(rmItems.includes('Licences'));
assert.equal(rmItems.includes('Subscription'), false);
assert.equal(rmItems.includes('Invoices'), false);
assert.equal(rmItems.includes('Company Details'), false);
assert.equal(rmItems.includes('Bulk Import'), false);
assert.equal(rmItems.includes('Settings & Roles'), false);

const tlItems = itemLabels(tlNav);
assert.ok(tlItems.includes('Performance'));
assert.equal(tlItems.includes('Audit'), false);
assert.ok(tlItems.includes('Users & Access'));
assert.equal(tlItems.includes('Regions & Teams'), false);
assert.equal(tlItems.includes('Subscription'), false);
assert.equal(tlItems.includes('Company Details'), false);

assert.deepEqual(
  orgAdminNav.find((section) => section.id === 'overview')?.items.map((item) => item.to),
  ['/'],
);
assert.equal(itemLabels(orgAdminNav).includes('Team Pipeline'), false);
assert.equal(itemLabels(orgAdminNav).includes('Performance'), false);
assert.deepEqual(itemLabels(faNav), ['Dashboard']);

assert.equal(navItemIsActive({ to: '/', label: 'Dashboard' }, '/', ''), true);
assert.equal(
  navItemIsActive({ to: '/users', label: 'Users & Access', highlight: 'users' }, '/users', '?tab=regions'),
  false,
);
assert.equal(
  navItemIsActive({ to: '/users?tab=regions', label: 'Regions & Teams', highlight: 'regions' }, '/users', '?tab=teams'),
  true,
);
assert.equal(navItemIsActive({ to: '/subscription', label: 'Subscription' }, '/subscriptions', ''), false);

const layout = src('src/components/Layout.tsx');
assert.match(layout, /buildCustomerNav\(session, 'demo'\)/);
assert.match(layout, /demo-pill/);
assert.match(layout, /Reset Demo/);
assert.match(layout, /Viewing as/);
assert.match(layout, /navItemIsActive/);
assert.doesNotMatch(layout, /customerBusinessNav/);
assert.doesNotMatch(layout, /Enterprise Customers|Enterprise customers/);
assert.doesNotMatch(layout, /Licence Requests|Licence requests/);
assert.doesNotMatch(layout, /Change Log/);
assert.doesNotMatch(layout, /Platform \/ Internal/);
assert.doesNotMatch(layout, /buildPlatformNav/);
assert.doesNotMatch(layout, /<select[^>]*company/i);

const app = src('src/App.tsx');
assert.doesNotMatch(app, /EnterpriseCustomersPage|LicenceRequestsPage|EngineeringChangelogPage/);
for (const route of ['/users', '/licences', '/bulk-import', '/subscription', '/invoices', '/companies']) {
  assert.match(app, new RegExp(`path="${route}"`));
}

const usersPage = src('src/pages/UsersPage.tsx');
assert.match(usersPage, /parseUsersTab/);
assert.match(usersPage, /selectTab\('regions'\)/);

console.log('Demo navigation checks passed');
