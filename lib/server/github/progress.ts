/**
 * In-memory GitHub import progress emitter (per user).
 * Used to stream progress via SSE during GitHub sync.
 * 
 * ARCHITECTURE NOTE:
 * This uses in-memory state which works because:
 * 1. SSE streaming happens within a single long-running request
 * 2. The import POST and progress SSE requests hit the same serverless instance
 *    during the same import operation (within seconds of each other)
 * 
 * LIMITATIONS:
 * - Progress state is lost on serverless cold start (acceptable - user retries)
 * - Multi-instance deployments won't share progress (rare edge case)
 * 
 * For production at scale, consider using Redis pub/sub instead.
 * For current use case (single-user imports), in-memory is sufficient.
 */

import { EventEmitter } from 'events';

export interface GitHubImportProgressState {
  step: string;
  progress: number;
  reposProcessed: number;
  reposTotal: number;
  batchRepos: string[];
  complete?: boolean;
  updatedAt: string;
}

const emitter = new EventEmitter();
const progressByUser = new Map<string, GitHubImportProgressState>();

export function setGitHubImportProgress(
  userId: string,
  next: Omit<GitHubImportProgressState, 'updatedAt'>
) {
  const state: GitHubImportProgressState = {
    ...next,
    updatedAt: new Date().toISOString(),
  };

  progressByUser.set(userId, state);
  emitter.emit(userId, state);

  if (state.complete) {
    setTimeout(() => {
      progressByUser.delete(userId);
    }, 120000);
  }
}

export function getGitHubImportProgress(userId: string) {
  return progressByUser.get(userId) || null;
}

export function subscribeGitHubImportProgress(
  userId: string,
  listener: (state: GitHubImportProgressState) => void
) {
  emitter.on(userId, listener);
  return () => emitter.off(userId, listener);
}
