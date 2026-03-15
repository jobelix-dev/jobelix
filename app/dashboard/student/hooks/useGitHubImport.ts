/**
 * useGitHubImport Hook
 * 
 * Handles importing GitHub repositories into profile.
 * Merges GitHub data with existing projects and skills.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ProjectEntry, SkillEntry } from '@/lib/shared/types';
import { apiFetch } from '@/lib/client/http';

// ============================================================================
// Types
// ============================================================================

interface ImportGitHubResponse {
  success: boolean;
  projects: ProjectEntry[];
  skills: SkillEntry[];
  repos_imported: number;
  error?: string;
  message?: string;
}

interface ImportProgress {
  step: string;
  progress: number;
  reposProcessed: number;
  reposTotal: number;
  batchRepos: string[];
  complete?: boolean;
  updatedAt: string;
}

interface UseGitHubImportOptions {
  /** Enable SSE progress tracking */
  enableProgress?: boolean;
  /** Callback when import completes successfully */
  onComplete?: (projects: ProjectEntry[], skills: SkillEntry[]) => void;
}

/** Callback for when import completes */
type ImportCompleteCallback = (projects: ProjectEntry[], skills: SkillEntry[]) => void;

interface UseGitHubImportReturn {
  /** Trigger the import process */
  importGitHubData: (
    currentProjects: ProjectEntry[],
    currentSkills: SkillEntry[],
    onComplete?: ImportCompleteCallback
  ) => Promise<ImportGitHubResponse | null>;
  /** Whether import is in progress */
  importing: boolean;
  /** Error message if import failed */
  error: string | null;
  /** Whether last import was successful */
  success: boolean;
  /** Current import progress (only available with enableProgress) */
  progress: ImportProgress | null;
  /** Reset state */
  reset: () => void;
}

// ============================================================================
// Core import logic (shared between simple and dashboard hooks)
// ============================================================================

async function fetchGitHubImport(
  currentProjects: ProjectEntry[],
  currentSkills: SkillEntry[]
): Promise<ImportGitHubResponse> {
  const response = await apiFetch('/api/student/import-github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      current_projects: currentProjects,
      current_skills: currentSkills,
    }),
  });

  const data: ImportGitHubResponse = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Failed to import GitHub data');
  }

  return data;
}

// ============================================================================
// Simple hook (no progress tracking)
// ============================================================================

/**
 * Simple GitHub import hook without progress tracking.
 * Use this when you don't need real-time progress updates.
 */
export function useGitHubImport(): UseGitHubImportReturn {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const importGitHubData = useCallback(async (
    currentProjects: ProjectEntry[],
    currentSkills: SkillEntry[],
    onComplete?: ImportCompleteCallback
  ): Promise<ImportGitHubResponse | null> => {
    try {
      setImporting(true);
      setError(null);
      setSuccess(false);

      const data = await fetchGitHubImport(currentProjects, currentSkills);
      setSuccess(true);
      onComplete?.(data.projects, data.skills);
      return data;
    } catch (err: unknown) {
      console.error('Error importing GitHub data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setImporting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    importGitHubData,
    importing,
    error,
    success,
    progress: null,
    reset,
  };
}

// ============================================================================
// Dashboard hook (with progress tracking)
// ============================================================================

/**
 * GitHub import hook with SSE progress tracking.
 * Persists state across tab switches in the dashboard.
 */
export function useGitHubImportDashboard(
  options: UseGitHubImportOptions = {}
): UseGitHubImportReturn {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state for safe state updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

  const importGitHubData = useCallback(async (
    currentProjects: ProjectEntry[],
    currentSkills: SkillEntry[],
    onComplete?: ImportCompleteCallback
  ): Promise<ImportGitHubResponse | null> => {
    try {
      setImporting(true);
      setError(null);
      setSuccess(false);
      // Seed a non-zero initial state so the bar starts at 2% immediately
      // instead of sitting at 0% until the first DB write arrives (~500ms).
      setProgress({ step: 'Starting import', progress: 2, reposProcessed: 0, reposTotal: 0, batchRepos: [], updatedAt: new Date().toISOString() });

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      // Poll progress every 500 ms while import runs.
      // Works across all environments (web, Electron, serverless) because
      // progress is stored in the DB, not in-process memory.
      pollIntervalRef.current = setInterval(async () => {
        if (!isMountedRef.current) return;
        try {
          const res = await apiFetch('/api/student/import-github/progress');
          if (!res.ok) return;
          const data = await res.json() as ImportProgress | null;
          if (data && isMountedRef.current) setProgress(prev =>
            !prev || data.progress >= prev.progress ? data : prev
          );
        } catch {
          // Ignore transient network errors — next tick will retry.
        }
      }, 500);

      // Perform the import
      const data = await fetchGitHubImport(currentProjects, currentSkills);

      if (isMountedRef.current) {
        setSuccess(true);
        // Call the per-call callback first (for immediate UI update)
        onComplete?.(data.projects, data.skills);
        // Then call the hook-level callback (for other side effects)
        options.onComplete?.(data.projects, data.skills);
      }

      return data;
    } catch (err: unknown) {
      console.error('Error importing GitHub data:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
      return null;
    } finally {
      // One final poll to capture the complete:true state before stopping.
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (isMountedRef.current) {
        try {
          const res = await apiFetch('/api/student/import-github/progress');
          if (res.ok) {
            const data = await res.json() as ImportProgress | null;
            if (data) setProgress(prev =>
              !prev || data.progress >= prev.progress ? data : prev
            );
          }
        } catch { /* best-effort */ }
        setImporting(false);
      }
    }
  }, [options]);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
    setProgress(null);
  }, []);

  return {
    importGitHubData,
    importing,
    error,
    success,
    progress,
    reset,
  };
}
