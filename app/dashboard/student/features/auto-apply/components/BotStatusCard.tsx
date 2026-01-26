/**
 * BotStatusCard Component
 * 
 * Displays real-time bot session status with live updates.
 * Shows activity, stats, elapsed time, and provides stop control.
 * Updated: 2026-01-27
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { BotSession, BotLaunchStatus, HistoricalTotals } from '@/lib/shared/types';
import { 
  ACTIVITY_MESSAGES, 
  PROGRESS_SIMULATION_INTERVAL_MS, 
  SIMULATED_INSTALL_DURATION_MS,
  MAX_LOGS_TO_DISPLAY 
} from '@/lib/bot-status/constants';

import * as Icons from 'lucide-react';
import { useConfirmDialog } from '@/app/components/useConfirmDialog';

interface BotStatusCardProps {
  session: BotSession;
  historicalTotals: HistoricalTotals;
  onStop: () => Promise<{ success: boolean; error?: string }>;
  onLaunch?: () => Promise<{ success: boolean; error?: string }>;
  onShowInstructions?: () => void;
  launchStatus?: BotLaunchStatus | null;
}

// Reusable stat card component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  currentValue?: number;
  href?: string;
  isActive?: boolean;
}

function StatCard({ icon, label, value, currentValue = 0, href, isActive }: StatCardProps) {
  const labelContent = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-success hover:text-success/80 transition-colors"
      title={`View ${label.toLowerCase()} on LinkedIn`}
    >
      {label}
      <Icons.Eye className="h-3 w-3" />
    </a>
  ) : (
    <span className="text-xs font-medium text-muted">{label}</span>
  );

  return (
    <div className="rounded-lg p-4 bg-gradient-to-br from-success-subtle/10 to-success-subtle/5 border border-success/15 hover:border-success/25 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 rounded-md bg-success/10">{icon}</div>
        {labelContent}
      </div>
      <p className="text-2xl font-bold text-success">{value}</p>
      {isActive && currentValue > 0 && (
        <p className="text-xs text-success/80 mt-1.5">+{currentValue} this session</p>
      )}
    </div>
  );
}

export default function BotStatusCard({ session, historicalTotals, onStop, onLaunch, onShowInstructions, launchStatus }: BotStatusCardProps) {
  const { confirm, alert, ConfirmDialogComponent } = useConfirmDialog();
  const isActive = session.status === 'starting' || session.status === 'running';
  const isCompleted = session.status === 'completed' || session.status === 'failed' || session.status === 'stopped';
  const isStopped = session.status === 'stopped';
  const isFailed = session.status === 'failed';
  const isInstalling = launchStatus?.stage === 'installing';
  const showSetupMessage = launchStatus && ['checking', 'launching'].includes(launchStatus.stage);
  
  const [simulatedProgress, setSimulatedProgress] = useState<number | null>(null);

  // Simulated progress for browser installation
  useEffect(() => {
    if (!isInstalling || typeof launchStatus?.progress === 'number') {
      setSimulatedProgress(null);
      return;
    }

    const increment = 99 / (SIMULATED_INSTALL_DURATION_MS / PROGRESS_SIMULATION_INTERVAL_MS);
    setSimulatedProgress(0);

    const intervalId = window.setInterval(() => {
      setSimulatedProgress((prev) => (prev === null ? 0 : Math.min(99, prev + increment)));
    }, PROGRESS_SIMULATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isInstalling, launchStatus?.progress]);

  const progressValue = Math.max(0, Math.min(100, Math.round(
    typeof launchStatus?.progress === 'number'
      ? Math.max(launchStatus.progress, simulatedProgress ?? 0)
      : simulatedProgress ?? 0
  )));

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
  }, [
    session.jobs_found,
    session.jobs_applied,
    session.jobs_failed,
    session.credits_used,
    historicalTotals.jobs_found,
    historicalTotals.jobs_applied,
    historicalTotals.jobs_failed,
    historicalTotals.credits_used,
    isActive
  ]);

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
        <h3 className="text-lg font-semibold text-default">Bot Session</h3>
        
        {/* Action Button */}
        {isActive ? (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow"
          >
            <Icons.OctagonX className="w-4 h-4" />
            Stop Bot
          </button>
        ) : isCompleted && onLaunch ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onLaunch}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow"
            >
              <Icons.Play className="w-4 h-4" />
              Launch Again
            </button>
            {onShowInstructions && (
              <button
                onClick={onShowInstructions}
                className="p-2 bg-muted/20 hover:bg-muted/30 text-muted hover:text-default rounded-lg transition-colors"
                title="View instructions"
              >
                <Icons.Info className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : null}
      </div>

      {isInstalling && launchStatus && (
        <div className="rounded-lg border border-primary/30 bg-primary-subtle/10 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Icons.Loader2 className="h-4 w-4 animate-spin text-primary" />
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
                  {launchStatus.logs.slice(-MAX_LOGS_TO_DISPLAY).map((line, index) => (
                    <div key={`${index}-${line.slice(0, 20)}`}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isInstalling && showSetupMessage && !showActivityCard && launchStatus && (
        <div className="rounded-lg border border-primary/30 bg-primary-subtle/10 p-3">
          <div className="flex items-center gap-2 text-sm text-default">
            <Icons.Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="font-medium">
              {launchStatus.message ||
                (launchStatus.stage === 'checking' ? 'Checking browser...' : 'Launching bot...')}
            </span>
          </div>
        </div>
      )}

      {/* Current Activity */}
      {showActivityCard && (
        <div className="p-3 bg-primary-subtle/15 border border-primary/20 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0" />
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={<Icons.Briefcase className="w-3.5 h-3.5 text-success" />}
          label="Jobs Found"
          value={displayStats.totals.jobs_found}
          currentValue={displayStats.current.jobs_found}
          isActive={isActive}
        />
        <StatCard
          icon={<Icons.CheckSquare className="w-3.5 h-3.5 text-success" />}
          label="Applied"
          value={displayStats.totals.jobs_applied}
          currentValue={displayStats.current.jobs_applied}
          href="https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED"
          isActive={isActive}
        />
        <StatCard
          icon={<Icons.XSquare className="w-3.5 h-3.5 text-success" />}
          label="Failed"
          value={displayStats.totals.jobs_failed}
          currentValue={displayStats.current.jobs_failed}
          isActive={isActive}
        />
        <StatCard
          icon={<Icons.Zap className="w-3.5 h-3.5 text-success" />}
          label="Credits used"
          value={displayStats.totals.credits_used}
          currentValue={displayStats.current.credits_used}
          isActive={isActive}
        />
      </div>

      {/* Status Messages - Clean card layout without icons */}
      {isStopped && (
        <div className="p-4 bg-warning-subtle/10 rounded-lg">
          <p className="text-sm font-medium text-default mb-1">Session Stopped</p>
          <p className="text-sm text-muted">
            The bot was manually stopped and will not restart automatically. Click "Launch Again" to start a new session.
          </p>
        </div>
      )}

      {isFailed && (
        <div className="p-4 bg-error-subtle/10 rounded-lg">
          <p className="text-sm font-medium text-default mb-1">Session Failed</p>
          <p className="text-sm text-muted">
            The bot encountered an error and stopped. You can launch a new session when ready.
          </p>
        </div>
      )}
      
      {ConfirmDialogComponent}
    </div>
  );
}
