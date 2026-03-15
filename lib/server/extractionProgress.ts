/**
 * Extraction progress tracking — DB-backed.
 *
 * Progress is upserted into the `extraction_progress` table via the service
 * role so it is visible across all server instances. The frontend polls
 * GET /api/student/profile/draft/extract/progress every 500 ms.
 *
 * A dedicated table (not `student`) is used because the student row doesn't
 * exist yet during the wizard phase (before the user finalises their profile).
 */

import "server-only";

import { getServiceSupabase } from './supabaseService';

export interface ExtractionProgressState {
  stepIndex: number;
  step: string;
  progress: number;
  complete?: boolean;
  updatedAt: string;
}

/**
 * Write the current extraction step to the DB (fire-and-forget).
 * Called synchronously by the extraction route — does not block extraction.
 */
export function setExtractionProgress(
  userId: string,
  next: Omit<ExtractionProgressState, 'updatedAt'>
) {
  const state: ExtractionProgressState = {
    ...next,
    updatedAt: new Date().toISOString(),
  };

  getServiceSupabase()
    .from('extraction_progress')
    .upsert({ user_id: userId, data: state, updated_at: state.updatedAt })
    .then(({ error }) => {
      if (error) console.error('[ExtractionProgress] write failed:', error);
      else console.log('[ExtractionProgress] wrote step', state.stepIndex, 'for', userId);
    });

  if (state.complete) {
    // Clear the row after a short delay so late polls still see the final state.
    setTimeout(() => {
      void getServiceSupabase()
        .from('extraction_progress')
        .delete()
        .eq('user_id', userId);
    }, 120_000);
  }
}

/**
 * Read the current extraction progress for a user from the DB.
 */
export async function getExtractionProgress(
  userId: string
): Promise<ExtractionProgressState | null> {
  const { data, error } = await getServiceSupabase()
    .from('extraction_progress')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) console.error('[ExtractionProgress] read failed:', error);
  else console.log('[ExtractionProgress] read for', userId, '→', data ? `step ${(data.data as ExtractionProgressState)?.stepIndex}` : 'null');

  return (data?.data as ExtractionProgressState | null) ?? null;
}
