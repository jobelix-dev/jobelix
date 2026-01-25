/**
 * LoadingOverlay Component
 * 
 * Professional loading overlay with progress indicator and status message.
 * Used during async operations like resume upload/extraction.
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface LoadingOverlayProps {
  message?: string;
  submessage?: string;
  steps?: string[];
  estimatedDurationMs?: number;
  progressPercent?: number;
  currentStepIndex?: number;
}

export default function LoadingOverlay({ 
  message = 'Processing...', 
  submessage,
  steps,
  estimatedDurationMs = 30000,
  progressPercent,
  currentStepIndex,
}: LoadingOverlayProps) {
  const [elapsedMs, setElapsedMs] = useState(0);

  const hasSteps = !!steps && steps.length > 0;
  const hasExternalProgress = typeof progressPercent === 'number' || typeof currentStepIndex === 'number';
  const stepDurationMs = useMemo(() => {
    if (!hasSteps) return 0;
    return Math.max(1200, Math.floor(estimatedDurationMs / steps.length));
  }, [estimatedDurationMs, hasSteps, steps?.length]);

  useEffect(() => {
    if (!hasSteps || hasExternalProgress) return;
    setElapsedMs(0);
    const start = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - start);
    }, 120);
    return () => window.clearInterval(timer);
  }, [hasSteps, message, submessage]);

  const derivedStepIndex = useMemo(() => {
    if (!hasSteps) return 0;
    if (typeof currentStepIndex === 'number') {
      return Math.min(steps.length - 1, Math.max(0, currentStepIndex));
    }
    if (typeof progressPercent === 'number') {
      const idx = Math.floor((progressPercent / 100) * steps.length);
      return Math.min(steps.length - 1, Math.max(0, idx));
    }
    const idx = Math.floor(elapsedMs / stepDurationMs);
    return Math.min(steps.length - 1, idx);
  }, [currentStepIndex, elapsedMs, hasSteps, progressPercent, stepDurationMs, steps?.length]);

  const derivedProgressPercent = useMemo(() => {
    if (!hasSteps) return 0;
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
  }, [currentStepIndex, elapsedMs, hasSteps, progressPercent, stepDurationMs, steps?.length]);

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
