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
  Play,
  OctagonX,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
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
  // Browser status (installation)
  browserChecking: boolean;
  browserInstalled: boolean;
  browserInstalling: boolean;
  browserProgress: number;
  browserError: string | null;

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

// Activity display messages - maps bot activities to user-friendly messages
const ACTIVITY_MESSAGES: Record<string, string> = {
  // Startup
  initializing: 'Starting bot...',
  linkedin_login: 'Waiting for LinkedIn login...',
  linkedin_login_done: 'LinkedIn connected',
  
  // Search
  searching_jobs: 'Searching for jobs...',
  jobs_found: 'Found matching jobs',
  
  // Application lifecycle
  navigating_to_job: 'Opening job listing...',
  extracting_description: 'Reading job details...',
  detecting_language: 'Detecting language...',
  tailoring_resume: 'Tailoring resume...',
  opening_application: 'Opening application...',
  filling_form: 'Filling application form...',
  uploading_resume: 'Uploading resume...',
  generating_cover_letter: 'Writing cover letter...',
  submitting_application: 'Submitting application...',
  application_submitted: 'Application submitted!',
  application_failed: 'Application failed',
  skipping_job: 'Skipping job...',
  
  // General
  applying_jobs: 'Processing applications...',
  finalizing: 'Finishing up...',
  stats_update: '',  // Silent update, no message
};

// =============================================================================
// Main Component - Unified Bot Status Card
// =============================================================================

export default function LaunchSection({
  browserChecking,
  browserInstalled,
  browserInstalling: _browserInstalling,
  browserProgress,
  browserError,
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
        <h3 className="text-lg font-semibold text-default">Bot Status</h3>

        {/* Action Button */}
        {isActive ? (
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
        ) : (
          <button
            onClick={handleLaunchClick}
            disabled={launching || !canLaunch || browserChecking || !browserInstalled}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {launching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Launching...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start
              </>
            )}
          </button>
        )}
      </div>

      {/* Browser Installation Progress */}
      {browserChecking && (
        <div className="p-3 bg-muted/10 border border-muted/20 rounded-lg">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-muted animate-spin" />
            <span className="text-sm text-muted">Checking browser installation...</span>
          </div>
        </div>
      )}

      {!browserChecking && !browserInstalled && (
        <div className="p-4 bg-info-subtle/20 border border-info rounded-lg">
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5 text-info flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-default mb-2">Downloading Browser</p>
              <p className="text-xs text-muted mb-3">
                Installing Chromium browser for job applications. This only happens once.
              </p>
              {browserError ? (
                <p className="text-xs text-error mb-3">Error: {browserError}</p>
              ) : (
                <>
                  <div className="w-full bg-info/10 rounded-full h-2 mb-2">
                    <div
                      className="bg-info h-2 rounded-full transition-all duration-300"
                      style={{ width: `${browserProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted">{Math.round(browserProgress)}% complete</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

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
          activity={currentActivity || undefined}
          company={activityDetails?.company as string | undefined}
          jobTitle={activityDetails?.job_title as string | undefined}
          step={activityDetails?.step as number | undefined}
          totalSteps={activityDetails?.total_steps as number | undefined}
          language={activityDetails?.language_name as string | undefined}
          reason={activityDetails?.reason as string | undefined}
          searchQuery={activityDetails?.search_query as string | undefined}
          jobsFound={activityDetails?.count as number | undefined}
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
      {botState === 'failed' && errorMessage !== 'Desktop app required' && (
        <StatusMessage
          variant="error"
          icon={<XCircle className="w-4 h-4" />}
          message={errorMessage || 'Bot encountered an error.'}
        />
      )}

      {/* Desktop Required Banner */}
      {errorMessage === 'Desktop app required' && <DesktopRequiredBanner />}

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
