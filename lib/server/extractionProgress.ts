/**
 * In-memory extraction progress emitter (per user).
 * Used to stream progress via SSE during resume parsing.
 */

import { EventEmitter } from 'events';

export interface ExtractionProgressState {
  stepIndex: number;
  step: string;
  progress: number;
  complete?: boolean;
  updatedAt: string;
}

const emitter = new EventEmitter();
const progressByUser = new Map<string, ExtractionProgressState>();

export function setExtractionProgress(userId: string, next: Omit<ExtractionProgressState, 'updatedAt'>) {
  const state: ExtractionProgressState = {
    ...next,
    updatedAt: new Date().toISOString(),
  };

  progressByUser.set(userId, state);
  emitter.emit(userId, state);

  if (state.complete) {
    // Clean up after a short delay so late subscribers can still read final state.
    setTimeout(() => {
      progressByUser.delete(userId);
    }, 120000);
  }
}

export function getExtractionProgress(userId: string) {
  return progressByUser.get(userId) || null;
}

export function subscribeExtractionProgress(
  userId: string,
  listener: (state: ExtractionProgressState) => void
) {
  emitter.on(userId, listener);
  return () => emitter.off(userId, listener);
}
