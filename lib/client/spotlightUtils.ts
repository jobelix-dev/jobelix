/**
 * Spotlight Overlay Utilities
 * 
 * Calculations for positioning spotlight overlays and popovers.
 */

export interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface PopoverPosition {
  top: number;
  left: number;
}

const SPOTLIGHT_PADDING = 8;
const POPOVER_WIDTH = 320;
const POPOVER_MARGIN = 16;
const POPOVER_GAP = 12;

/**
 * Calculate the bounding rectangle for multiple element IDs
 */
export function calculateUnionRect(elementIds: string[]): Rect | null {
  const rects = elementIds
    .map((id) => document.getElementById(id)?.getBoundingClientRect())
    .filter((rect): rect is DOMRect => !!rect);

  if (rects.length === 0) return null;

  const union = rects.reduce(
    (acc, rect) => ({
      top: Math.min(acc.top, rect.top),
      left: Math.min(acc.left, rect.left),
      right: Math.max(acc.right, rect.right),
      bottom: Math.max(acc.bottom, rect.bottom),
    }),
    {
      top: rects[0].top,
      left: rects[0].left,
      right: rects[0].right,
      bottom: rects[0].bottom,
    }
  );

  return {
    top: union.top,
    left: union.left,
    width: union.right - union.left,
    height: union.bottom - union.top,
  };
}

/**
 * Calculate spotlight position with padding
 */
export function calculateSpotlightPosition(targetRect: Rect): SpotlightPosition {
  return {
    top: Math.max(targetRect.top - SPOTLIGHT_PADDING, 8),
    left: Math.max(targetRect.left - SPOTLIGHT_PADDING, 8),
    width: targetRect.width + SPOTLIGHT_PADDING * 2,
    height: targetRect.height + SPOTLIGHT_PADDING * 2,
  };
}

/**
 * Calculate optimal popover position relative to spotlight
 */
export function calculatePopoverPosition(
  spotlight: SpotlightPosition,
  popoverHeight: number,
  viewportWidth: number,
  viewportHeight: number
): PopoverPosition {
  // Prefer below if target is in upper half of viewport
  const preferBelow = spotlight.top < viewportHeight * 0.55;

  // Initial vertical position
  const initialTop = preferBelow
    ? spotlight.top + spotlight.height + POPOVER_GAP
    : spotlight.top - POPOVER_GAP - popoverHeight;

  // Clamp to viewport bounds
  const clampedTop = Math.max(
    POPOVER_MARGIN,
    Math.min(initialTop, viewportHeight - popoverHeight - POPOVER_MARGIN)
  );

  // Initial horizontal position (align with spotlight left)
  const initialLeft = Math.min(
    Math.max(spotlight.left, POPOVER_MARGIN),
    Math.max(POPOVER_MARGIN, viewportWidth - POPOVER_WIDTH - POPOVER_MARGIN)
  );

  let effectiveTop = clampedTop;
  let effectiveLeft = initialLeft;

  // Check if popover overlaps spotlight vertically
  const overlapsSpotlight =
    effectiveTop < spotlight.top + spotlight.height + 8 &&
    effectiveTop + popoverHeight > spotlight.top - 8;

  if (overlapsSpotlight) {
    const rightSpace = viewportWidth - (spotlight.left + spotlight.width) - POPOVER_MARGIN;
    const leftSpace = spotlight.left - POPOVER_MARGIN;

    // Try positioning to the right of spotlight
    if (rightSpace >= POPOVER_WIDTH) {
      effectiveLeft = spotlight.left + spotlight.width + POPOVER_GAP;
      effectiveTop = Math.max(
        POPOVER_MARGIN,
        Math.min(spotlight.top, viewportHeight - popoverHeight - POPOVER_MARGIN)
      );
    }
    // Try positioning to the left of spotlight
    else if (leftSpace >= POPOVER_WIDTH) {
      effectiveLeft = spotlight.left - POPOVER_WIDTH - POPOVER_GAP;
      effectiveTop = Math.max(
        POPOVER_MARGIN,
        Math.min(spotlight.top, viewportHeight - popoverHeight - POPOVER_MARGIN)
      );
    }
  }

  return { top: effectiveTop, left: effectiveLeft };
}

/**
 * Wait for scroll to finish (after scrollIntoView)
 */
export function waitForScrollIdle(): Promise<void> {
  return new Promise((resolve) => {
    const supportsScrollEnd = 'onscrollend' in window;
    let settled = false;
    let stableFrames = 0;
    let lastX = window.scrollX;
    let lastY = window.scrollY;
    let rafId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (timeoutId) clearTimeout(timeoutId);
      resolve();
    };

    if (supportsScrollEnd) {
      window.addEventListener('scrollend', finish, { once: true } as AddEventListenerOptions);
      timeoutId = setTimeout(finish, 1200);
      return;
    }

    const check = () => {
      const currentX = window.scrollX;
      const currentY = window.scrollY;
      if (currentX === lastX && currentY === lastY) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
        lastX = currentX;
        lastY = currentY;
      }
      if (stableFrames >= 6) {
        finish();
        return;
      }
      rafId = requestAnimationFrame(check);
    };

    rafId = requestAnimationFrame(check);
    timeoutId = setTimeout(finish, 1200);
  });
}
