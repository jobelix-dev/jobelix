export type BotSessionStatus = 'starting' | 'running' | 'completed' | 'failed' | 'stopped';

export interface BotSession {
  id: string;
  user_id: string;
  status: BotSessionStatus;
  started_at: string;
  last_heartbeat_at: string | null;
  completed_at: string | null;
  current_activity: string | null;
  activity_details: Record<string, unknown> | null;
  jobs_found: number;
  jobs_applied: number;
  jobs_failed: number;
  credits_used: number;
  error_message: string | null;
  error_details: Record<string, unknown> | null;
  bot_version: string | null;
  platform: string | null;
  created_at: string;
  updated_at: string;
}

export type BotLaunchStage = 'checking' | 'installing' | 'launching' | 'running';

export interface BotLaunchStatus {
  stage: BotLaunchStage;
  message?: string;
  progress?: number;
  logs: string[];
}

export interface HistoricalTotals {
  jobs_found: number;
  jobs_applied: number;
  jobs_failed: number;
  credits_used: number;
}
