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

import { useState, useEffect, useMemo } from 'react';
import {
  Rocket,
  OctagonX,
  Loader2,
  Play,
  Info,
  X,
  LogIn,
  MousePointer2Off,
  StopCircle,
  Shield,
  Clock,
  AlertCircle,
  Download,
  Briefcase,
  CheckSquare,
  XSquare,
  Zap,
  Eye,
  Cpu,
  Timer,
} from 'lucide-react';
import Link from 'next/link';
import { useConfirmDialog } from '@/app/components/useConfirmDialog';
import { useSimulatedProgress } from '@/app/hooks';
import type { BotState, LaunchProgress, SessionStats, HistoricalTotals } from '../hooks/useBot';

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
  const displayStats = useMemo(
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
  const displayStats = useMemo(
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

// =============================================================================
// Shared Sub-Components
// =============================================================================

function InstructionsModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Info className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-default">Before You Start</h3>
          </div>
          <button onClick={onClose} className="text-muted hover:text-default transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-muted">Quick checklist to keep the bot running smoothly:</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <InstructionCard
              icon={<LogIn className="w-4 h-4 text-primary" />}
              iconBg="bg-primary/10"
              cardBg="bg-primary-subtle/10"
              title="Manual LinkedIn login"
              description="You'll log in each time in the Chromium window."
            />
            <InstructionCard
              icon={<Shield className="w-4 h-4 text-success" />}
              iconBg="bg-success/10"
              cardBg="bg-success-subtle/10"
              title="Credentials never stored"
              description="Your login stays local and is not saved."
            />
            <InstructionCard
              icon={<MousePointer2Off className="w-4 h-4 text-warning" />}
              iconBg="bg-warning/10"
              cardBg="bg-warning-subtle/10"
              title="Don't interact with LinkedIn"
              description="Avoid clicks or scrolling while the bot runs."
            />
            <InstructionCard
              icon={<Clock className="w-4 h-4 text-info" />}
              iconBg="bg-info/10"
              cardBg="bg-info-subtle/10"
              title="1-3 min per application"
              description="Timing varies by job and form length."
            />
          </div>

          <div className="flex gap-3 p-3 rounded-lg bg-muted/10">
            <div className="flex-shrink-0 w-9 h-9 bg-error/10 rounded-full flex items-center justify-center">
              <StopCircle className="w-4 h-4 text-error" />
            </div>
            <div>
              <p className="text-sm font-medium text-default">Stop anytime</p>
              <p className="text-xs text-muted">
                Use &quot;Stop Bot&quot; button or close the Chromium window.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-muted/20 hover:bg-muted/30 text-default rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Rocket className="w-4 h-4" />
            Launch Bot
          </button>
        </div>
      </div>
    </div>
  );
}

function InstructionCard({
  icon,
  iconBg,
  cardBg,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  cardBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className={`flex gap-3 p-3 rounded-lg ${cardBg}`}>
      <div className={`flex-shrink-0 w-9 h-9 ${iconBg} rounded-full flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-default">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </div>
  );
}

function DesktopRequiredBanner() {
  return (
    <div className="p-4 bg-info-subtle/20 border border-info rounded-lg">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-default mb-1">Desktop App Required</p>
          <p className="text-xs text-muted mb-3">
            The bot runs locally on your computer. Download the desktop app to get started.
          </p>
          <Link
            href="/download"
            className="inline-flex items-center gap-2 px-4 py-2 bg-info hover:bg-info/90 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Desktop App
          </Link>
        </div>
      </div>
    </div>
  );
}

function InstallProgressBanner({ progress }: { progress: number }) {
  return (
    <div className="p-3 bg-info-subtle/15 border border-info/20 rounded-lg">
      <div className="flex items-center gap-3 mb-2">
        <Download className="w-4 h-4 text-info animate-pulse" />
        <span className="text-sm text-default">Installing browser...</span>
        <span className="text-xs text-muted ml-auto">{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-info/10 rounded-full h-1.5">
        <div
          className="bg-info h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function SetupMessageBanner({ message, stage }: { message?: string; stage?: string }) {
  return (
    <div className="p-3 bg-primary-subtle/15 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span className="text-sm text-default">{message || `${stage || 'Setting up'}...`}</span>
      </div>
    </div>
  );
}

function ActivityBanner({
  message,
  company,
  jobTitle,
}: {
  message: string;
  company?: string;
  jobTitle?: string;
}) {
  return (
    <div className="p-3 bg-primary-subtle/15 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0" />
        <span className="text-sm text-default">
          {message}
          {company && <span className="font-medium"> - {company}</span>}
          {jobTitle && <span className="text-muted"> - {jobTitle}</span>}
        </span>
      </div>
    </div>
  );
}

function ProcessInfoBanner({ pid }: { pid: number }) {
  const [runtime, setRuntime] = useState('0s');
  const [startTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      setRuntime(minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <div className="p-2.5 bg-info-subtle/10 border border-info/15 rounded-lg">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4 text-muted">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-info" />
            PID: <span className="font-mono text-default">{pid}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-info" />
            Running: <span className="text-default">{runtime}</span>
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-success">
          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
          Active
        </span>
      </div>
    </div>
  );
}

function StatusBanner({
  variant,
  title,
  message,
}: {
  variant: 'warning' | 'error' | 'success';
  title: string;
  message: string;
}) {
  const bgClass = {
    warning: 'bg-warning-subtle/10',
    error: 'bg-error-subtle/10',
    success: 'bg-success-subtle/10',
  }[variant];

  return (
    <div className={`p-4 ${bgClass} rounded-lg`}>
      <p className="text-sm font-medium text-default mb-1">{title}</p>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

interface DisplayStats {
  totals: { jobs_found: number; jobs_applied: number; jobs_failed: number; credits_used: number };
  current: { jobs_found: number; jobs_applied: number; jobs_failed: number; credits_used: number };
}

function StatsGrid({ stats, isActive }: { stats: DisplayStats; isActive: boolean }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        icon={<Briefcase className="w-3.5 h-3.5 text-success" />}
        label="Jobs Found"
        value={stats.totals.jobs_found}
        currentValue={stats.current.jobs_found}
        isActive={isActive}
      />
      <StatCard
        icon={<CheckSquare className="w-3.5 h-3.5 text-success" />}
        label="Applied"
        value={stats.totals.jobs_applied}
        currentValue={stats.current.jobs_applied}
        href="https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED"
        isActive={isActive}
      />
      <StatCard
        icon={<XSquare className="w-3.5 h-3.5 text-success" />}
        label="Failed"
        value={stats.totals.jobs_failed}
        currentValue={stats.current.jobs_failed}
        isActive={isActive}
      />
      <StatCard
        icon={<Zap className="w-3.5 h-3.5 text-success" />}
        label="Credits"
        value={stats.totals.credits_used}
        currentValue={stats.current.credits_used}
        isActive={isActive}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  currentValue = 0,
  href,
  isActive,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  currentValue?: number;
  href?: string;
  isActive?: boolean;
}) {
  const labelContent = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-success hover:text-success/80 transition-colors"
      title={`View ${label.toLowerCase()} on LinkedIn`}
    >
      {label}
      <Eye className="h-3 w-3" />
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
