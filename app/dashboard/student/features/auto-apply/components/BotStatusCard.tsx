/**
 * BotStatusCard Component
 * 
 * Displays real-time bot session status with live updates.
 * Shows activity, stats, elapsed time, and provides stop control.
 */

'use client';

import { useMemo } from 'react';
import { BotSession } from '@/lib/shared/types';
import { 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  StopCircle,
  Clock,
  Briefcase,
  CheckSquare,
  XSquare,
  Zap,
  Loader2,
  Info
} from 'lucide-react';

interface HistoricalTotals {
  jobs_found: number;
  jobs_applied: number;
  jobs_failed: number;
  credits_used: number;
}

interface BotStatusCardProps {
  session: BotSession;
  historicalTotals: HistoricalTotals;
  onStop: () => Promise<{ success: boolean; error?: string }>;
  onLaunch?: () => Promise<{ success: boolean; error?: string }>;
  onShowInstructions?: () => void;
}

// Activity messages for user-friendly display
const ACTIVITY_MESSAGES: Record<string, string> = {
  'browser_opening': '🌐 Opening Chrome browser...',
  'browser_opened': '✅ Browser ready',
  'linkedin_login': '🔐 Logging into LinkedIn...',
  'linkedin_login_done': '✅ Logged into LinkedIn',
  'searching_jobs': '🔍 Searching for matching jobs...',
  'jobs_found': '📋 Jobs retrieved',
  'creating_resume': '📄 Generating tailored resume...',
  'answering_questions': '💬 Answering screening questions...',
  'submitting_application': '📤 Submitting application...',
  'application_submitted': '🎉 Application submitted!',
  'application_failed': '⚠️ Application encountered error',
  'applying_jobs': '⚡ Applying to jobs...',
  'finalizing': '🏁 Finishing up...',
};

// Status color and icon mapping
function getStatusDisplay(status: BotSession['status']) {
  switch (status) {
    case 'starting':
      return {
        icon: <Loader2 className="w-5 h-5 text-primary animate-spin" />,
        text: 'Starting...',
        color: 'text-primary'
      };
    case 'running':
      return {
        icon: <Play className="w-5 h-5 text-success" />,
        text: 'Running',
        color: 'text-success'
      };
    case 'completed':
      return {
        icon: <CheckCircle className="w-5 h-5 text-success" />,
        text: 'Completed',
        color: 'text-success'
      };
    case 'failed':
      return {
        icon: <XCircle className="w-5 h-5 text-danger" />,
        text: 'Failed',
        color: 'text-danger'
      };
    case 'stopped':
      return {
        icon: <StopCircle className="w-5 h-5 text-warning" />,
        text: 'Stopped',
        color: 'text-warning'
      };
  }
}

export default function BotStatusCard({ session, historicalTotals, onStop, onLaunch, onShowInstructions }: BotStatusCardProps) {
  const statusDisplay = getStatusDisplay(session.status);
  const isActive = session.status === 'starting' || session.status === 'running';
  const isCompleted = session.status === 'completed' || session.status === 'failed' || session.status === 'stopped';

  // Calculate display values (historical + current for active sessions)
  const displayStats = useMemo(() => {
    if (isActive) {
      // Show historical + current (x+y format)
      return {
        jobs_found: { total: historicalTotals.jobs_found, current: session.jobs_found },
        jobs_applied: { total: historicalTotals.jobs_applied, current: session.jobs_applied },
        jobs_failed: { total: historicalTotals.jobs_failed, current: session.jobs_failed },
        credits_used: { total: historicalTotals.credits_used, current: session.credits_used }
      };
    } else {
      // For completed sessions, just show historical total (already includes this session)
      return {
        jobs_found: { total: historicalTotals.jobs_found, current: 0 },
        jobs_applied: { total: historicalTotals.jobs_applied, current: 0 },
        jobs_failed: { total: historicalTotals.jobs_failed, current: 0 },
        credits_used: { total: historicalTotals.credits_used, current: 0 }
      };
    }
  }, [session, historicalTotals, isActive]);

  // Calculate elapsed time
  const elapsedTime = useMemo(() => {
    const start = new Date(session.started_at).getTime();
    const end = session.completed_at 
      ? new Date(session.completed_at).getTime()
      : Date.now();
    
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const diffSecs = Math.floor((diffMs % 60000) / 1000);
    
    if (diffMins > 0) {
      return `${diffMins}m ${diffSecs}s`;
    }
    return `${diffSecs}s`;
  }, [session.started_at, session.completed_at]);

  // Get current activity message
  const activityMessage = session.current_activity 
    ? ACTIVITY_MESSAGES[session.current_activity] || session.current_activity
    : null;

  // Handle stop button click
  const handleStop = async () => {
    if (!confirm('Are you sure you want to stop the bot? The current operation will complete before stopping.')) {
      return;
    }

    const result = await onStop();
    if (!result.success && result.error) {
      alert(`Failed to stop bot: ${result.error}`);
    }
  };

  return (
    <div className="bg-background rounded-xl p-6 shadow-sm border border-border">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {statusDisplay.icon}
          <div>
            <h3 className="font-semibold text-default">Bot Status</h3>
            <p className={`text-sm ${statusDisplay.color}`}>{statusDisplay.text}</p>
          </div>
        </div>
        
        {/* Action Button */}
        {isActive ? (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-danger/10 hover:bg-danger/20 text-danger rounded-lg transition-colors text-sm font-medium"
          >
            <StopCircle className="w-4 h-4" />
            Stop Bot
          </button>
        ) : isCompleted && onLaunch ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onLaunch}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Play className="w-4 h-4" />
              Launch Again
            </button>
            {onShowInstructions && (
              <button
                onClick={onShowInstructions}
                className="p-2 bg-muted/20 hover:bg-muted/30 text-muted hover:text-default rounded-lg transition-colors"
                title="View instructions"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : null}
      </div>

      {/* Current Activity */}
      {isActive && activityMessage && (
        <div className="mb-6 p-3 bg-primary-subtle/10 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm text-default">
              {activityMessage}
              {session.activity_details?.company && (
                <span className="font-medium"> • {session.activity_details.company}</span>
              )}
              {session.activity_details?.job_title && (
                <span className="text-muted"> - {session.activity_details.job_title}</span>
              )}
            </span>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted">Jobs Found</span>
          </div>
          <p className="text-2xl font-bold text-default">
            {displayStats.jobs_found.current > 0 
              ? `${displayStats.jobs_found.total}+${displayStats.jobs_found.current}`
              : displayStats.jobs_found.total}
          </p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-4 h-4 text-success" />
            <span className="text-xs text-muted">Applied</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {displayStats.jobs_applied.current > 0
              ? `${displayStats.jobs_applied.total}+${displayStats.jobs_applied.current}`
              : displayStats.jobs_applied.total}
          </p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <XSquare className="w-4 h-4 text-danger" />
            <span className="text-xs text-muted">Failed</span>
          </div>
          <p className="text-2xl font-bold text-danger">
            {displayStats.jobs_failed.current > 0
              ? `${displayStats.jobs_failed.total}+${displayStats.jobs_failed.current}`
              : displayStats.jobs_failed.total}
          </p>
        </div>
        
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-warning" />
            <span className="text-xs text-muted">Credits Used</span>
          </div>
          <p className="text-2xl font-bold text-warning">
            {displayStats.credits_used.current > 0
              ? `${displayStats.credits_used.total}+${displayStats.credits_used.current}`
              : displayStats.credits_used.total}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-muted border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>Elapsed: {elapsedTime}</span>
        </div>
        
        {session.bot_version && (
          <span>Bot v{session.bot_version}</span>
        )}
      </div>

      {/* Error Display */}
      {session.status === 'failed' && session.error_message && (
        <div className="mt-4 p-3 bg-danger/10 rounded-lg">
          <p className="text-sm text-danger">
            <strong>Error:</strong> {session.error_message}
          </p>
        </div>
      )}

      {/* Stopped Message */}
      {session.status === 'stopped' && (
        <div className="mt-4 p-3 bg-warning/10 rounded-lg">
          <p className="text-sm text-warning">
            Bot was manually stopped by user.
          </p>
        </div>
      )}
    </div>
  );
}
