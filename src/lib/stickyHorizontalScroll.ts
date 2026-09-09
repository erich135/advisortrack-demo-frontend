const OVERFLOW_TOLERANCE_PX = 1;

export type RectLike = {
  top: number;
  left: number;
  width: number;
  bottom: number;
};

export type StickyBarPlacement = {
  visible: boolean;
  left: number;
  width: number;
  top: number;
};

export function isHorizontallyOverflowing(
  el: Pick<HTMLElement, 'scrollWidth' | 'clientWidth'>,
  tolerance = OVERFLOW_TOLERANCE_PX,
): boolean {
  return el.scrollWidth > el.clientWidth + tolerance;
}

export function copyScrollLeft(
  source: { scrollLeft: number },
  target: { scrollLeft: number },
): boolean {
  if (source.scrollLeft === target.scrollLeft) return false;
  target.scrollLeft = source.scrollLeft;
  return true;
}

/**
 * Place a duplicate native-looking horizontal scrollbar at the bottom of the
 * visible viewport while its table is on screen, but hide it when the table's
 * own bottom edge (and native scrollbar) is already in view.
 */
export function placeStickyHorizontalBar({
  wrapRect,
  overflowing,
  headerBottom,
  viewportBottom,
  barHeight,
}: {
  wrapRect: RectLike;
  overflowing: boolean;
  headerBottom: number;
  viewportBottom: number;
  barHeight: number;
}): StickyBarPlacement {
  const hidden: StickyBarPlacement = {
    visible: false,
    left: wrapRect.left,
    width: wrapRect.width,
    top: 0,
  };

  if (!overflowing) return hidden;

  const intersectsViewport = wrapRect.bottom > headerBottom && wrapRect.top < viewportBottom;
  if (!intersectsViewport) return hidden;

  const height = Math.max(barHeight, 1);
  const nativeScrollbarInView = wrapRect.bottom <= viewportBottom && wrapRect.bottom > headerBottom;
  if (nativeScrollbarInView) return hidden;

  const top = viewportBottom - height;
  if (top < wrapRect.top || top < headerBottom) return hidden;

  return {
    visible: true,
    left: wrapRect.left,
    width: wrapRect.width,
    top,
  };
}
