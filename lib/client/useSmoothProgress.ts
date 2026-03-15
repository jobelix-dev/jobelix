'use client';

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

/**
 * Smoothly animates a displayed value toward a target using requestAnimationFrame.
 *
 * Uses the useSyncExternalStore pattern so state updates happen only inside rAF
 * callbacks (the "external system"), never synchronously inside an effect body.
 *
 * Prevents the visual jumps that occur when polled progress values update in
 * large discrete increments (e.g. 28% → 57% in one tick). At speed=12 %/s a
 * 30% jump takes ~2.5 seconds to traverse, looking continuous.
 *
 * State updates are throttled to integer % changes to avoid excess renders.
 *
 * @param target - The current target value (0–100)
 * @param speed  - Max movement per second (default: 12 %/s)
 */
export function useSmoothProgress(target: number, speed = 12): number {
  const storeRef = useRef({
    raw: target,                   // current interpolated float position
    display: Math.round(target),   // last emitted integer (drives renders)
    listeners: new Set<() => void>(),
    rafId: null as number | null,
    lastTs: null as number | null,
  });

  const subscribe = useMemo(() => (callback: () => void) => {
    storeRef.current.listeners.add(callback);
    return () => storeRef.current.listeners.delete(callback);
  }, []);

  const getSnapshot = useMemo(() => () => storeRef.current.display, []);

  useEffect(() => {
    const store = storeRef.current;

    if (store.rafId !== null) {
      cancelAnimationFrame(store.rafId);
      store.rafId = null;
    }

    const animate = (ts: number) => {
      const last = store.lastTs ?? ts;
      store.lastTs = ts;
      // Cap dt so a background tab resuming doesn't cause a giant jump.
      const dt = Math.min((ts - last) / 1000, 0.1);

      const diff = target - store.raw;
      if (Math.abs(diff) < 0.5) {
        store.raw = target;
        const rounded = Math.round(target);
        if (rounded !== store.display) {
          store.display = rounded;
          store.listeners.forEach(fn => fn());
        }
        store.lastTs = null;
        return;
      }

      store.raw += Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
      const rounded = Math.round(store.raw);
      if (rounded !== store.display) {
        store.display = rounded;
        store.listeners.forEach(fn => fn());
      }
      store.rafId = requestAnimationFrame(animate);
    };

    store.lastTs = null;
    store.rafId = requestAnimationFrame(animate);

    return () => {
      if (store.rafId !== null) {
        cancelAnimationFrame(store.rafId);
        store.rafId = null;
      }
    };
  }, [target, speed]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
