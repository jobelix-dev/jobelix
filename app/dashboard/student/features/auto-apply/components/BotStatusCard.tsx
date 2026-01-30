/**
 * BotStatusCard Component
 * 
 * Displays real-time bot session status with live updates.
 * Shows activity, stats, elapsed time, and provides stop control.
 * Updated: 2026-01-30
 */

'use client';

import { useMemo } from 'react';
import { BotSession, BotLaunchStatus, HistoricalTotals } from '@/lib/shared/types';
import * as Icons from 'lucide-react';
import { useConfirmDialog } from '@/app/components/useConfirmDialog';
import { useSimulatedProgress } from '@/app/hooks';
import { InstallProgressBanner, SetupMessageBanner } from './BotLaunchStatusBanners';

// Constants
const ACTIVITY_MESSAGES: Record<string, string> = {
  'starting': 'Starting up...',
  'authenticating': 'Logging into LinkedIn...',
  'searching_jobs': 'Searching for jobs...',
  'applying_jobs': 'Applying to jobs...',
  'answering_questions': 'Answering application questions...',
  'submitting_application': 'Submitting application...',
  'waiting': 'Waiting...',
  'finalizing': 'Finalizing...',
};

interface BotStatusCardProps {
  session: BotSession;
  historicalTotals: HistoricalTotals;
  onStop: () => Promise<{ success: boolean; error?: string }>;
  onLaunch?: () => Promise<{ success: boolean; error?: string }>;
  onShowInstructions?: () => void;
  launchStatus?: BotLaunchStatus | null;
}

export default function BotStatusCard({ session, historicalTotals, onStop, onLaunch, onShowInstructions, launchStatus }: BotStatusCardProps) {
  const { confirm, alert, ConfirmDialogComponent } = useConfirmDialog();
  const isActive = session.status === 'starting' || session.status === 'running';
  const isCompleted = session.status === 'completed' || session.status === 'failed' || session.status === 'stopped';
  const isStopped = session.status === 'stopped';
  const isFailed = session.status === 'failed';
  const isInstalling = launchStatus?.stage === 'installing';
  const showSetupMessage = !isActive && !isCompleted && launchStatus && ['checking', 'launching'].includes(launchStatus.stage);

  const progressValue = useSimulatedProgress({
    isActive: isInstalling,
    realProgress: launchStatus?.progress,
  });

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
    if (!confirmed) return;

    const result = await onStop();
    if (!result.success && result.error) {
      await alert(`Failed to stop bot: ${result.error}`, { title: 'Error' });
    }
  };

  return (
    <div className="bg-background rounded-xl p-4 shadow-sm space-y-4">
      <HeaderSection
        isActive={isActive}
        isCompleted={isCompleted}
        onStop={handleStop}
        onLaunch={onLaunch}
        onShowInstructions={onShowInstructions}
      />

      {isInstalling && launchStatus && (
        <InstallProgressBanner progress={progressValue} />
      )}

      {!isInstalling && showSetupMessage && (
        <SetupMessageBanner message={launchStatus?.message} stage={launchStatus?.stage} />
      )}

      {showActivityCard && (
        <ActivityBanner 
          message={activityMessage!}
          company={session.activity_details?.company}
          jobTitle={session.activity_details?.job_title}
        />
      )}

      <StatsGrid stats={displayStats} isActive={isActive} />

      {isStopped && <StatusBanner variant="warning" title="Session Stopped" message="The bot was manually stopped and will not restart automatically. Click &quot;Launch Again&quot; to start a new session." />}
      {isFailed && <StatusBanner variant="error" title="Session Failed" message="The bot encountered an error and stopped. You can launch a new session when ready." />}
      
      {ConfirmDialogComponent}
    </div>
  );
}

// --- Sub-components ---

interface HeaderSectionProps {
  isActive: boolean;
  isCompleted: boolean;
  onStop: () => void;
  onLaunch?: () => Promise<{ success: boolean; error?: string }>;
  onShowInstructions?: () => void;
}

function HeaderSection({ isActive, isCompleted, onStop, onLaunch, onShowInstructions }: HeaderSectionProps) {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold text-default">Bot Session</h3>
      
      {isActive ? (
        <button
          onClick={onStop}
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
  );
}

interface ActivityBannerProps {
  message: string;
  company?: string;
  jobTitle?: string;
}

function ActivityBanner({ message, company, jobTitle }: ActivityBannerProps) {
  return (
    <div className="p-3 bg-primary-subtle/15 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0" />
        <span className="text-sm text-default">
          {message}
          {company && <span className="font-medium"> • {company}</span>}
          {jobTitle && <span className="text-muted"> - {jobTitle}</span>}
        </span>
      </div>
    </div>
  );
}

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

interface DisplayStats {
  totals: { jobs_found: number; jobs_applied: number; jobs_failed: number; credits_used: number };
  current: { jobs_found: number; jobs_applied: number; jobs_failed: number; credits_used: number };
}

interface StatsGridProps {
  stats: DisplayStats;
  isActive: boolean;
}

function StatsGrid({ stats, isActive }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        icon={<Icons.Briefcase className="w-3.5 h-3.5 text-success" />}
        label="Jobs Found"
        value={stats.totals.jobs_found}
        currentValue={stats.current.jobs_found}
        isActive={isActive}
      />
      <StatCard
        icon={<Icons.CheckSquare className="w-3.5 h-3.5 text-success" />}
        label="Applied"
        value={stats.totals.jobs_applied}
        currentValue={stats.current.jobs_applied}
        href="https://www.linkedin.com/my-items/saved-jobs/?cardType=APPLIED"
        isActive={isActive}
      />
      <StatCard
        icon={<Icons.XSquare className="w-3.5 h-3.5 text-success" />}
        label="Failed"
        value={stats.totals.jobs_failed}
        currentValue={stats.current.jobs_failed}
        isActive={isActive}
      />
      <StatCard
        icon={<Icons.Zap className="w-3.5 h-3.5 text-success" />}
        label="Credits used"
        value={stats.totals.credits_used}
        currentValue={stats.current.credits_used}
        isActive={isActive}
      />
    </div>
  );
}

interface StatusBannerProps {
  variant: 'warning' | 'error';
  title: string;
  message: string;
}

function StatusBanner({ variant, title, message }: StatusBannerProps) {
  const bgClass = variant === 'warning' ? 'bg-warning-subtle/10' : 'bg-error-subtle/10';
  return (
    <div className={`p-4 ${bgClass} rounded-lg`}>
      <p className="text-sm font-medium text-default mb-1">{title}</p>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
