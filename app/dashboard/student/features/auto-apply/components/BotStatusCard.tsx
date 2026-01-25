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
  CheckCircle, 
  XCircle, 
  OctagonX,
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
        color: 'text-primary',
        pill: 'bg-primary/10 text-primary'
      };
    case 'running':
      return {
        icon: <Play className="w-5 h-5 text-success" />,
        text: 'Running',
        color: 'text-success',
        pill: 'bg-success/10 text-success'
      };
    case 'completed':
      return {
        icon: <CheckCircle className="w-5 h-5 text-success" />,
        text: 'Completed',
        color: 'text-success',
        pill: 'bg-success/10 text-success'
      };
    case 'failed':
      return {
        icon: <XCircle className="w-5 h-5 text-danger" />,
        text: 'Failed',
        color: 'text-danger',
        pill: 'bg-danger/10 text-danger'
      };
    case 'stopped':
      return {
        icon: <OctagonX className="w-5 h-5 text-warning" />,
        text: 'Stopped',
        color: 'text-warning',
        pill: 'bg-warning/10 text-warning'
      };
  }
}

export default function BotStatusCard({ session, historicalTotals, onStop, onLaunch, onShowInstructions }: BotStatusCardProps) {
  const statusDisplay = getStatusDisplay(session.status);
  const isActive = session.status === 'starting' || session.status === 'running';
  const isCompleted = session.status === 'completed' || session.status === 'failed' || session.status === 'stopped';

  // Calculate display values (combined totals + session delta)
  const displayStats = useMemo(() => {
    const current = isActive
      ? {
          jobs_found: session.jobs_found,
          jobs_applied: session.jobs_applied,
          jobs_failed: session.jobs_failed,
          credits_used: session.credits_used
        }
      : { jobs_found: 0, jobs_applied: 0, jobs_failed: 0, credits_used: 0 };

    return {
      totals: {
        jobs_found: historicalTotals.jobs_found + current.jobs_found,
        jobs_applied: historicalTotals.jobs_applied + current.jobs_applied,
        jobs_failed: historicalTotals.jobs_failed + current.jobs_failed,
        credits_used: historicalTotals.credits_used + current.credits_used
      },
      current
    };
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
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {statusDisplay.icon}
          <div>
            <h3 className="font-semibold text-default">Bot Status</h3>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusDisplay.pill}`}>
              {statusDisplay.text}
            </span>
          </div>
        </div>
        
        {/* Action Button */}
        {isActive ? (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg transition-colors text-sm font-semibold shadow-sm"
          >
            <OctagonX className="w-4 h-4" />
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
        <div className="p-3 bg-info-subtle/10 rounded-lg">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg p-3 bg-primary-subtle/20">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted">Jobs Found</span>
          </div>
          <p className="text-2xl font-bold text-default">
            {displayStats.totals.jobs_found}
          </p>
          {isActive && displayStats.current.jobs_found > 0 && (
            <p className="text-xs text-primary mt-1">
              Session {displayStats.current.jobs_found}
            </p>
          )}
        </div>
        
        <div className="rounded-lg p-3 bg-success-subtle/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-4 h-4 text-success" />
            <span className="text-xs text-muted">Applied</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {displayStats.totals.jobs_applied}
          </p>
          {isActive && displayStats.current.jobs_applied > 0 && (
            <p className="text-xs text-success mt-1">
              Session {displayStats.current.jobs_applied}
            </p>
          )}
        </div>
        
        <div className="rounded-lg p-3 bg-error-subtle/20">
          <div className="flex items-center gap-2 mb-1">
            <XSquare className="w-4 h-4 text-danger" />
            <span className="text-xs text-muted">Failed</span>
          </div>
          <p className="text-2xl font-bold text-danger">
            {displayStats.totals.jobs_failed}
          </p>
          {isActive && displayStats.current.jobs_failed > 0 && (
            <p className="text-xs text-danger mt-1">
              Session {displayStats.current.jobs_failed}
            </p>
          )}
        </div>
        
        <div className="rounded-lg p-3 bg-warning-subtle/20">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-warning" />
            <span className="text-xs text-muted">Credits Used</span>
          </div>
          <p className="text-2xl font-bold text-warning">
            {displayStats.totals.credits_used}
          </p>
          {isActive && displayStats.current.credits_used > 0 && (
            <p className="text-xs text-warning mt-1">
              Session {displayStats.current.credits_used}
            </p>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs text-muted">
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
