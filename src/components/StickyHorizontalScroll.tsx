import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
  type UIEvent,
} from 'react';
import {
  copyScrollLeft,
  isHorizontallyOverflowing,
  placeStickyHorizontalBar,
} from '../lib/stickyHorizontalScroll';

type StickyHorizontalScrollProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

function headerBottomPx(): number {
  const topbar = document.querySelector('.topbar');
  if (!(topbar instanceof HTMLElement)) return 0;
  return topbar.getBoundingClientRect().bottom;
}

function viewportBottomPx(): number {
  const viewport = window.visualViewport;
  if (viewport) return viewport.offsetTop + viewport.height;
  return window.innerHeight;
}

export function StickyHorizontalScroll({ children, className, style }: StickyHorizontalScrollProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);
  const observedTableRef = useRef<Element | null>(null);
  const updateRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const bar = barRef.current;
    const spacer = spacerRef.current;
    if (!wrap || !bar || !spacer) return;

    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            updateRef.current();
          });

    const observeTable = () => {
      if (!resizeObserver) return;
      const table = wrap.querySelector('table');
      if (observedTableRef.current && observedTableRef.current !== table) {
        resizeObserver.unobserve(observedTableRef.current);
        observedTableRef.current = null;
      }
      if (table && observedTableRef.current !== table) {
        resizeObserver.observe(table);
        observedTableRef.current = table;
      }
    };

    const update = () => {
      observeTable();
      const overflowing = isHorizontallyOverflowing(wrap);
      spacer.style.width = `${wrap.scrollWidth}px`;
      bar.dataset.overflowing = overflowing ? 'true' : 'false';

      if (!overflowing) {
        bar.style.display = 'none';
        bar.dataset.visible = 'false';
        return;
      }

      bar.style.display = 'block';
      bar.style.visibility = 'hidden';
      bar.style.position = 'fixed';
      const barHeight = bar.offsetHeight || 12;
      const rect = wrap.getBoundingClientRect();
      const placement = placeStickyHorizontalBar({
        wrapRect: {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          bottom: rect.bottom,
        },
        overflowing: true,
        headerBottom: headerBottomPx(),
        viewportBottom: viewportBottomPx(),
        barHeight,
      });

      if (!placement.visible) {
        bar.style.display = 'none';
        bar.style.visibility = '';
        bar.dataset.visible = 'false';
        return;
      }

      bar.style.visibility = '';
      bar.style.display = 'block';
      bar.style.left = `${placement.left}px`;
      bar.style.width = `${placement.width}px`;
      bar.style.top = `${placement.top}px`;
      bar.style.bottom = 'auto';
      bar.style.zIndex = '4';
      bar.dataset.visible = 'true';
      if (!syncingRef.current) {
        syncingRef.current = true;
        copyScrollLeft(wrap, bar);
        syncingRef.current = false;
      }
    };

    updateRef.current = update;
    resizeObserver?.observe(wrap);
    observeTable();
    update();

    const onScrollOrResize = (event?: Event) => {
      const target = event?.target;
      if (target === wrap || target === bar) return;
      update();
    };

    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    window.visualViewport?.addEventListener('resize', onScrollOrResize);
    window.visualViewport?.addEventListener('scroll', onScrollOrResize);

    return () => {
      resizeObserver?.disconnect();
      observedTableRef.current = null;
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      window.visualViewport?.removeEventListener('resize', onScrollOrResize);
      window.visualViewport?.removeEventListener('scroll', onScrollOrResize);
    };
  }, []);

  useLayoutEffect(() => {
    updateRef.current();
  });

  const onWrapScroll = (event: UIEvent<HTMLDivElement>) => {
    const bar = barRef.current;
    if (!bar || syncingRef.current) return;
    syncingRef.current = true;
    copyScrollLeft(event.currentTarget, bar);
    syncingRef.current = false;
  };

  const onBarScroll = (event: UIEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (!wrap || syncingRef.current) return;
    syncingRef.current = true;
    copyScrollLeft(event.currentTarget, wrap);
    syncingRef.current = false;
  };

  const wrapClassName = ['table-wrap', className].filter(Boolean).join(' ');

  return (
    <div className="sticky-hscroll" style={style}>
      <div ref={wrapRef} className={wrapClassName} onScroll={onWrapScroll}>
        {children}
      </div>
      <div
        ref={barRef}
        className="sticky-hscroll-bar"
        data-testid="sticky-hscroll-bar"
        data-visible="false"
        data-overflowing="false"
        aria-hidden="true"
        onScroll={onBarScroll}
      >
        <div ref={spacerRef} className="sticky-hscroll-spacer" />
      </div>
    </div>
  );
}
