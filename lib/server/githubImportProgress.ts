/**
 * In-memory GitHub import progress emitter (per user).
 * Used to stream progress via SSE during GitHub sync.
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
