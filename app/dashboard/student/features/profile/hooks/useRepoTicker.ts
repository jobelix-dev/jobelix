/**
 * Hook for managing GitHub import repo ticker animation
 * Uses useSyncExternalStore to avoid setState in useEffect lint errors.
 */

import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';

export function useRepoTicker(
  githubRepos: string[],
  importingGitHub: boolean
) {
  // Memoize the repos key to detect changes
  const reposKey = useMemo(() => githubRepos.join('|'), [githubRepos]);
  
  // Compute visible repos from githubRepos directly
  const visibleRepos = useMemo(() => 
    githubRepos.length > 0 ? githubRepos : [],
    [githubRepos]
  );
  
  // Store for ticker index using useSyncExternalStore pattern
  const storeRef = useRef({
    index: 0,
    listeners: new Set<() => void>(),
    intervalId: null as ReturnType<typeof setInterval> | null,
    prevReposKey: reposKey,
  });

  const subscribe = useMemo(() => (callback: () => void) => {
    storeRef.current.listeners.add(callback);
    return () => storeRef.current.listeners.delete(callback);
  }, []);

  const getSnapshot = useMemo(() => () => storeRef.current.index, []);

  // Effect to reset index when repos change and manage ticker interval
  useEffect(() => {
    const store = storeRef.current;
    
    // Reset index when repos change
    if (store.prevReposKey !== reposKey) {
      store.prevReposKey = reposKey;
      store.index = 0;
      store.listeners.forEach(fn => fn());
    }
    
    // Clear existing interval
    if (store.intervalId !== null) {
      clearInterval(store.intervalId);
      store.intervalId = null;
    }
    
    if (!importingGitHub || visibleRepos.length <= 1) return;
    
    store.intervalId = setInterval(() => {
      store.index = (store.index + 1) % visibleRepos.length;
      store.listeners.forEach(fn => fn());
    }, 6000);
    
    return () => {
      if (store.intervalId !== null) {
        clearInterval(store.intervalId);
        store.intervalId = null;
      }
    };
  }, [importingGitHub, visibleRepos, reposKey]);

  const repoTickerIndex = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { visibleRepos, repoTickerIndex };
}
