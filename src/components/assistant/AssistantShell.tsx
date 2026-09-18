import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { AssistantIcon } from './AssistantIcon';

const AssistantPanel = lazy(() => import('./AssistantPanel'));

const SEEN_KEY = 'at-assistant-launcher-seen';

export function AssistantShell({
  environment,
}: {
  environment: 'production' | 'demo';
}) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attention, setAttention] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.sessionStorage.getItem(SEEN_KEY)) return;
    setAttention(true);
    window.sessionStorage.setItem(SEEN_KEY, '1');
    const timer = window.setTimeout(() => setAttention(false), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (wasOpen.current && !open) {
      launcherRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);

  function openPanel() {
    setLoaded(true);
    setOpen(true);
  }

  return (
    <div className="assistant-root" data-testid="assistant-root">
      <button
        ref={launcherRef}
        type="button"
        className={`assistant-launcher${attention ? ' assistant-launcher-attention' : ''}`}
        aria-label="Ask AdvisorTrack"
        title="Ask AdvisorTrack"
        aria-expanded={open}
        aria-controls="assistant-panel"
        data-testid="assistant-launcher"
        hidden={open}
        onClick={openPanel}
      >
          <AssistantIcon size={60} alt="" />
        <span className="assistant-launcher-tooltip">Ask AdvisorTrack</span>
      </button>
      {loaded ? (
        <Suspense
          fallback={
            open ? <div className="assistant-panel assistant-panel-loading">Loading help…</div> : null
          }
        >
          <div hidden={!open} aria-hidden={!open}>
            <AssistantPanel environment={environment} onClose={() => setOpen(false)} />
          </div>
        </Suspense>
      ) : null}
    </div>
  );
}
