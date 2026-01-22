/**
 * useGitHubImport Hook
 * 
 * Handles importing GitHub repositories into profile.
 * Merges GitHub data with existing projects and skills.
 */

'use client';

import { useState, useCallback } from 'react';
import { ProjectEntry, SkillEntry } from '@/lib/shared/types';

interface ImportGitHubParams {
  current_projects: ProjectEntry[];
  current_skills: SkillEntry[];
}

interface ImportGitHubResponse {
  success: boolean;
  projects: ProjectEntry[];
  skills: SkillEntry[];
  repos_imported: number;
  error?: string;
  message?: string;
}

export function useGitHubImport() {
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

      setSuccess(true);

      return data;
    } catch (err: any) {
      console.error('Error importing GitHub data:', err);
      setError(err.message);
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
    reset,
  };
}

/**
 * useGitHubImportDashboard Hook
 * 
 * Dashboard-level hook for GitHub import that persists state across tab switches.
 * Similar to useResumeUpload but for GitHub imports.
 */
export function useGitHubImportDashboard() {
  const [importingGitHub, setImportingGitHub] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const importGitHubData = useCallback(async (
    currentProjects: ProjectEntry[],
    currentSkills: SkillEntry[],
    onComplete?: (projects: ProjectEntry[], skills: SkillEntry[]) => void
  ): Promise<ImportGitHubResponse | null> => {
    try {
      setImportingGitHub(true);
      setImportError(null);
      setImportSuccess(false);

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

      setImportSuccess(true);

      if (onComplete) {
        onComplete(data.projects, data.skills);
      }

      return data;
    } catch (err: any) {
      console.error('Error importing GitHub data:', err);
      setImportError(err.message);
      return null;
    } finally {
      setImportingGitHub(false);
    }
  }, []);

  const reset = useCallback(() => {
    setImportError(null);
    setImportSuccess(false);
  }, []);

  return {
    importGitHubData,
    importingGitHub,
    importError,
    importSuccess,
    reset,
  };
}
