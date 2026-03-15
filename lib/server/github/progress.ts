/**
 * GitHub import progress tracking — DB-backed.
 *
 * Progress is upserted into the `github_import_progress` table via the service
 * role so it is visible across all server instances. The frontend polls
 * GET /api/student/import-github/progress every 500 ms.
 *
 * A dedicated table (not `student`) is used because the student row doesn't
 * exist yet during the wizard phase (before the user finalises their profile).
 */

import "server-only";

import { getServiceSupabase } from '../supabaseService';

export interface GitHubImportProgressState {
  step: string;
  progress: number;
  reposProcessed: number;
  reposTotal: number;
  batchRepos: string[];
  complete?: boolean;
  updatedAt: string;
}

/**
 * Write the current import step to the DB (fire-and-forget).
 * Called synchronously by the import service — does not block import.
 */
export function setGitHubImportProgress(
  userId: string,
  next: Omit<GitHubImportProgressState, 'updatedAt'>
) {
  const state: GitHubImportProgressState = {
    ...next,
    updatedAt: new Date().toISOString(),
  };

  getServiceSupabase()
    .from('github_import_progress')
    .upsert({ user_id: userId, data: state, updated_at: state.updatedAt })
    .then(({ error }) => {
      if (error) console.error('[GitHubProgress] write failed:', error);
      else console.log('[GitHubProgress] wrote step', JSON.stringify(state.step), 'for', userId);
    });

  if (state.complete) {
    // Clear the row after a short delay so late polls still see the final state.
    setTimeout(() => {
      void getServiceSupabase()
        .from('github_import_progress')
        .delete()
        .eq('user_id', userId);
    }, 120_000);
  }
}

/**
 * Read the current GitHub import progress for a user from the DB.
 */
export async function getGitHubImportProgress(
  userId: string
): Promise<GitHubImportProgressState | null> {
  const { data, error } = await getServiceSupabase()
    .from('github_import_progress')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) console.error('[GitHubProgress] read failed:', error);
  else console.log('[GitHubProgress] read for', userId, '→', data ? data.data : 'null');

  return (data?.data as GitHubImportProgressState | null) ?? null;
}
