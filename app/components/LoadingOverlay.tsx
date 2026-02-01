/**
 * LoadingOverlay Component
 * 
 * Professional loading overlay with progress indicator and status message.
 * Used during async operations like resume upload/extraction.
 */

'use client';

import React, { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  /** Main loading message displayed at the top */
  message?: string;
  /** Secondary message displayed below the main message */
  submessage?: string;
  /** Array of step descriptions to show progress through */
  steps?: string[];
  /** Estimated total duration in milliseconds for time-based progress */
  estimatedDurationMs?: number;
  /** External progress percentage (0-100) - overrides time-based progress */
  progressPercent?: number;
  /** External current step index - overrides time-based progress */
  currentStepIndex?: number;
}

/**
 * Custom hook for tracking elapsed time using useSyncExternalStore pattern.
 * Avoids setState in useEffect which can cause issues.
 * 
 * @param isActive - Whether the timer should be running
 * @param resetKey - A string key that triggers timer reset when changed
 */
function useElapsedTime(isActive: boolean, resetKey: string) {
  const storeRef = useRef({
    startTime: 0,
    elapsed: 0,
    listeners: new Set<() => void>(),
    intervalId: null as number | null,
  });

  const subscribe = useMemo(() => (callback: () => void) => {
    storeRef.current.listeners.add(callback);
    return () => storeRef.current.listeners.delete(callback);
  }, []);

  const getSnapshot = useMemo(() => () => storeRef.current.elapsed, []);

  // Effect to start/stop the timer - uses resetKey instead of spreading deps
  useEffect(() => {
    const store = storeRef.current;
    
    // Clear existing interval
    if (store.intervalId !== null) {
      window.clearInterval(store.intervalId);
      store.intervalId = null;
    }
    
    if (!isActive) {
      store.elapsed = 0;
      store.listeners.forEach(fn => fn());
      return;
    }
    
    // Start new timer
    store.startTime = Date.now();
    store.elapsed = 0;
    store.listeners.forEach(fn => fn());
    
    store.intervalId = window.setInterval(() => {
      store.elapsed = Date.now() - store.startTime;
      store.listeners.forEach(fn => fn());
    }, 120);
    
    return () => {
      if (store.intervalId !== null) {
        window.clearInterval(store.intervalId);
        store.intervalId = null;
      }
    };
  }, [isActive, resetKey]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export default function LoadingOverlay({ 
  message = 'Processing...', 
  submessage,
  steps,
  estimatedDurationMs = 30000,
  progressPercent,
  currentStepIndex,
}: LoadingOverlayProps) {
  const hasSteps = !!steps && steps.length > 0;
  const hasExternalProgress = typeof progressPercent === 'number' || typeof currentStepIndex === 'number';
  
  const stepDurationMs = useMemo(() => {
    if (!hasSteps || !steps) return 0;
    return Math.max(1200, Math.floor(estimatedDurationMs / steps.length));
  }, [estimatedDurationMs, hasSteps, steps]);

  // Create a stable reset key from message and submessage
  // This will cause the timer to reset when these values change
  const resetKey = useMemo(() => `${message ?? ''}-${submessage ?? ''}`, [message, submessage]);

  // Track elapsed time using external store pattern (avoids setState in useEffect)
  const elapsedMs = useElapsedTime(
    hasSteps && !hasExternalProgress,
    resetKey
  );

  const derivedStepIndex = useMemo(() => {
    if (!hasSteps || !steps) return 0;
    if (typeof currentStepIndex === 'number') {
      return Math.min(steps.length - 1, Math.max(0, currentStepIndex));
    }
    if (typeof progressPercent === 'number') {
      const idx = Math.floor((progressPercent / 100) * steps.length);
      return Math.min(steps.length - 1, Math.max(0, idx));
    }
    const idx = Math.floor(elapsedMs / stepDurationMs);
    return Math.min(steps.length - 1, idx);
  }, [currentStepIndex, elapsedMs, hasSteps, progressPercent, stepDurationMs, steps]);

  const derivedProgressPercent = useMemo(() => {
    if (!hasSteps || !steps) return 0;
    if (typeof progressPercent === 'number') {
      return Math.max(0, Math.min(100, Math.round(progressPercent)));
    }
    if (typeof currentStepIndex === 'number') {
      const raw = ((currentStepIndex + 1) / steps.length) * 100;
      return Math.max(0, Math.min(100, Math.round(raw)));
    }
    const total = steps.length * stepDurationMs;
    const raw = Math.min(elapsedMs / total, 0.95);
    return Math.round(raw * 100);
  }, [currentStepIndex, elapsedMs, hasSteps, progressPercent, stepDurationMs, steps]);

  return (
    <div className="absolute -inset-2 z-10 bg-surface/80/80 backdrop-blur-sm rounded-lg flex flex-col items-center pt-8 px-6">
      <div className="text-center mb-5">
        <p className="text-sm font-medium text-muted">
          {message}
        </p>
        {submessage && (
          <p className="text-xs text-muted mt-1">
            {submessage}
          </p>
        )}
      </div>

      {hasSteps ? (
        <div className="w-full max-w-md">
          <div className="text-sm text-default font-medium text-center mb-3">
            {steps[derivedStepIndex]}
          </div>
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span>Progress</span>
            <span>{derivedProgressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-primary-subtle/60 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${derivedProgressPercent}%` }}
            />
          </div>
        </div>
      ) : (
        <Loader2 className="w-8 h-8 animate-spin text-muted" />
      )}
    </div>
  );
}
