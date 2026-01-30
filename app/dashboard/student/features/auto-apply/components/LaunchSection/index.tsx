/**
 * LaunchSection - Bot Status & Control Component
 *
 * Always shows a consistent bot status card with:
 *   - Launch/Stop button in header
 *   - Activity banner (when running)
 *   - Stats grid (always visible)
 *   - Status messages (errors, completion, etc.)
 *
 * This design ensures the UI is stable across page reloads.
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Rocket,
  OctagonX,
  Loader2,
  Play,
  AlertCircle,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useConfirmDialog } from '@/app/components/useConfirmDialog';
import { useSimulatedProgress } from '@/app/hooks';
import type { BotState, LaunchProgress, SessionStats, HistoricalTotals } from '../../hooks/useBot';
import {
  InstructionsModal,
  DesktopRequiredBanner,
  InstallProgressBanner,
  SetupMessageBanner,
  ActivityBanner,
  ProcessInfoBanner,
  StatsGrid,
  type DisplayStats,
} from './shared';

// =============================================================================
// Types
// =============================================================================

interface LaunchSectionProps {
  // State machine
  botState: BotState;
  launchProgress: LaunchProgress | null;

  // Session data
  sessionStats: SessionStats;
  historicalTotals: HistoricalTotals;
  currentActivity: string | null;
  activityDetails: Record<string, unknown> | null;

  // Process info
  botPid: number | null;

  // Error
  errorMessage: string | null;

  // Permissions
  canLaunch: boolean;
  hasCredits: boolean;

  // Actions
  onLaunch: () => Promise<{ success: boolean; error?: string }>;
  onStop: () => Promise<{ success: boolean; error?: string }>;
  onReset: () => void;
}

// Activity display messages
const ACTIVITY_MESSAGES: Record<string, string> = {
  initializing: 'Initializing...',
  starting: 'Starting up...',
  authenticating: 'Logging into LinkedIn...',
  searching_jobs: 'Searching for jobs...',
  applying_jobs: 'Applying to jobs...',
  answering_questions: 'Answering application questions...',
  submitting_application: 'Submitting application...',
  waiting: 'Waiting...',
  finalizing: 'Finalizing...',
};

// =============================================================================
// Main Component - Unified Bot Status Card
// =============================================================================

export default function LaunchSection({
  botState,
  launchProgress,
  sessionStats,
  historicalTotals,
  currentActivity,
  activityDetails,
  botPid,
  errorMessage,
  canLaunch,
  hasCredits,
  onLaunch,
  onStop,
}: LaunchSectionProps) {
  const { confirm, alert, ConfirmDialogComponent } = useConfirmDialog();
  const [showInstructions, setShowInstructions] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Simulated progress for installation
  const progressValue = useSimulatedProgress({
    isActive: launchProgress?.stage === 'installing',
    realProgress: launchProgress?.progress,
  });

  // Derived state
  const isActive = ['launching', 'running', 'stopping'].includes(botState);
  const isEnded = ['stopped', 'completed', 'failed'].includes(botState);
  const canStart = ['idle', 'stopped', 'completed', 'failed'].includes(botState);

  // Combined stats for display
  const displayStats = useMemo<DisplayStats>(() => {
    // When ended, historical already includes this session
    if (isEnded) {
      return {
        totals: historicalTotals,
        current: sessionStats,
      };
    }
    // When active, combine historical + current session
    return {
      totals: {
        jobs_found: historicalTotals.jobs_found + sessionStats.jobs_found,
        jobs_applied: historicalTotals.jobs_applied + sessionStats.jobs_applied,
        jobs_failed: historicalTotals.jobs_failed + sessionStats.jobs_failed,
        credits_used: historicalTotals.credits_used + sessionStats.credits_used,
      },
      current: sessionStats,
    };
  }, [historicalTotals, sessionStats, isEnded]);

  const activityMessage = currentActivity
    ? ACTIVITY_MESSAGES[currentActivity] || currentActivity
    : null;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleLaunchClick = () => {
    if (!canLaunch) return;

    // Check desktop app
    if (typeof window !== 'undefined' && !window.electronAPI) {
      onLaunch(); // Will trigger DESKTOP_REQUIRED error
      return;
    }

    // Show instructions before launch
    setShowInstructions(true);
  };

  const handleConfirmLaunch = async () => {
    setShowInstructions(false);
    setLaunching(true);
    await onLaunch();
    setLaunching(false);
  };

  const handleStop = async () => {
    if (stopping) return;

    const confirmed = await confirm(
      'Are you sure you want to stop the bot? This will immediately terminate the browser process.',
      { title: 'Stop Bot', variant: 'danger', confirmText: 'Stop', cancelText: 'Cancel' }
    );
    if (!confirmed) return;

    setStopping(true);
    const result = await onStop();
    setStopping(false);

    if (!result.success && result.error) {
      await alert(`Failed to stop bot: ${result.error}`, { title: 'Error' });
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      {/* Instructions Modal */}
      {showInstructions && (
        <InstructionsModal
          onClose={() => setShowInstructions(false)}
          onConfirm={handleConfirmLaunch}
        />
      )}

      {/* Header with title and action button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-default">
          {isActive ? 'Bot Running' : 'Auto Apply Bot'}
        </h3>

        {/* Action Button */}
        {canStart && !isActive && (
          <button
            onClick={handleLaunchClick}
            disabled={launching || !canLaunch}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {launching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                {botState === 'idle' ? <Rocket className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {botState === 'idle' ? 'Launch Bot' : 'Start Bot'}
              </>
            )}
          </button>
        )}

        {isActive && (
          <button
            onClick={handleStop}
            disabled={stopping || botState === 'stopping'}
            className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {stopping || botState === 'stopping' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Stopping...
              </>
            ) : (
              <>
                <OctagonX className="w-4 h-4" />
                Stop Bot
              </>
            )}
          </button>
        )}
      </div>

      {/* Process Info (when running) */}
      {botPid && isActive && <ProcessInfoBanner pid={botPid} />}

      {/* Launch Progress (when launching) */}
      {botState === 'launching' && (
        <>
          {launchProgress?.stage === 'installing' ? (
            <InstallProgressBanner progress={progressValue} />
          ) : launchProgress?.stage === 'checking' || launchProgress?.stage === 'launching' ? (
            <SetupMessageBanner message={launchProgress.message} stage={launchProgress.stage} />
          ) : (
            <div className="p-3 bg-primary-subtle/15 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-sm text-default">Starting bot...</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Stopping Banner */}
      {botState === 'stopping' && (
        <div className="p-3 bg-warning-subtle/15 border border-warning/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-warning animate-spin" />
            <span className="text-sm text-default">Stopping bot...</span>
          </div>
        </div>
      )}

      {/* Activity Banner (when running) */}
      {activityMessage && botState === 'running' && (
        <ActivityBanner
          message={activityMessage}
          company={activityDetails?.company as string | undefined}
          jobTitle={activityDetails?.job_title as string | undefined}
        />
      )}

      {/* Status Messages */}
      {botState === 'stopped' && (
        <StatusMessage
          variant="warning"
          icon={<AlertCircle className="w-4 h-4" />}
          message="Bot was stopped."
        />
      )}
      {botState === 'completed' && (
        <StatusMessage
          variant="success"
          icon={<CheckCircle className="w-4 h-4" />}
          message="Bot finished successfully."
        />
      )}
      {botState === 'failed' && (
        <StatusMessage
          variant="error"
          icon={<XCircle className="w-4 h-4" />}
          message={errorMessage || 'Bot encountered an error.'}
        />
      )}

      {/* Desktop Required Banner */}
      {errorMessage === 'DESKTOP_REQUIRED' && botState === 'idle' && <DesktopRequiredBanner />}

      {/* Permission Warning (idle state only) */}
      {botState === 'idle' && !canLaunch && (
        <div className="p-3 bg-warning-subtle/20 border border-warning rounded-lg text-sm text-warning flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {!hasCredits
            ? 'You need credits to launch the bot'
            : 'Please complete your profile and job preferences first'}
        </div>
      )}

      {/* Stats Grid - Always visible */}
      <StatsGrid stats={displayStats} isActive={isActive} />

      {ConfirmDialogComponent}
    </div>
  );
}

// =============================================================================
// Helper Components
// =============================================================================

interface StatusMessageProps {
  variant: 'success' | 'warning' | 'error';
  icon: React.ReactNode;
  message: string;
}

function StatusMessage({ variant, icon, message }: StatusMessageProps) {
  const variantStyles = {
    success: 'bg-success-subtle/15 border-success/20 text-success',
    warning: 'bg-warning-subtle/15 border-warning/20 text-warning',
    error: 'bg-error-subtle/15 border-error/20 text-error',
  };

  return (
    <div className={`p-3 border rounded-lg ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{message}</span>
      </div>
    </div>
  );
}
