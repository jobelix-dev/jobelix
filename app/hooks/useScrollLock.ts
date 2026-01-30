/**
 * useScrollLock Hook
 * 
 * Manages scroll locking for modal overlays.
 * Prevents page scroll while overlay is active.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { registerFocusLock } from '@/lib/client/focusRestore';

interface UseScrollLockOptions {
  isActive: boolean;
}

export function useScrollLock({ isActive }: UseScrollLockOptions) {
  const previousOverflow = useRef<string | null>(null);
  const lockActiveRef = useRef(false);
  const isActiveRef = useRef(isActive);
  const preventScrollRef = useRef<(event: Event) => void>(() => {});
  const preventScrollKeysRef = useRef<(event: KeyboardEvent) => void>(() => {});

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

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

  const acquireLock = useCallback(() => {
    if (lockActiveRef.current) return;
    
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const preventScroll = (event: Event) => {
      event.preventDefault();
    };

    const preventScrollKeys = (event: KeyboardEvent) => {
      const blockedKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar'];
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

  // Acquire/release based on isActive
  useEffect(() => {
    if (isActive) {
      acquireLock();
    } else {
      releaseLock();
    }
    return () => releaseLock();
  }, [isActive, acquireLock, releaseLock]);

  // Register with focus lock system
  useEffect(() => {
    return registerFocusLock({
      acquire: acquireLock,
      release: releaseLock,
      isActive: () => isActiveRef.current,
    });
  }, [acquireLock, releaseLock]);

  return {
    acquireLock,
    releaseLock,
    previousOverflow,
  };
}
