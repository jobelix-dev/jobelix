/**
 * ValidationTour Component
 *
 * Guided overlay that spotlights missing fields and provides step-by-step guidance.
 */

'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { registerFocusLock } from '@/lib/client/focusRestore';

export interface ValidationTourStep {
  id: string;
  targetId: string;
  targetIds?: string[];
  title: string;
  message: string;
  onBefore?: () => void;
}

interface ValidationTourProps {
  isOpen: boolean;
  step: ValidationTourStep | null;
  onNext: () => void;
  onBack?: () => void;
  onExit: () => void;
  nextLabel?: string;
}

type Rect = { top: number; left: number; width: number; height: number };

export default function ValidationTour({
  isOpen,
  step,
  onNext,
  onBack,
  onExit,
  nextLabel = 'Next',
}: ValidationTourProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [overlayReady, setOverlayReady] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const isOpenRef = useRef(isOpen);
  const lockActiveRef = useRef(false);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const releaseLock = useCallback(() => {
    if (!lockActiveRef.current) return;
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
    } else {
      document.body.style.overflow = '';
    }
    window.removeEventListener('wheel', preventScrollRef.current, { passive: false } as AddEventListenerOptions);
    window.removeEventListener('touchmove', preventScrollRef.current, { passive: false } as AddEventListenerOptions);
    window.removeEventListener('keydown', preventScrollKeysRef.current);
    lockActiveRef.current = false;
  }, []);

  const preventScrollRef = useRef<(event: Event) => void>(() => {});
  const preventScrollKeysRef = useRef<(event: KeyboardEvent) => void>(() => {});

  const acquireLock = useCallback(() => {
    if (lockActiveRef.current) return;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const preventScroll = (event: Event) => {
      event.preventDefault();
    };

    const preventScrollKeys = (event: KeyboardEvent) => {
      const blockedKeys = [
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
        ' ',
        'Spacebar',
      ];
      const target = event.target as HTMLElement | null;
      const isEditable = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );
      if (blockedKeys.includes(event.key) && !isEditable) {
        event.preventDefault();
      }
    };

    preventScrollRef.current = preventScroll;
    preventScrollKeysRef.current = preventScrollKeys;

    window.addEventListener('wheel', preventScroll, { passive: false });
    window.addEventListener('touchmove', preventScroll, { passive: false });
    window.addEventListener('keydown', preventScrollKeys);
    lockActiveRef.current = true;
  }, []);

  const updateRect = useCallback(() => {
    if (!step) return;
    const ids = step.targetIds && step.targetIds.length > 0 ? step.targetIds : [step.targetId];
    const rects = ids
      .map((id) => document.getElementById(id)?.getBoundingClientRect())
      .filter((rect): rect is DOMRect => !!rect);
    if (rects.length === 0) {
      setTargetRect(null);
      return;
    }
    const union = rects.reduce(
      (acc, rect) => {
        const top = Math.min(acc.top, rect.top);
        const left = Math.min(acc.left, rect.left);
        const right = Math.max(acc.right, rect.right);
        const bottom = Math.max(acc.bottom, rect.bottom);
        return { top, left, right, bottom };
      },
      {
        top: rects[0].top,
        left: rects[0].left,
        right: rects[0].right,
        bottom: rects[0].bottom,
      }
    );
    setTargetRect({
      top: union.top,
      left: union.left,
      width: union.right - union.left,
      height: union.bottom - union.top,
    });
  }, [step]);

  useLayoutEffect(() => {
    if (!isOpen || !step || !overlayReady) return;
    updateRect();
    const handle = () => updateRect();
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
    };
  }, [isOpen, step, updateRect]);

  useEffect(() => {
    if (!isOpen || !step) {
      setOverlayReady(false);
      return;
    }

    setOverlayReady(false);
    step.onBefore?.();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let rafId: number | null = null;

    const waitForScrollIdle = () => new Promise<void>((resolve) => {
      const supportsScrollEnd = 'onscrollend' in window;
      let settled = false;
      let stableFrames = 0;
      let lastX = window.scrollX;
      let lastY = window.scrollY;

      const finish = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      if (supportsScrollEnd) {
        const handler = () => finish();
        window.addEventListener('scrollend', handler, { once: true } as AddEventListenerOptions);
        timeoutId = setTimeout(() => finish(), 1200);
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
      timeoutId = setTimeout(() => finish(), 1200);
    });

    let attempt = 0;

    const begin = async () => {
      const ids = step.targetIds && step.targetIds.length > 0 ? step.targetIds : [step.targetId];
      const target = ids.map((id) => document.getElementById(id)).find((node) => !!node) as HTMLElement | undefined;
      if (!target) {
        attempt += 1;
        if (attempt < 6) {
          timeoutId = setTimeout(begin, 120);
        }
        return;
      }

      const originalOverflow = document.body.style.overflow;
      if (originalOverflow === 'hidden') {
        document.body.style.overflow = previousOverflow.current ?? '';
      }

      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      await waitForScrollIdle();
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (document.body.style.overflow !== 'hidden') {
        document.body.style.overflow = 'hidden';
      }

      const focusTarget = target.matches('input, select, textarea, button, [tabindex]')
        ? target
        : (target.querySelector('input, select, textarea, button, [tabindex]') as HTMLElement | null);
      focusTarget?.focus({ preventScroll: true });
      updateRect();
      setOverlayReady(true);
    };

    timeoutId = setTimeout(begin, 60);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isOpen, step, updateRect]);

  useEffect(() => {
    if (isOpen) {
      acquireLock();
    } else {
      releaseLock();
    }
    return () => releaseLock();
  }, [isOpen, acquireLock, releaseLock]);

  useEffect(() => {
    return registerFocusLock({
      acquire: acquireLock,
      release: releaseLock,
      isActive: () => isOpenRef.current,
    });
  }, [acquireLock, releaseLock]);

  if (!isOpen || !step || !overlayReady || !targetRect) return null;

  const padding = 8;
  const spotlight = {
    top: Math.max(targetRect.top - padding, 8),
    left: Math.max(targetRect.left - padding, 8),
    width: targetRect.width + padding * 2,
    height: targetRect.height + padding * 2,
  };

  const popoverWidth = 320;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  const preferBelow = targetRect.top < viewportHeight * 0.55;
  const popoverHeight = popoverRef.current?.offsetHeight || 160;
  const popoverTop = preferBelow
    ? spotlight.top + spotlight.height + 12
    : spotlight.top - 12 - popoverHeight;
  const popoverLeft = Math.min(
    Math.max(spotlight.left, 16),
    Math.max(16, viewportWidth - popoverWidth - 16)
  );

  const fallbackTop = Math.max(16, Math.min(popoverTop, viewportHeight - popoverHeight - 16));
  let effectiveTop = fallbackTop;
  let effectiveLeft = popoverLeft;

  const overlapsSpotlight =
    effectiveTop < spotlight.top + spotlight.height + 8 &&
    effectiveTop + popoverHeight > spotlight.top - 8;
  if (overlapsSpotlight) {
    const rightSpace = viewportWidth - (spotlight.left + spotlight.width) - 16;
    const leftSpace = spotlight.left - 16;
    if (rightSpace >= popoverWidth) {
      effectiveLeft = spotlight.left + spotlight.width + 12;
      effectiveTop = Math.max(16, Math.min(spotlight.top, viewportHeight - popoverHeight - 16));
    } else if (leftSpace >= popoverWidth) {
      effectiveLeft = spotlight.left - popoverWidth - 12;
      effectiveTop = Math.max(16, Math.min(spotlight.top, viewportHeight - popoverHeight - 16));
    }
  }

  const content = (
    <div
      className="fixed inset-0 z-[1000] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* Dimming layers around the spotlight (clear center area) */}
      <div
        className="absolute left-0 right-0 top-0 bg-black/55 pointer-events-auto"
        style={{ height: Math.max(0, spotlight.top) }}
      />
      <div
        className="absolute left-0 bg-black/55 pointer-events-auto"
        style={{
          top: spotlight.top,
          height: spotlight.height,
          width: Math.max(0, spotlight.left),
        }}
      />
      <div
        className="absolute bg-black/55 pointer-events-auto"
        style={{
          top: spotlight.top,
          left: spotlight.left + spotlight.width,
          height: spotlight.height,
          width: Math.max(0, viewportWidth - (spotlight.left + spotlight.width)),
        }}
      />
      <div
        className="absolute left-0 right-0 bg-black/55 pointer-events-auto"
        style={{
          top: spotlight.top + spotlight.height,
          height: Math.max(0, viewportHeight - (spotlight.top + spotlight.height)),
        }}
      />

      {/* Spotlight outline */}
      <div
        className="absolute rounded-xl ring-2 ring-warning/80 pointer-events-none"
        style={{
          top: spotlight.top,
          left: spotlight.left,
          width: spotlight.width,
          height: spotlight.height,
        }}
      />

      <div
        ref={popoverRef}
        className="absolute z-[1001] w-[320px] rounded-xl border border-warning/40 bg-background shadow-xl pointer-events-auto"
        style={{ top: effectiveTop, left: effectiveLeft }}
      >
        <div className="flex items-start justify-between px-4 pt-4">
          <div>
            <h4 className="text-sm font-semibold text-default">{step.title}</h4>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="p-1 rounded hover:bg-primary-subtle transition-colors"
            aria-label="Exit validation tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 text-sm text-muted">{step.message}</div>
        <div className="flex items-center justify-between px-4 pb-4">
          <button
            type="button"
            onClick={onBack}
            disabled={!onBack}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-default disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-1 rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            {nextLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
