import type { AuthSession } from './useAuth';
import {
  canBulkImportMembers,
  canViewCompanyInvoices,
  canViewCompanySubscription,
  canViewRegionsAndTeams,
  hasLeadershipPortalAccess,
  hasOrganisationAdminAccess,
  isCustomerAuditViewer,
  isCustomerExecutive,
  isCustomerPeopleManager,
  isOrganisationAdmin,
} from './portalAccess';

/**
 * Customer sidebar IA — keep in parity with Advisor-Track-Dashboard.
 * Demo adds Management (Performance/Audit) and Company Details; never platform/internal.
 */
export type PortalNavHighlight = 'default' | 'users' | 'regions';

export type PortalNavItem = {
  to: string;
  label: string;
  highlight?: PortalNavHighlight;
};

export type PortalNavSection = {
  id: string;
  label: string;
  items: PortalNavItem[];
};

export type CustomerNavVariant = 'production' | 'demo';

const overviewLeadership: PortalNavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/team-pipeline', label: 'Team Pipeline' },
  { to: '/advisors', label: 'Advisors' },
  { to: '/production', label: 'Production' },
];

const overviewDashboardOnly: PortalNavItem[] = [{ to: '/', label: 'Dashboard' }];

function section(id: string, label: string, items: PortalNavItem[]): PortalNavSection | null {
  if (items.length === 0) return null;
  return { id, label, items };
}

export function navItemIsActive(item: PortalNavItem, pathname: string, search = ''): boolean {
  const query = search.startsWith('?') ? search.slice(1) : search;
  const tab = new URLSearchParams(query).get('tab');
  const structureTab = tab === 'regions' || tab === 'teams';
  if (item.highlight === 'users') {
    return pathname === '/users' && !structureTab;
  }
  if (item.highlight === 'regions') {
    return pathname === '/users' && structureTab;
  }
  const path = item.to.split('?')[0] || '/';
  if (path === '/') return pathname === '/';
  if (path === '/companies') {
    return pathname === '/companies' || pathname.startsWith('/companies/');
  }
  return pathname === path;
}

export function flattenNavTos(sections: PortalNavSection[]): string[] {
  return sections.flatMap((entry) => entry.items.map((item) => item.to));
}

/** Customer-facing groups. Do not include platform/internal routes. */
export function buildCustomerNav(
  session: AuthSession | null,
  variant: CustomerNavVariant,
): PortalNavSection[] {
  const leadership = hasLeadershipPortalAccess(session);
  const organisationAccess = hasOrganisationAdminAccess(session);
  const orgAdminOnly = isOrganisationAdmin(session) && !leadership && !session?.isPlatformAdmin;
  const peopleManager = isCustomerPeopleManager(session) || orgAdminOnly;
  const executive = isCustomerExecutive(session);

  const overview = section(
    'overview',
    'Overview',
    leadership ? overviewLeadership : overviewDashboardOnly,
  );

  const organisationItems: PortalNavItem[] = [];
  if (peopleManager) {
    organisationItems.push({ to: '/users', label: 'Users & Access', highlight: 'users' });
  }
  if (canViewRegionsAndTeams(session)) {
    organisationItems.push({
      to: '/users?tab=regions',
      label: 'Regions & Teams',
      highlight: 'regions',
    });
  }
  if (organisationAccess) {
    organisationItems.push({ to: '/licences', label: 'Licences' });
  }
  if (canBulkImportMembers(session) && !session?.isPlatformAdmin) {
    organisationItems.push({ to: '/bulk-import', label: 'Bulk Import' });
  }
  if (executive) {
    organisationItems.push({ to: '/settings', label: 'Settings & Roles' });
  }

  const accountItems: PortalNavItem[] = [];
  if (canViewCompanySubscription(session) && !session?.isPlatformAdmin) {
    accountItems.push({ to: '/subscription', label: 'Subscription' });
  }
  if (canViewCompanyInvoices(session) && !session?.isPlatformAdmin) {
    accountItems.push({ to: '/invoices', label: 'Invoices' });
  }
  if (variant === 'demo' && executive) {
    accountItems.push({ to: '/companies', label: 'Company Details' });
  }

  const managementItems: PortalNavItem[] = [];
  if (variant === 'demo' && leadership) {
    managementItems.push({ to: '/performance', label: 'Performance' });
  }
  if (variant === 'demo' && isCustomerAuditViewer(session)) {
    managementItems.push({ to: '/audit', label: 'Audit' });
  }

  return [
    overview,
    section('management', 'Management', managementItems),
    section('organisation', 'Organisation', organisationItems),
    section('account', 'Account', accountItems),
  ].filter((entry): entry is PortalNavSection => Boolean(entry));
}
