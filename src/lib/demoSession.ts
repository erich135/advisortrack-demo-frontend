import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { demoUsers } from '../data/demoTeamPipelineData';

const STORAGE_KEY = 'at_demo_user_id';

type Listener = () => void;

const listeners = new Set<Listener>();

function readStoredDemoUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  listeners.forEach((listener) => listener());
}

export function setDemoUserId(id: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore storage failures in demo mode.
  }
  notify();
}

export function clearDemoUserId() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in demo mode.
  }
  notify();
}

export function useDemoSession() {
  const demoUserId = useSyncExternalStore(subscribe, readStoredDemoUserId, () => null);
  const selectedDemoUser = useMemo(
    () => demoUsers.find((user) => user.id === demoUserId && user.role !== 'Advisor' && user.role !== 'Founder/Admin') ?? null,
    [demoUserId],
  );

  const selectDemoUser = useCallback((id: string) => setDemoUserId(id), []);
  const resetDemoUser = useCallback(() => clearDemoUserId(), []);

  return {
    demoUserId,
    selectedDemoUser,
    selectDemoUser,
    resetDemoUser,
  };
}
