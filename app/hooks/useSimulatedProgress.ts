/**
 * useSimulatedProgress Hook
 * 
 * Simulates progress during browser installation when real progress isn't available.
 */

'use client';

import { useEffect, useState } from 'react';

const PROGRESS_SIMULATION_INTERVAL_MS = 200;
const SIMULATED_INSTALL_DURATION_MS = 30000;

interface UseSimulatedProgressOptions {
  isActive: boolean;
  realProgress: number | undefined | null;
}

export function useSimulatedProgress({ isActive, realProgress }: UseSimulatedProgressOptions): number {
  const [simulatedProgress, setSimulatedProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      setSimulatedProgress(null);
      return;
    }
    if (typeof realProgress === 'number') {
      setSimulatedProgress(null);
      return;
    }

    const increment = 99 / (SIMULATED_INSTALL_DURATION_MS / PROGRESS_SIMULATION_INTERVAL_MS);
    setSimulatedProgress(0);

    const intervalId = window.setInterval(() => {
      setSimulatedProgress((prev) => (prev === null ? 0 : Math.min(99, prev + increment)));
    }, PROGRESS_SIMULATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isActive, realProgress]);

  const displayProgress = typeof realProgress === 'number'
    ? Math.max(realProgress, simulatedProgress ?? 0)
    : simulatedProgress ?? 0;

  return Math.max(0, Math.min(100, Math.round(displayProgress)));
}
