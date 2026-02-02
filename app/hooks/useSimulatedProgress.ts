/**
 * useSimulatedProgress Hook
 * 
 * Simulates progress during browser installation when real progress isn't available.
 * Uses useSyncExternalStore to avoid setState in useEffect lint errors.
 */

'use client';

import { useEffect, useRef, useSyncExternalStore, useMemo } from 'react';

const PROGRESS_SIMULATION_INTERVAL_MS = 200;
const SIMULATED_INSTALL_DURATION_MS = 30000;

interface UseSimulatedProgressOptions {
  isActive: boolean;
  realProgress: number | undefined | null;
}

export function useSimulatedProgress({ isActive, realProgress }: UseSimulatedProgressOptions): number {
  const storeRef = useRef({
    progress: null as number | null,
    listeners: new Set<() => void>(),
    intervalId: null as number | null,
  });

  const subscribe = useMemo(() => (callback: () => void) => {
    storeRef.current.listeners.add(callback);
    return () => storeRef.current.listeners.delete(callback);
  }, []);

  const getSnapshot = useMemo(() => () => storeRef.current.progress, []);

  useEffect(() => {
    const store = storeRef.current;
    
    // Clear any existing interval
    if (store.intervalId !== null) {
      window.clearInterval(store.intervalId);
      store.intervalId = null;
    }

    if (!isActive) {
      store.progress = null;
      store.listeners.forEach(fn => fn());
      return;
    }
    if (typeof realProgress === 'number') {
      store.progress = null;
      store.listeners.forEach(fn => fn());
      return;
    }

    const increment = 99 / (SIMULATED_INSTALL_DURATION_MS / PROGRESS_SIMULATION_INTERVAL_MS);
    store.progress = 0;
    store.listeners.forEach(fn => fn());

    store.intervalId = window.setInterval(() => {
      store.progress = store.progress === null ? 0 : Math.min(99, store.progress + increment);
      store.listeners.forEach(fn => fn());
    }, PROGRESS_SIMULATION_INTERVAL_MS);

    return () => {
      if (store.intervalId !== null) {
        window.clearInterval(store.intervalId);
        store.intervalId = null;
      }
    };
  }, [isActive, realProgress]);

  const simulatedProgress = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const displayProgress = typeof realProgress === 'number'
    ? Math.max(realProgress, simulatedProgress ?? 0)
    : simulatedProgress ?? 0;

  return Math.max(0, Math.min(100, Math.round(displayProgress)));
}
