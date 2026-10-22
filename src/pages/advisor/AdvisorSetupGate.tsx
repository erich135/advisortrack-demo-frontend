import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAdvisorProfile } from '../../api/advisorApi';

export default function AdvisorSetupGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [state, setState] = useState<'loading' | 'setup' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    void getAdvisorProfile()
      .then((profile) => {
        if (!cancelled) setState(profile.financial.needsSetup ? 'setup' : 'ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (state === 'loading') {
    return <p className="advisor-home-muted">Checking setup…</p>;
  }
  if (state === 'setup' && pathname !== '/advisor/setup') {
    return <Navigate to="/advisor/setup" replace />;
  }
  if (state === 'ready' && pathname === '/advisor/setup') {
    return <Navigate to="/advisor" replace />;
  }
  return children;
}
