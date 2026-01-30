/**
 * ValidationTour Component
 *
 * Guided overlay that spotlights missing fields and provides step-by-step guidance.
 */

'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { useScrollLock } from '@/app/hooks';
import {
  calculateUnionRect,
  calculateSpotlightPosition,
  calculatePopoverPosition,
  waitForScrollIdle,
  type Rect,
  type SpotlightPosition,
} from '@/lib/client/spotlightUtils';

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

  const { previousOverflow } = useScrollLock({ isActive: isOpen });

  const updateRect = useCallback(() => {
    if (!step) return;
    const ids = step.targetIds && step.targetIds.length > 0 ? step.targetIds : [step.targetId];
    const rect = calculateUnionRect(ids);
    setTargetRect(rect);
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
  }, [isOpen, step, overlayReady, updateRect]);

  useEffect(() => {
    if (!isOpen || !step) {
      setOverlayReady(false);
      return;
    }

    setOverlayReady(false);
    step.onBefore?.();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
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
    };
  }, [isOpen, step, updateRect, previousOverflow]);

  if (!isOpen || !step || !overlayReady || !targetRect) return null;

  const spotlight = calculateSpotlightPosition(targetRect);
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
  const popoverHeight = popoverRef.current?.offsetHeight || 160;
  const popoverPos = calculatePopoverPosition(spotlight, popoverHeight, viewportWidth, viewportHeight);

  const content = (
    <div
      className="fixed inset-0 z-[1000] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    >
      <DimmingOverlay spotlight={spotlight} viewportWidth={viewportWidth} viewportHeight={viewportHeight} />
      <SpotlightOutline spotlight={spotlight} />
      <TourPopover
        ref={popoverRef}
        step={step}
        position={popoverPos}
        nextLabel={nextLabel}
        onBack={onBack}
        onNext={onNext}
        onExit={onExit}
      />
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

// --- Sub-components ---

interface DimmingOverlayProps {
  spotlight: SpotlightPosition;
  viewportWidth: number;
  viewportHeight: number;
}

function DimmingOverlay({ spotlight, viewportWidth, viewportHeight }: DimmingOverlayProps) {
  return (
    <>
      {/* Top */}
      <div
        className="absolute left-0 right-0 top-0 bg-black/55 pointer-events-auto"
        style={{ height: Math.max(0, spotlight.top) }}
      />
      {/* Left */}
      <div
        className="absolute left-0 bg-black/55 pointer-events-auto"
        style={{
          top: spotlight.top,
          height: spotlight.height,
          width: Math.max(0, spotlight.left),
        }}
      />
      {/* Right */}
      <div
        className="absolute bg-black/55 pointer-events-auto"
        style={{
          top: spotlight.top,
          left: spotlight.left + spotlight.width,
          height: spotlight.height,
          width: Math.max(0, viewportWidth - (spotlight.left + spotlight.width)),
        }}
      />
      {/* Bottom */}
      <div
        className="absolute left-0 right-0 bg-black/55 pointer-events-auto"
        style={{
          top: spotlight.top + spotlight.height,
          height: Math.max(0, viewportHeight - (spotlight.top + spotlight.height)),
        }}
      />
    </>
  );
}

interface SpotlightOutlineProps {
  spotlight: SpotlightPosition;
}

function SpotlightOutline({ spotlight }: SpotlightOutlineProps) {
  return (
    <div
      className="absolute rounded-xl ring-2 ring-warning/80 pointer-events-none"
      style={{
        top: spotlight.top,
        left: spotlight.left,
        width: spotlight.width,
        height: spotlight.height,
      }}
    />
  );
}

interface TourPopoverProps {
  step: ValidationTourStep;
  position: { top: number; left: number };
  nextLabel: string;
  onBack?: () => void;
  onNext: () => void;
  onExit: () => void;
}

const TourPopover = React.forwardRef<HTMLDivElement, TourPopoverProps>(
  ({ step, position, nextLabel, onBack, onNext, onExit }, ref) => {
    return (
      <div
        ref={ref}
        className="absolute z-[1001] w-[90vw] sm:w-[320px] max-w-[320px] rounded-xl border border-warning/40 bg-background shadow-xl pointer-events-auto"
        style={{ top: position.top, left: position.left }}
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
    );
  }
);

TourPopover.displayName = 'TourPopover';
