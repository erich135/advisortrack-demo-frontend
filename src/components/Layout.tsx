import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  TrendingUp,
  FolderKanban,
  Building2,
  Settings,
  BarChart3,
  UserCog,
  LogOut,
  FileText,
  History,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Avatar, ConfirmModal } from './ui';
import { users } from '../data/seed';
import { useAuth } from '../lib/useAuth';
import { useDemoSession } from '../lib/demoSession';
import {
  hasLeadershipPortalAccess,
  isCustomerExecutive,
  isCustomerPeopleManager,
} from '../lib/portalAccess';
import { isPublicDemo } from '../lib/publicDemo';
import type { DemoPublicRole } from '../api/demoApi';

const PUBLIC_DEMO_ROLES: { id: DemoPublicRole; label: string }[] = [
  { id: 'executive', label: 'Executive' },
  { id: 'regional_manager', label: 'Regional Manager' },
  { id: 'team_leader', label: 'Team Leader' },
];

interface NavEntry {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

const primaryNav: NavEntry[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/team-pipeline', label: 'Team Pipeline', icon: <FolderKanban size={18} /> },
  { to: '/advisors', label: 'Advisors', icon: <Users size={18} /> },
  { to: '/production', label: 'Production', icon: <TrendingUp size={18} /> },
];

const businessNav: NavEntry[] = [
  { to: '/subscriptions', label: 'Subscriptions', icon: <CreditCard size={18} /> },
  { to: '/invoices', label: 'Invoices', icon: <FileText size={18} /> },
  { to: '/companies', label: 'Companies', icon: <Building2 size={18} /> },
];

const adminNav: NavEntry[] = [
  { to: '/users', label: 'Users & Access', icon: <UserCog size={18} /> },
  { to: '/settings', label: 'Settings & Roles', icon: <Settings size={18} /> },
];

/** Founders-only nav (reports etc.) — shown above admin section. */
const managementNav: NavEntry[] = [
  { to: '/performance', label: 'Performance', icon: <BarChart3 size={18} /> },
  { to: '/audit', label: 'Audit', icon: <History size={18} /> },
];

function NavList({ items }: { items: NavEntry[] }) {
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/'}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          {item.icon}
          <span>{item.label}</span>
          {item.badge ? <span className="badge">{item.badge}</span> : null}
        </NavLink>
      ))}
    </>
  );
}

const titles: Record<string, { title: string; sub: string }> = {
  '/': { title: 'Dashboard', sub: 'Leadership issued-performance overview' },
  '/team-pipeline': { title: 'Team Pipeline', sub: 'Management-scoped client cases' },
  '/team-pipeline-demo': { title: 'Team Pipeline', sub: 'Seeded ASI demo data only' },
  '/advisors': { title: 'Advisors', sub: 'Everyone using AdvisorTrack' },
  '/production': { title: 'Production', sub: 'Submitted vs issued commission' },
  '/subscriptions': { title: 'Subscriptions', sub: 'Customer plans, licences & billing' },
  '/companies': { title: 'Companies', sub: 'Corporate licence pools' },
  '/invoices': { title: 'Invoices', sub: 'Billing, PDF & invoice delivery' },
  '/audit': { title: 'Audit', sub: 'Internal administrative history' },
  '/support': { title: 'Support', sub: 'Customer queries & tickets' },
  '/performance': { title: 'Performance', sub: 'Team and advisor operational performance' },
  '/reports': { title: 'Performance', sub: 'Team and advisor operational performance' },
  '/users': { title: 'Users & Access', sub: 'People in your authorised management scope' },
  '/settings': { title: 'Settings & Roles', sub: 'Team access and permissions' },
  '/not-found': { title: 'Page not found', sub: 'This address is not part of the Management Portal' },
};

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut, session, switchDemoPersona, resetDemoWorkspace } = useAuth();
  const { selectedDemoUser, resetDemoUser } = useDemoSession();
  const [switchingRole, setSwitchingRole] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const isDemoRoute = pathname.startsWith('/team-pipeline-demo');
  const prefixKey = Object.keys(titles)
    .filter((key) => key !== '/' && key !== '/not-found' && pathname.startsWith(key))
    .sort((left, right) => right.length - left.length)[0];
  const matchKey =
    pathname.startsWith('/companies/') && pathname !== '/companies'
      ? '/customer-account'
      : pathname === '/'
        ? '/'
        : prefixKey ?? '/not-found';
  const header =
    isDemoRoute && selectedDemoUser
      ? { title: 'Team Pipeline', sub: `${selectedDemoUser.name} · ${selectedDemoUser.role}` }
      : matchKey === '/customer-account'
        ? { title: 'Customer account', sub: 'Connected subscription, users, licences and invoices' }
        : titles[matchKey] ?? titles['/not-found'];

  if (isDemoRoute && !selectedDemoUser) {
    return <>{children}</>;
  }

  const me = users[0];
  const sessionName = session
    ? `${session.user.firstName ?? ''} ${session.user.lastName ?? ''}`.trim() || session.user.email
    : me.name;
  const sessionRole =
    session?.hierarchy?.label ||
    session?.role?.name ||
    (session?.isPlatformAdmin ? 'App Admin' : null) ||
    'AdvisorTrack user';
  const profile = isDemoRoute ? selectedDemoUser! : { ...me, name: sessionName };
  const profileRole = isDemoRoute ? selectedDemoUser!.role : sessionRole;
  const profileSub = isDemoRoute ? selectedDemoUser!.scopeLabel : session?.organisation?.name || sessionRole;
  const isFounderDemo = isDemoRoute && selectedDemoUser?.role === 'Founder/Admin';
  const profileAvatarColor = isDemoRoute ? (isFounderDemo ? '#8b5cf6' : '#1f6feb') : 'var(--brand)';
  const demoNav: NavEntry[] = isFounderDemo
    ? [...primaryNav, ...businessNav, ...managementNav, ...adminNav]
    : [{ to: '/team-pipeline-demo', label: 'Team Pipeline', icon: <FolderKanban size={18} /> }];
  const leadershipAccess = hasLeadershipPortalAccess(session);
  const customerAdminNav: NavEntry[] = [
    ...(isCustomerPeopleManager(session) ? [adminNav[0]] : []),
    ...(isCustomerExecutive(session) || (!isPublicDemo && session?.isPlatformAdmin) ? [adminNav[1]] : []),
  ].filter((item, index, list) => list.findIndex((entry) => entry.to === item.to) === index);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandLogo variant="on-dark" className="sidebar-logo" />
          {isPublicDemo ? <span className="demo-pill">AdvisorTrack Demo</span> : null}
        </div>

        <nav>
          {isPublicDemo ? (
            <>
              <div className="nav-section-label">Overview</div>
              <NavList items={primaryNav} />
              {customerAdminNav.length > 0 ? (
                <>
                  <div className="nav-section-label">Admin</div>
                  <NavList items={customerAdminNav} />
                </>
              ) : null}
            </>
          ) : isDemoRoute && !isFounderDemo ? (
            <>
              <div className="nav-section-label">Demo</div>
              <NavList items={demoNav} />
            </>
          ) : isDemoRoute && isFounderDemo ? (
            <>
              <div className="nav-section-label">Overview</div>
              <NavList items={primaryNav} />
              <div className="nav-section-label">Business</div>
              <NavList items={businessNav} />
              <div className="nav-section-label">Management</div>
              <NavList items={managementNav} />
              <div className="nav-section-label">Admin</div>
              <NavList items={adminNav} />
            </>
          ) : session?.isPlatformAdmin ? (
            <>
              <div className="nav-section-label">Overview</div>
              <NavList items={primaryNav} />
              <div className="nav-section-label">Business</div>
              <NavList items={businessNav} />
              <div className="nav-section-label">Management</div>
              <NavList items={managementNav} />
              <div className="nav-section-label">Admin</div>
              <NavList items={adminNav} />
            </>
          ) : leadershipAccess ? (
            <>
              <div className="nav-section-label">Overview</div>
              <NavList items={primaryNav} />
              {customerAdminNav.length > 0 ? (
                <>
                  <div className="nav-section-label">Admin</div>
                  <NavList items={customerAdminNav} />
                </>
              ) : null}
            </>
          ) : (
            <>
              <div className="nav-section-label">Overview</div>
              <NavList items={[{ to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> }]} />
            </>
          )}
        </nav>

        <div className="sidebar-foot">
          <Avatar name={profile.name} color={profileAvatarColor} size={34} />
          <div className="meta">
            <div className="n">{profile.name}</div>
            <div className="r">{profileRole}</div>
            {isDemoRoute ? <div className="r" style={{ fontSize: 11 }}>{profileSub}</div> : null}
          </div>
          <button
            onClick={() => {
              if (isDemoRoute) {
                resetDemoUser();
                navigate('/team-pipeline-demo', { replace: true });
                return;
              }
              signOut();
            }}
            title={isDemoRoute ? 'Switch demo user' : 'Sign out'}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.72)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <LogOut size={16} />
            <span style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{isDemoRoute ? 'Switch demo user' : 'Sign out'}</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h1>{header.title}</h1>
          </div>
          <div className="sub">· {header.sub}</div>
          <div className="spacer" />
          {isPublicDemo ? (
            <div className="demo-top-controls">
              <label className="demo-role-switcher">
                <span>Viewing as</span>
                <select
                  aria-label="Switch demo role"
                  disabled={switchingRole || resetting}
                  value={
                    PUBLIC_DEMO_ROLES.some((role) => role.id === session?.hierarchy?.rank)
                      ? session?.hierarchy?.rank
                      : 'executive'
                  }
                  onChange={async (event) => {
                    const next = event.target.value as DemoPublicRole;
                    if (next === session?.hierarchy?.rank) return;
                    setSwitchingRole(true);
                    try {
                      await switchDemoPersona(next);
                    } finally {
                      setSwitchingRole(false);
                    }
                  }}
                >
                  {PUBLIC_DEMO_ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="demo-reset-btn"
                disabled={switchingRole || resetting}
                onClick={() => setResetOpen(true)}
              >
                Reset Demo
              </button>
            </div>
          ) : null}
        </header>
        <div className="page" style={isDemoRoute ? { maxWidth: 'none' } : undefined}>
          {children}
        </div>
      </div>
      {isPublicDemo ? (
        <ConfirmModal
          title="Reset Demo"
          open={resetOpen}
          confirmLabel={resetting ? 'Resetting…' : 'Reset Demo'}
          cancelLabel="Cancel"
          onClose={() => {
            if (!resetting) setResetOpen(false);
          }}
          onConfirm={() => {
            if (resetting) return;
            setResetting(true);
            void resetDemoWorkspace()
              .then(() => {
                setResetOpen(false);
              })
              .finally(() => {
                setResetting(false);
              });
          }}
          message="Your current demo changes will be discarded and the original Northstar Advisory demo data will be restored. This only affects your session."
        />
      ) : null}
    </div>
  );
}
