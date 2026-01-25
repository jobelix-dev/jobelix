/**
 * Global focus/scroll lock restoration helpers.
 * Ensures any active locks can be released/reapplied after native dialogs.
 */

type FocusLockHandle = {
  acquire: () => void;
  release: () => void;
  isActive: () => boolean;
};

const focusLocks = new Set<FocusLockHandle>();

export function registerFocusLock(handle: FocusLockHandle) {
  focusLocks.add(handle);
  return () => {
    focusLocks.delete(handle);
  };
}

export function resetFocusLocks() {
  focusLocks.forEach((lock) => lock.release());
  requestAnimationFrame(() => {
    focusLocks.forEach((lock) => {
      if (lock.isActive()) {
        lock.acquire();
      }
    });
  });
}

export function restoreFocusAfterDialog() {
  resetFocusLocks();
  requestAnimationFrame(() => {
    if (!document.activeElement || document.activeElement === document.body) {
      window.focus();
    }
  });
}
