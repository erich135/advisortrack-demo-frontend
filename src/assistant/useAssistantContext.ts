import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getCompanyLicencePool } from '../api/companyApi';
import { useAuth } from '../lib/useAuth';
import { capabilitiesFromSession } from './capabilities';
import {
  buildAssistantContext,
  withLicenceFacts,
  type AssistantContext,
  type AssistantEnvironment,
  type AssistantLicencePool,
  type AssistantRouteRef,
} from './context';
import { trustedIdentityFromSession } from './sessionIdentity';

const DEBUG_KEY = 'advisortrackAssistantDebug';
const EMPTY_ROUTES: AssistantRouteRef[] = [];

function assistantDebugEnabled(): boolean {
  return Boolean(import.meta.env.DEV) && typeof localStorage !== 'undefined' && localStorage.getItem(DEBUG_KEY) === '1';
}

export function useAssistantContext(
  environment: AssistantEnvironment,
  routes: AssistantRouteRef[] = EMPTY_ROUTES,
): AssistantContext {
  const { session } = useAuth();
  const location = useLocation();
  const [pool, setPool] = useState<AssistantLicencePool | null>(null);

  const identity = useMemo(() => trustedIdentityFromSession(session), [session]);
  const capabilities = useMemo(() => capabilitiesFromSession(session, environment), [session, environment]);
  const navigation = useMemo(
    () => ({ pathname: location.pathname, search: location.search }),
    [location.pathname, location.search],
  );

  const base = useMemo(
    () =>
      buildAssistantContext({
        environment,
        identity,
        navigation,
        capabilities,
        routes,
      }),
    [environment, identity, navigation, capabilities, routes],
  );

  useEffect(() => {
    if (!base.capabilities.canViewLicences) {
      setPool(null);
      return;
    }
    let cancelled = false;
    void getCompanyLicencePool()
      .then((next) => {
        if (!cancelled) setPool(next);
      })
      .catch(() => {
        if (!cancelled) setPool(null);
      });
    return () => {
      cancelled = true;
    };
  }, [base.capabilities.canViewLicences, base.identity.companyId]);

  const context = useMemo(() => withLicenceFacts(base, pool), [base, pool]);

  useEffect(() => {
    if (!assistantDebugEnabled()) return;
    console.debug('[AdvisorTrack Assistant context]', context);
  }, [context]);

  return context;
}
