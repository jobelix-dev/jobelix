/**
 * LaunchSection - Bot Control Component
 *
 * Renders the appropriate UI based on bot state:
 *   - IDLE: Launch button with instructions modal
 *   - LAUNCHING: Progress indicators with stop option
 *   - RUNNING: Live status card with stop button
 *   - STOPPING: Status card with stopping indicator
 *   - STOPPED/COMPLETED/FAILED: Summary with restart option
 */

'use client';

import { useState, useMemo } from 'react';
import {
  Rocket,
  OctagonX,
  Loader2,
  Play,
  AlertCircle,
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
  StatusBanner,
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
// Main Component
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
  // Render based on state machine
  switch (botState) {
    case 'idle':
      return (
        <IdleState
          canLaunch={canLaunch}
          hasCredits={hasCredits}
          onLaunch={onLaunch}
          errorMessage={errorMessage}
        />
      );

    case 'launching':
      return (
        <LaunchingState
          launchProgress={launchProgress}
          onStop={onStop}
        />
      );

    case 'running':
    case 'stopping':
      return (
        <RunningState
          botState={botState}
          sessionStats={sessionStats}
          historicalTotals={historicalTotals}
          currentActivity={currentActivity}
          activityDetails={activityDetails}
          botPid={botPid}
          onStop={onStop}
        />
      );

    case 'stopped':
    case 'completed':
    case 'failed':
      return (
        <EndedState
          botState={botState}
          sessionStats={sessionStats}
          historicalTotals={historicalTotals}
          errorMessage={errorMessage}
          canLaunch={canLaunch}
          onLaunch={onLaunch}
        />
      );

    default:
      return null;
  }
}

// =============================================================================
// State Components
// =============================================================================

/**
 * IDLE State - Show launch button
 */
interface IdleStateProps {
  canLaunch: boolean;
  hasCredits: boolean;
  onLaunch: () => Promise<{ success: boolean; error?: string }>;
  errorMessage: string | null;
}

function IdleState({ canLaunch, hasCredits, onLaunch, errorMessage }: IdleStateProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [launching, setLaunching] = useState(false);

  const handleClick = () => {
    if (!canLaunch) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }

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

  return (
    <div className="space-y-3">
      {/* Instructions Modal */}
      {showInstructions && (
        <InstructionsModal
          onClose={() => setShowInstructions(false)}
          onConfirm={handleConfirmLaunch}
        />
      )}

      {/* Launch Button */}
      <button
        onClick={handleClick}
        disabled={launching}
        className="w-full px-6 py-4 text-base font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Rocket className="w-6 h-6" />
        {launching ? 'Launching Bot...' : 'Launch Auto Apply Bot'}
      </button>

      {/* Desktop Required Banner */}
      {errorMessage === 'DESKTOP_REQUIRED' && <DesktopRequiredBanner />}

      {/* Error Banner */}
      {errorMessage && errorMessage !== 'DESKTOP_REQUIRED' && (
        <div className="p-3 bg-error-subtle/20 border border-error rounded-lg text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Warning Banner */}
      {showWarning && !canLaunch && (
        <div className="p-3 bg-warning-subtle/20 border border-warning rounded-lg text-sm text-warning flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {!hasCredits
            ? 'You need credits to launch the bot'
            : 'Please complete your profile and job preferences first'}
        </div>
      )}
    </div>
  );
}

/**
 * LAUNCHING State - Show progress and stop option
 */
interface LaunchingStateProps {
  launchProgress: LaunchProgress | null;
  onStop: () => Promise<{ success: boolean; error?: string }>;
}

function LaunchingState({ launchProgress, onStop }: LaunchingStateProps) {
  const [stopping, setStopping] = useState(false);

  // Simulated progress for installation
  const progressValue = useSimulatedProgress({
    isActive: launchProgress?.stage === 'installing',
    realProgress: launchProgress?.progress,
  });

  const handleStop = async () => {
    setStopping(true);
    await onStop();
    setStopping(false);
  };

  return (
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-default">Starting Bot</h3>
        <button
          onClick={handleStop}
          disabled={stopping}
          className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {stopping ? (
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
      </div>

      {/* Progress Indicator */}
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
    </div>
  );
}

/**
 * RUNNING/STOPPING State - Live status with stop button
 */
interface RunningStateProps {
  botState: 'running' | 'stopping';
  sessionStats: SessionStats;
  historicalTotals: HistoricalTotals;
  currentActivity: string | null;
  activityDetails: Record<string, unknown> | null;
  botPid: number | null;
  onStop: () => Promise<{ success: boolean; error?: string }>;
}

function RunningState({
  botState,
  sessionStats,
  historicalTotals,
  currentActivity,
  activityDetails,
  botPid,
  onStop,
}: RunningStateProps) {
  const { confirm, alert, ConfirmDialogComponent } = useConfirmDialog();
  const isStopping = botState === 'stopping';

  // Combined stats for display
  const displayStats = useMemo<DisplayStats>(
    () => ({
      totals: {
        jobs_found: historicalTotals.jobs_found + sessionStats.jobs_found,
        jobs_applied: historicalTotals.jobs_applied + sessionStats.jobs_applied,
        jobs_failed: historicalTotals.jobs_failed + sessionStats.jobs_failed,
        credits_used: historicalTotals.credits_used + sessionStats.credits_used,
      },
      current: sessionStats,
    }),
    [historicalTotals, sessionStats]
  );

  const activityMessage = currentActivity
    ? ACTIVITY_MESSAGES[currentActivity] || currentActivity
    : null;

  const handleStop = async () => {
    if (isStopping) return;

    const confirmed = await confirm(
      'Are you sure you want to stop the bot? This will immediately terminate the browser process.',
      { title: 'Stop Bot', variant: 'danger', confirmText: 'Stop', cancelText: 'Cancel' }
    );
    if (!confirmed) return;

    const result = await onStop();
    if (!result.success && result.error) {
      await alert(`Failed to stop bot: ${result.error}`, { title: 'Error' });
    }
  };

  return (
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-default">Bot Running</h3>
        <button
          onClick={handleStop}
          disabled={isStopping}
          className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/90 text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isStopping ? (
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
      </div>

      {/* Process Info */}
      {botPid && <ProcessInfoBanner pid={botPid} />}

      {/* Stopping Banner */}
      {isStopping && (
        <div className="p-3 bg-warning-subtle/15 border border-warning/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-warning animate-spin" />
            <span className="text-sm text-default">Stopping bot...</span>
          </div>
        </div>
      )}

      {/* Activity Banner */}
      {activityMessage && !isStopping && (
        <ActivityBanner
          message={activityMessage}
          company={activityDetails?.company as string | undefined}
          jobTitle={activityDetails?.job_title as string | undefined}
        />
      )}

      {/* Stats Grid */}
      <StatsGrid stats={displayStats} isActive={true} />

      {ConfirmDialogComponent}
    </div>
  );
}

/**
 * ENDED State (stopped/completed/failed) - Summary with restart
 */
interface EndedStateProps {
  botState: 'stopped' | 'completed' | 'failed';
  sessionStats: SessionStats;
  historicalTotals: HistoricalTotals;
  errorMessage: string | null;
  canLaunch: boolean;
  onLaunch: () => Promise<{ success: boolean; error?: string }>;
}

function EndedState({
  botState,
  sessionStats,
  historicalTotals,
  errorMessage,
  canLaunch,
  onLaunch,
}: EndedStateProps) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [launching, setLaunching] = useState(false);

  // Combined stats (historical now includes this session)
  const displayStats = useMemo<DisplayStats>(
    () => ({
      totals: historicalTotals,
      current: sessionStats,
    }),
    [historicalTotals, sessionStats]
  );

  const handleLaunch = () => {
    if (!canLaunch) return;

    if (typeof window !== 'undefined' && !window.electronAPI) {
      onLaunch();
      return;
    }

    setShowInstructions(true);
  };

  const handleConfirmLaunch = async () => {
    setShowInstructions(false);
    setLaunching(true);
    await onLaunch();
    setLaunching(false);
  };

  return (
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      {/* Instructions Modal */}
      {showInstructions && (
        <InstructionsModal
          onClose={() => setShowInstructions(false)}
          onConfirm={handleConfirmLaunch}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-default">Session Summary</h3>
        {canLaunch && (
          <button
            onClick={handleLaunch}
            disabled={launching}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50"
          >
            {launching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Bot
              </>
            )}
          </button>
        )}
      </div>

      {/* Status Banner */}
      {botState === 'stopped' && (
        <StatusBanner
          variant="warning"
          title="Session Stopped"
          message='Bot was stopped. Click "Start Bot" to begin a new session.'
        />
      )}
      {botState === 'completed' && (
        <StatusBanner
          variant="success"
          title="Session Completed"
          message="Bot finished successfully."
        />
      )}
      {botState === 'failed' && (
        <StatusBanner
          variant="error"
          title="Session Failed"
          message={errorMessage || 'Bot encountered an error.'}
        />
      )}

      {/* Stats Grid */}
      <StatsGrid stats={displayStats} isActive={false} />
    </div>
  );
}
