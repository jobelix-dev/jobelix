/**
 * Hook for managing GitHub import repo ticker animation
 */

import { useState, useEffect } from 'react';

export function useRepoTicker(
  githubRepos: string[],
  importingGitHub: boolean
) {
  const [visibleRepos, setVisibleRepos] = useState<string[]>([]);
  const [repoTickerIndex, setRepoTickerIndex] = useState(0);

  useEffect(() => {
    if (githubRepos.length > 0) {
      setVisibleRepos(githubRepos);
    }
  }, [githubRepos.join('|')]);

  useEffect(() => {
    setRepoTickerIndex(0);
  }, [visibleRepos.join('|')]);

  useEffect(() => {
    if (!importingGitHub || visibleRepos.length <= 1) return;
    const interval = setInterval(() => {
      setRepoTickerIndex((prev) => (prev + 1) % visibleRepos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [importingGitHub, visibleRepos]);

  return { visibleRepos, repoTickerIndex };
}
