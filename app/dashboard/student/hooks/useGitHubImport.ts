/**
 * useGitHubImport Hook
 * 
 * Handles importing GitHub repositories into profile.
 * Merges GitHub data with existing projects and skills.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ProjectEntry, SkillEntry } from '@/lib/shared/types';

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

interface UseGitHubImportReturn {
  /** Trigger the import process */
  importGitHubData: (
    currentProjects: ProjectEntry[],
    currentSkills: SkillEntry[]
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
  const response = await fetch('/api/student/import-github', {
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
    currentSkills: SkillEntry[]
  ): Promise<ImportGitHubResponse | null> => {
    try {
      setImporting(true);
      setError(null);
      setSuccess(false);

      const data = await fetchGitHubImport(currentProjects, currentSkills);
      setSuccess(true);
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
  const { onComplete } = options;
  
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const progressSourceRef = useRef<EventSource | null>(null);
  const isMountedRef = useRef(true);

  // Track mounted state for safe state updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cleanup EventSource on unmount
      if (progressSourceRef.current) {
        progressSourceRef.current.close();
        progressSourceRef.current = null;
      }
    };
  }, []);

  const importGitHubData = useCallback(async (
    currentProjects: ProjectEntry[],
    currentSkills: SkillEntry[]
  ): Promise<ImportGitHubResponse | null> => {
    try {
      setImporting(true);
      setError(null);
      setSuccess(false);
      setProgress(null);

      // Close any existing progress connection
      if (progressSourceRef.current) {
        progressSourceRef.current.close();
        progressSourceRef.current = null;
      }

      // Start SSE for progress tracking
      const progressSource = new EventSource('/api/student/import-github/progress');
      progressSourceRef.current = progressSource;

      progressSource.onmessage = (event) => {
        if (!isMountedRef.current) return;
        
        try {
          const data = JSON.parse(event.data) as ImportProgress;
          setProgress(data);
          
          if (data.complete) {
            progressSource.close();
            progressSourceRef.current = null;
          }
        } catch (parseError) {
          console.warn('Failed to parse GitHub import progress event', parseError);
        }
      };

      progressSource.onerror = () => {
        progressSource.close();
        progressSourceRef.current = null;
      };

      // Perform the import
      const data = await fetchGitHubImport(currentProjects, currentSkills);

      if (isMountedRef.current) {
        setSuccess(true);
        onComplete?.(data.projects, data.skills);
      }

      return data;
    } catch (err: unknown) {
      console.error('Error importing GitHub data:', err);
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
      return null;
    } finally {
      if (isMountedRef.current) {
        setImporting(false);
      }
      // Ensure progress source is closed
      if (progressSourceRef.current) {
        progressSourceRef.current.close();
        progressSourceRef.current = null;
      }
    }
  }, [onComplete]);

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
