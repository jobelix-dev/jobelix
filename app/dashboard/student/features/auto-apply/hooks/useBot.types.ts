/**
 * useBot Hook Types
 * 
 * Extracted type definitions for the bot control state machine.
 */

// =============================================================================
// Bot State Machine
// =============================================================================

/** Bot state machine states */
export type BotState =
  | 'idle'       // No bot running, ready to start
  | 'launching'  // Bot starting up (checking, installing, launching)
  | 'running'    // Bot actively processing jobs
  | 'stopping'   // Stop requested, waiting for confirmation
  | 'stopped'    // User stopped the bot
  | 'completed'  // Bot finished successfully
  | 'failed';    // Bot encountered an error

/** Launch progress info (during 'launching' state) */
export interface LaunchProgress {
  stage: 'checking' | 'installing' | 'launching';
  message?: string;
  progress?: number; // 0-100 for installation progress
}

// =============================================================================
// Statistics
// =============================================================================

/** Session statistics */
export interface SessionStats {
  jobs_found: number;
  jobs_applied: number;
  jobs_failed: number;
  credits_used: number;
}

/** Historical totals across all sessions */
export interface HistoricalTotals {
  jobs_found: number;
  jobs_applied: number;
  jobs_failed: number;
  credits_used: number;
}

/** Empty stats constant */
export const EMPTY_STATS: SessionStats = {
  jobs_found: 0,
  jobs_applied: 0,
  jobs_failed: 0,
  credits_used: 0,
};

// =============================================================================
// IPC Payload
// =============================================================================

/** IPC payload from main process (matches StatusReporter output) */
export interface BotStatusPayload {
  stage: 'checking' | 'installing' | 'launching' | 'running' | 'completed' | 'failed' | 'stopped';
  message?: string;
  progress?: number;
  activity?: string;
  details?: Record<string, unknown>;
  stats?: {
    jobs_found?: number;
    jobs_applied?: number;
    jobs_failed?: number;
    credits_used?: number;
  };
}

// =============================================================================
// Hook Return Interface
// =============================================================================

/** Hook return interface */
export interface UseBotReturn {
  // State machine (single source of truth)
  botState: BotState;

  // Launch progress (only meaningful during 'launching')
  launchProgress: LaunchProgress | null;

  // Session data
  sessionStats: SessionStats;
  currentActivity: string | null;
  activityDetails: Record<string, unknown> | null;

  // Process info
  botPid: number | null;

  // Error message (when botState === 'failed')
  errorMessage: string | null;

  // Historical totals
  historicalTotals: HistoricalTotals;

  // Actions
  launchBot: () => Promise<{ success: boolean; error?: string }>;
  stopBot: () => Promise<{ success: boolean; error?: string }>;
  resetToIdle: () => void;

  // Electron detection
  isElectron: boolean;
}
