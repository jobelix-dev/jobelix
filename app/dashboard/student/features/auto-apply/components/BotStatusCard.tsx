/**
 * BotStatusCard Component
 * 
 * Displays real-time bot session status with live updates.
 * Shows activity, stats, elapsed time, and provides stop control.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Info,
  Eye
} from 'lucide-react';
import { useConfirmDialog } from '@/app/components/useConfirmDialog';

interface HistoricalTotals {
  jobs_found: number;
  jobs_applied: number;
  jobs_failed: number;
  credits_used: number;
}

type BotLaunchStage = 'checking' | 'installing' | 'launching' | 'running';

interface BotLaunchStatus {
  stage: BotLaunchStage;
  message?: string;
  progress?: number;
  logs: string[];
}

interface BotStatusCardProps {
  session: BotSession;
  historicalTotals: HistoricalTotals;
  onStop: () => Promise<{ success: boolean; error?: string }>;
  onLaunch?: () => Promise<{ success: boolean; error?: string }>;
  onShowInstructions?: () => void;
  launchStatus?: BotLaunchStatus | null;
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
        pill: 'bg-primary-subtle/20 text-primary border-primary/40'
      };
    case 'running':
      return {
        icon: <Play className="w-5 h-5 text-primary" />,
        text: 'Running',
        pill: 'bg-primary-subtle/20 text-primary border-primary/40'
      };
    case 'completed':
      return {
        icon: <CheckCircle className="w-5 h-5 text-success" />,
        text: 'Completed',
        pill: 'bg-success-subtle/20 text-success border-success/40'
      };
    case 'failed':
      return {
        icon: <XCircle className="w-5 h-5 text-error" />,
        text: 'Failed',
        pill: 'bg-error-subtle/20 text-error border-error/40'
      };
    case 'stopped':
      return {
        icon: <OctagonX className="w-5 h-5 text-warning" />,
        text: 'Stopped',
        pill: 'bg-warning-subtle/20 text-warning border-warning/40'
      };
  }
}

export default function BotStatusCard({ session, historicalTotals, onStop, onLaunch, onShowInstructions, launchStatus }: BotStatusCardProps) {
  const { confirm, alert, ConfirmDialogComponent } = useConfirmDialog();
  const statusDisplay = getStatusDisplay(session.status);
  const isActive = session.status === 'starting' || session.status === 'running';
  const isCompleted = session.status === 'completed' || session.status === 'failed' || session.status === 'stopped';
  const installProgress =
    typeof launchStatus?.progress === 'number'
      ? Math.max(0, Math.min(100, launchStatus.progress))
      : null;
  const isInstalling = launchStatus?.stage === 'installing';
  const showSetupMessage =
    launchStatus && ['checking', 'launching'].includes(launchStatus.stage);
  const [simulatedProgress, setSimulatedProgress] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    if (!session.started_at) return 0;
    const start = new Date(session.started_at).getTime();
    const end = session.completed_at
      ? new Date(session.completed_at).getTime()
      : Date.now();
    return Math.max(0, Math.floor((end - start) / 1000));
  });

  useEffect(() => {
    if (!isInstalling) {
      setSimulatedProgress(null);
      return;
    }
    if (typeof installProgress === 'number') {
      setSimulatedProgress(null);
      return;
    }

    const intervalMs = 150;
    const totalMs = 15000;
    const increment = 99 / (totalMs / intervalMs);
    setSimulatedProgress(0);

    const intervalId = window.setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev === null) return 0;
        return Math.min(99, prev + increment);
      });
    }, intervalMs);

    return () => window.clearInterval(intervalId);
  }, [isInstalling, installProgress]);

  const displayProgress =
    typeof installProgress === 'number'
      ? Math.max(installProgress, simulatedProgress ?? 0)
      : simulatedProgress ?? 0;
  const progressValue = Math.max(0, Math.min(100, Math.round(displayProgress)));

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

  useEffect(() => {
    const getElapsedSeconds = () => {
      if (!session.started_at) return 0;
      const start = new Date(session.started_at).getTime();
      const end = session.completed_at
        ? new Date(session.completed_at).getTime()
        : Date.now();
      return Math.max(0, Math.floor((end - start) / 1000));
    };

    setElapsedSeconds(getElapsedSeconds());

    if (!isActive || session.completed_at) return;

    const interval = setInterval(() => {
      setElapsedSeconds(getElapsedSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [session.started_at, session.completed_at, isActive]);

  // Calculate elapsed time
  const elapsedTime = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  }, [elapsedSeconds]);

  // Get current activity message
  const activityMessage = session.current_activity 
    ? ACTIVITY_MESSAGES[session.current_activity] || session.current_activity
    : null;
  const showActivityCard = isActive && activityMessage && !isInstalling;

  // Handle stop button click
  const handleStop = async () => {
    // Double-check status before showing confirmation
    if (session.status !== 'starting' && session.status !== 'running') {
      await alert(
        `Cannot stop bot: session is already ${session.status}. Try refreshing the page.`,
        { title: 'Bot Status Changed' }
      );
      return;
    }

    const confirmed = await confirm(
      'Are you sure you want to stop the bot? The current operation will complete before stopping.',
      { title: 'Stop Bot', variant: 'danger', confirmText: 'Stop', cancelText: 'Cancel' }
    );
    if (!confirmed) {
      return;
    }

    const result = await onStop();
    if (!result.success && result.error) {
      await alert(`Failed to stop bot: ${result.error}`, { title: 'Error' });
    }
  };

  return (
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-default mb-1">Bot Status</h3>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusDisplay.pill}`}>
            {statusDisplay.icon}
            <span className="ml-1.5">{statusDisplay.text}</span>
          </span>
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

      {isInstalling && launchStatus && (
        <div className="rounded-xl border border-primary/20 bg-primary-subtle/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <p className="text-sm font-semibold text-default">Preparing browser</p>
                <p className="text-xs text-muted">
                  {launchStatus.message || 'Downloading Chromium for first-time setup.'}
                </p>
              </div>
              <div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-150"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                  <span>{progressValue}%</span>
                </div>
              </div>
              {launchStatus.logs.length > 0 && (
                <div className="max-h-28 overflow-y-auto rounded-md border border-border bg-muted/10 px-2 py-1 text-[11px] text-muted font-mono">
                  {launchStatus.logs.slice(-8).map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isInstalling && showSetupMessage && !showActivityCard && launchStatus && (
        <div className="rounded-lg border border-primary/20 bg-primary-subtle/10 p-3">
          <div className="flex items-center gap-2 text-sm text-default">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium">
              {launchStatus.message ||
                (launchStatus.stage === 'checking' ? 'Checking browser...' : 'Launching bot...')}
            </span>
          </div>
        </div>
      )}

      {/* Current Activity */}
      {showActivityCard && (
        <div className="p-3 bg-primary-subtle/20 border border-primary/20 rounded-lg">
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
        <div className="rounded-lg p-3 bg-success-subtle/10 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-success" />
            <span className="text-xs text-muted">Jobs Found</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {displayStats.totals.jobs_found}
          </p>
          {isActive && displayStats.current.jobs_found > 0 && (
            <p className="text-xs text-success mt-1">
              +{displayStats.current.jobs_found} this session
            </p>
          )}
        </div>
        
        <div className="rounded-lg p-3 bg-success-subtle/10 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-4 h-4 text-success" />
            <a
              href="https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-subtle/20 px-2 py-0.5 text-[11px] font-medium text-success transition-colors hover:bg-success-subtle/30"
              title="Open applied jobs on LinkedIn"
            >
              Applied jobs
              <Eye className="h-3 w-3" />
            </a>
          </div>
          <p className="text-2xl font-bold text-success">
            {displayStats.totals.jobs_applied}
          </p>
          {isActive && displayStats.current.jobs_applied > 0 && (
            <p className="text-xs text-success mt-1">
              +{displayStats.current.jobs_applied} this session
            </p>
          )}
        </div>
        
        <div className="rounded-lg p-3 bg-success-subtle/10 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <XSquare className="w-4 h-4 text-success" />
            <span className="text-xs text-muted">Failed</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {displayStats.totals.jobs_failed}
          </p>
          {isActive && displayStats.current.jobs_failed > 0 && (
            <p className="text-xs text-success mt-1">
              +{displayStats.current.jobs_failed} this session
            </p>
          )}
        </div>
        
        <div className="rounded-lg p-3 bg-success-subtle/10 border border-success/20">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-success" />
            <span className="text-xs text-muted">Credits Used</span>
          </div>
          <p className="text-2xl font-bold text-success">
            {displayStats.totals.credits_used}
          </p>
          {isActive && displayStats.current.credits_used > 0 && (
            <p className="text-xs text-success mt-1">
              +{displayStats.current.credits_used} this session
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

      {/* Stopped Message - Simple and clean */}
      {session.status === 'stopped' && (
        <div className="p-3 bg-muted/10 border border-muted/20 rounded-lg">
          <p className="text-sm text-muted">
            Session stopped. Ready to launch again when needed.
          </p>
        </div>
      )}

      {/* Failed Message - User-friendly, no technical details */}
      {session.status === 'failed' && (
        <div className="p-3 bg-muted/10 border border-muted/20 rounded-lg">
          <p className="text-sm text-muted">
            Session ended. The bot will retry automatically on next launch.
          </p>
        </div>
      )}
      
      {ConfirmDialogComponent}
    </div>
  );
}
