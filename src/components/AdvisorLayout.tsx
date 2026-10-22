import { useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  CreditCard,
  Home,
  LogOut,
  MoreHorizontal,
  SlidersHorizontal,
  Target,
  TrendingUp,
  UserRound,
  Users,
  Workflow,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { AssistantShell } from './assistant/AssistantShell';
import { sessionCompanyName } from '../lib/companyContext';
import { useAuth } from '../lib/useAuth';

const PRIMARY_NAV = [
  { to: '/advisor', label: 'Home', icon: Home },
  { to: '/advisor/contacts', label: 'Contacts', icon: Users },
  { to: '/advisor/activities', label: 'Activities', icon: CalendarDays },
  { to: '/advisor/pipeline', label: 'Pipeline', icon: Workflow },
  { to: '/advisor/production', label: 'Production', icon: TrendingUp },
] as const;

const MORE_NAV = [
  { to: '/advisor/planning', label: 'Planning & Targets', icon: Target },
  { to: '/advisor/profile', label: 'Profile', icon: UserRound },
  { to: '/advisor/settings', label: 'General Settings', icon: SlidersHorizontal },
  { to: '/advisor/subscription', label: 'Subscription / Plan', icon: CreditCard },
] as const;

const TITLES: Record<string, { title: string; sub: string }> = {
  '/advisor': { title: 'Home', sub: 'Your book of business' },
  '/advisor/contacts': { title: 'Contacts', sub: 'People in your book' },
  '/advisor/activities': { title: 'Activities', sub: 'Follow-ups and next actions' },
  '/advisor/pipeline': { title: 'Pipeline', sub: 'Your cases' },
  '/advisor/production': { title: 'Production', sub: 'Your submitted and issued work' },
  '/advisor/planning': { title: 'Planning & Targets', sub: 'Goals for your book' },
  '/advisor/profile': { title: 'Profile', sub: 'Your advisor profile' },
  '/advisor/settings': { title: 'General Settings', sub: 'How your book is calculated' },
  '/advisor/subscription': { title: 'Subscription / Plan', sub: 'Your AdvisorTrack plan' },
  '/advisor/setup': { title: 'Setup', sub: 'Finish setting up your workspace' },
};

function headerFor(pathname: string): { title: string; sub: string } {
  if (pathname.startsWith('/advisor/contacts')) return TITLES['/advisor/contacts'];
  if (pathname.startsWith('/advisor/activities')) return TITLES['/advisor/activities'];
  if (pathname.startsWith('/advisor/cases')) {
    return { title: 'Case', sub: 'Your advice journey' };
  }
  return TITLES[pathname] ?? { title: 'Advisor Workspace', sub: 'Your book of business' };
}

function isPrimaryActive(to: string, pathname: string): boolean {
  if (to === '/advisor') return pathname === '/advisor';
  if (to === '/advisor/pipeline') {
    return pathname === '/advisor/pipeline' || pathname.startsWith('/advisor/cases/');
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavItems({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { pathname } = useLocation();
  return (
    <>
      {PRIMARY_NAV.map((item) => {
        const Icon = item.icon;
        const active = isPrimaryActive(item.to, pathname);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`advisor-nav-item${active ? ' is-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={onNavigate}
          >
            <Icon size={22} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

function MoreMenu({
  open,
  onClose,
  extra,
}: {
  open: boolean;
  onClose: () => void;
  extra?: ReactNode;
}) {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  if (!open) return null;
  return (
    <div className="advisor-more-menu" role="menu" data-testid="advisor-more-menu">
      {MORE_NAV.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            role="menuitem"
            className={active ? 'is-active' : undefined}
            onClick={onClose}
          >
            <Icon size={16} />
            {item.label}
          </Link>
        );
      })}
      {extra}
      <button type="button" role="menuitem" onClick={() => signOut()}>
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
}

export default function AdvisorLayout({ chrome }: { chrome?: ReactNode }) {
  const { pathname } = useLocation();
  const { session } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const header = headerFor(pathname);
  const moreActive = MORE_NAV.some((item) => item.to === pathname) || pathname === '/advisor/setup';
  const companyName = sessionCompanyName(session);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  return (
    <div className="advisor-shell" data-testid="advisor-shell">
      <aside className="advisor-rail" aria-label="Advisor navigation">
        <div className="advisor-rail-brand">
          <BrandLogo variant="on-light" className="advisor-rail-logo" />
        </div>
        <nav className="advisor-rail-nav">
          <NavItems />
        </nav>
        <div className="advisor-more">
          <button
            type="button"
            className={`advisor-more-toggle${moreActive || moreOpen ? ' is-active' : ''}`}
            aria-expanded={moreOpen}
            aria-label="More"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </button>
          <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
        </div>
      </aside>

      <div className="advisor-stage">
        <header className="advisor-topbar">
          <div>
            <h1>{header.title}</h1>
            <div className="advisor-topbar-sub">{header.sub}</div>
          </div>
          <div className="advisor-topbar-spacer" />
          {chrome}
          <WorkspaceSwitcher />
          {companyName ? <div className="advisor-topbar-sub">{companyName}</div> : null}
        </header>
        <main className="advisor-page">
          <Outlet />
        </main>
      </div>

      <nav className="advisor-bottom-nav" aria-label="Advisor navigation">
        <NavItems onNavigate={() => setMoreOpen(false)} />
        <div className="advisor-more">
          <button
            type="button"
            className={`advisor-more-toggle${moreActive || moreOpen ? ' is-active' : ''}`}
            aria-expanded={moreOpen}
            aria-label="More"
            onClick={() => setMoreOpen((open) => !open)}
          >
            <MoreHorizontal size={22} />
            <span>More</span>
          </button>
          <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
        </div>
      </nav>
      <AssistantShell environment="production" />
    </div>
  );
}
