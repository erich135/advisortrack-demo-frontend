import { useCallback, useSyncExternalStore } from 'react';
import {
  ApiError,
  clearStoredToken,
  getStoredToken,
  setStoredToken,
  setUnauthorizedHandler,
} from '../api/apiClient';
import { getMe, login as loginRequest, type AuthUser } from '../api/authApi';
import { enterDemo, switchDemoRole, resetDemo, type DemoPublicRole } from '../api/demoApi';
import { getCompanyMe, type CompanyMe } from '../api/companyApi';
import { getSubscriptionMe, type SubscriptionMe } from '../api/subscriptionApi';

const SESSION_KEY = 'at_session';

export type AuthSession = {
  user: AuthUser;
  subscription: SubscriptionMe | null;
  organisation: AuthUser['organisation'] | null;
  company: CompanyMe['company'] | null;
  role: CompanyMe['role'] | null;
  permissions: string[];
  reportsToUserId: string | null;
  isPlatformAdmin: boolean;
  hierarchy: CompanyMe['hierarchy'] | null;
};

type AuthSnapshot = {
  status: 'booting' | 'ready';
  session: AuthSession | null;
};

type Listener = () => void;

const listeners = new Set<Listener>();

let snapshot: AuthSnapshot = {
  status: 'booting',
  session: null,
};

let bootPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: AuthSnapshot) {
  snapshot = next;
  notify();
}

function readStoredSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function writeStoredSession(session: AuthSession | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function clearLocalSession() {
  clearStoredToken();
  writeStoredSession(null);
  setSnapshot({ status: 'ready', session: null });
}

function toSession(
  user: AuthUser,
  subscription: SubscriptionMe | null,
  companyMe: CompanyMe | null,
): AuthSession {
  return {
    user,
    subscription,
    organisation: user.organisation ?? companyMe?.company ?? null,
    company: companyMe?.company ?? user.organisation ?? null,
    role: companyMe?.role ?? null,
    permissions: companyMe?.permissions ?? [],
    reportsToUserId: companyMe?.reportsToUserId ?? null,
    isPlatformAdmin: companyMe?.isPlatformAdmin ?? false,
    hierarchy: companyMe?.hierarchy ?? null,
  };
}

async function loadPostLoginSession(userFromLogin?: AuthUser): Promise<AuthSession> {
  const [userResult, subscriptionResult, companyResult] = await Promise.allSettled([
    getMe(),
    getSubscriptionMe(),
    getCompanyMe(),
  ]);

  if (userResult.status === 'rejected') {
    throw userResult.reason;
  }

  const user = userResult.value ?? userFromLogin!;
  const subscription = subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null;
  const companyMe = companyResult.status === 'fulfilled' ? companyResult.value : null;

  return toSession(user, subscription, companyMe);
}

async function boot() {
  const token = getStoredToken();
  if (!token) {
    writeStoredSession(null);
    setSnapshot({ status: 'ready', session: null });
    return;
  }

  const cached = readStoredSession();
  if (cached) {
    setSnapshot({ status: 'ready', session: cached });
  }

  try {
    const session = await loadPostLoginSession(cached?.user);
    writeStoredSession(session);
    setSnapshot({ status: 'ready', session });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.code === 'UNAUTHORIZED' || error.code === 'TOKEN_EXPIRED' || error.code === 'INVALID_TOKEN' || error.code === 'DEMO_SESSION_EXPIRED' || error.code === 'DEMO_SESSION_REQUIRED')) {
      clearLocalSession();
      return;
    }
    if (cached) {
      setSnapshot({ status: 'ready', session: cached });
      return;
    }
    clearLocalSession();
  }
}

function ensureBooted() {
  if (!bootPromise) {
    bootPromise = boot().finally(() => {
      if (snapshot.status === 'booting') {
        setSnapshot({ status: 'ready', session: snapshot.session });
      }
    });
  }
  return bootPromise;
}

setUnauthorizedHandler(() => {
  clearLocalSession();
});

ensureBooted();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot(): AuthSnapshot {
  return { status: 'ready', session: null };
}

export function toAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'EMAIL_NOT_VERIFIED') {
      return 'Your email is not verified yet. Check your inbox for the verification code, then try again.';
    }
    if (error.code === 'DEMO_SESSION_EXPIRED' || error.code === 'DEMO_SESSION_REQUIRED') {
      return 'Your demo session has ended. Choose a management role to start again.';
    }
    if (error.code === 'INVALID_CREDENTIALS') {
      return 'Invalid email or password.';
    }
    if (error.code === 'NETWORK_ERROR') {
      return error.message;
    }
    if (error.status === 401 || error.code === 'UNAUTHORIZED' || error.code === 'TOKEN_EXPIRED' || error.code === 'INVALID_TOKEN') {
      return 'Your session has expired. Please sign in again.';
    }
    return error.message || 'Sign-in failed. Please try again.';
  }
  return 'Sign-in failed. Please try again.';
}

export function useAuth() {
  const { status, session } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await loginRequest(email.trim(), password);
      setStoredToken(result.token);
      const next = await loadPostLoginSession(result.user);
      writeStoredSession(next);
      setSnapshot({ status: 'ready', session: next });
      return { ok: true as const };
    } catch (error) {
      clearStoredToken();
      writeStoredSession(null);
      setSnapshot({ status: 'ready', session: null });
      return { ok: false as const, error: toAuthErrorMessage(error) };
    }
  }, []);

  const enterDemoRole = useCallback(async (role: DemoPublicRole) => {
    try {
      const result = await enterDemo(role);
      setStoredToken(result.token);
      const next = await loadPostLoginSession(result.user);
      writeStoredSession(next);
      setSnapshot({ status: 'ready', session: next });
      return { ok: true as const };
    } catch (error) {
      clearStoredToken();
      writeStoredSession(null);
      setSnapshot({ status: 'ready', session: null });
      return { ok: false as const, error: toAuthErrorMessage(error) };
    }
  }, []);

  const switchDemoPersona = useCallback(async (role: DemoPublicRole) => {
    const result = await switchDemoRole(role);
    setStoredToken(result.token);
    const next = await loadPostLoginSession(result.user);
    writeStoredSession(next);
    setSnapshot({ status: 'ready', session: next });
    return { ok: true as const };
  }, []);

  const resetDemoWorkspace = useCallback(async () => {
    const result = await resetDemo();
    setStoredToken(result.token);
    const next = await loadPostLoginSession(result.user);
    writeStoredSession(next);
    setSnapshot({ status: 'ready', session: next });
    return { ok: true as const };
  }, []);

  const signOut = useCallback(() => {
    clearLocalSession();
  }, []);

  return {
    status,
    authed: Boolean(session),
    session,
    login,
    enterDemoRole,
    switchDemoPersona,
    resetDemoWorkspace,
    signOut,
  };
}
