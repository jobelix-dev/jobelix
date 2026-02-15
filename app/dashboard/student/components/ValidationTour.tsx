/**
 * ValidationTour Component
 *
 * Guided overlay that spotlights missing fields and provides step-by-step guidance.
 */

'use client';

import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
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

// Hydration-safe viewport dimensions hook
const subscribeNoop = () => () => {};
const getViewportWidth = () => window.innerWidth;
const getViewportHeight = () => window.innerHeight;
const getViewportWidthServer = () => 0;
const getViewportHeightServer = () => 0;

function useViewportDimensions() {
  const width = useSyncExternalStore(subscribeNoop, getViewportWidth, getViewportWidthServer);
  const height = useSyncExternalStore(subscribeNoop, getViewportHeight, getViewportHeightServer);
  return { width, height };
}

interface ValidationTourProps {
  isOpen: boolean;
  step: ValidationTourStep | null;
  onNext: () => void;
  onBack?: () => void;
  onExit: () => void;
  nextLabel?: string;
  /** When true, page scrolling is allowed while the tour is open (e.g. on the completion step) */
  allowScroll?: boolean;
}

export default function ValidationTour({
  isOpen,
  step,
  onNext,
  onBack,
  onExit,
  nextLabel = 'Next',
  allowScroll = false,
}: ValidationTourProps) {
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  // Derive overlayReady from targetRect presence - avoids synchronous setState
  const [stepKey, setStepKey] = useState<string | null>(null);
  const [popoverHeight, setPopoverHeight] = useState(160);
  const { width: viewportWidth, height: viewportHeight } = useViewportDimensions();

  const { releaseLock, acquireLock } = useScrollLock({ isActive: isOpen && !allowScroll });

  // Track if we're ready to show the overlay (step has been processed)
  const overlayReady = stepKey === step?.id && targetRect !== null;

  // Extract stable values from step to avoid recreating updateRect on every render
  const stepTargetId = step?.targetId;
  const stepTargetIds = step?.targetIds;

  const updateRect = useCallback(() => {
    if (!stepTargetId) return;
    const ids = stepTargetIds && stepTargetIds.length > 0 ? stepTargetIds : [stepTargetId];
    const rect = calculateUnionRect(ids);
    setTargetRect(rect);
  }, [stepTargetId, stepTargetIds]);

  // Handle resize/scroll events - use requestAnimationFrame to batch updates
  useEffect(() => {
    if (!isOpen || !step || !overlayReady) return;
    
    let rafId: number | null = null;
    const handle = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateRect();
      });
    };
    
    window.addEventListener('resize', handle);
    window.addEventListener('scroll', handle, true);
    return () => {
      window.removeEventListener('resize', handle);
      window.removeEventListener('scroll', handle, true);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isOpen, step, stepTargetId, overlayReady, updateRect]);

  // Reset state when step changes or tour closes
  // Use a key derived from isOpen and step.id to track valid state
  const currentStepId = isOpen && step ? step.id : null;
  
  // Store onBefore in a ref to avoid it being a dependency
  const onBeforeRef = React.useRef(step?.onBefore);
  useEffect(() => {
    onBeforeRef.current = step?.onBefore;
  }, [step?.onBefore]);
  
  useEffect(() => {
    // When tour is not active, nothing to set up
    if (!currentStepId || !stepTargetId) {
      return;
    }
    
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;

    const begin = async () => {
      if (cancelled) return;
      
      // Reset state for new step at start of async work
      setStepKey(null);
      setTargetRect(null);
      
      onBeforeRef.current?.();
      
      const ids = stepTargetIds && stepTargetIds.length > 0 ? stepTargetIds : [stepTargetId];
      const target = ids.map((id) => document.getElementById(id)).find((node) => !!node) as HTMLElement | undefined;
      if (!target) {
        attempt += 1;
        if (attempt < 6) {
          timeoutId = setTimeout(begin, 120);
        }
        return;
      }

      // Temporarily release scroll lock so scrollIntoView can work
      releaseLock();

      target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      await waitForScrollIdle();
      await new Promise((resolve) => setTimeout(resolve, 150));

      if (cancelled) return;

      // Re-acquire scroll lock after scrolling completes (skip if scrolling is allowed, e.g. completion step)
      if (!allowScroll) {
        acquireLock();
      }

      const focusTarget = target.matches('input, select, textarea, button, [tabindex]')
        ? target
        : (target.querySelector('input, select, textarea, button, [tabindex]') as HTMLElement | null);
      focusTarget?.focus({ preventScroll: true });
      
      // Update rect and mark this step as ready
      updateRect();
      setStepKey(currentStepId);
    };

    timeoutId = setTimeout(begin, 60);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      // Reset state on cleanup
      setStepKey(null);
      setTargetRect(null);
    };
  }, [currentStepId, stepTargetId, stepTargetIds, updateRect, releaseLock, acquireLock, allowScroll]);

  // Callback ref to measure popover height - called by React when element mounts/unmounts
  const popoverRefCallback = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const height = node.offsetHeight;
      if (height > 0 && height !== popoverHeight) {
        setPopoverHeight(height);
      }
    }
  }, [popoverHeight]);

  // Handle Enter key to advance to next step
  useEffect(() => {
    if (!isOpen || !overlayReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // Don't intercept Enter on editable elements (inputs, textareas, selects)
        const target = e.target as HTMLElement | null;
        const isEditable = !!target && (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable
        );
        if (isEditable) return;

        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, overlayReady, onNext]);

  if (!isOpen || !step || !overlayReady || !targetRect) return null;

  const spotlight = calculateSpotlightPosition(targetRect);
  const popoverPos = calculatePopoverPosition(spotlight, popoverHeight, viewportWidth, viewportHeight);

  const content = (
    <div
      className="fixed inset-0 z-[1000] pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    >
      <DimmingOverlay spotlight={spotlight} viewportWidth={viewportWidth} viewportHeight={viewportHeight} passThrough={allowScroll} />
      <SpotlightOutline spotlight={spotlight} />
      <TourPopover
        ref={popoverRefCallback}
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
  /** When true, the overlay doesn't block pointer events (allows scrolling/clicking through) */
  passThrough?: boolean;
}

function DimmingOverlay({ spotlight, viewportWidth, viewportHeight, passThrough = false }: DimmingOverlayProps) {
  const pointerClass = passThrough ? 'pointer-events-none' : 'pointer-events-auto';
  return (
    <>
      {/* Top */}
      <div
        className={`absolute left-0 right-0 top-0 bg-black/55 ${pointerClass}`}
        style={{ height: Math.max(0, spotlight.top) }}
      />
      {/* Left */}
      <div
        className={`absolute left-0 bg-black/55 ${pointerClass}`}
        style={{
          top: spotlight.top,
          height: spotlight.height,
          width: Math.max(0, spotlight.left),
        }}
      />
      {/* Right */}
      <div
        className={`absolute bg-black/55 ${pointerClass}`}
        style={{
          top: spotlight.top,
          left: spotlight.left + spotlight.width,
          height: spotlight.height,
          width: Math.max(0, viewportWidth - (spotlight.left + spotlight.width)),
        }}
      />
      {/* Bottom */}
      <div
        className={`absolute left-0 right-0 bg-black/55 ${pointerClass}`}
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
