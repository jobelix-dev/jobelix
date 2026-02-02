/**
 * LaunchSection Shared Components
 * 
 * Reusable UI components for the bot control interface.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Play,
  Info,
  X,
  LogIn,
  MousePointer2Off,
  StopCircle,
  Shield,
  Clock,
  Download,
  Briefcase,
  CheckSquare,
  XSquare,
  Zap,
  Eye,
  Cpu,
  Timer,
  Loader2,
} from 'lucide-react';

// =============================================================================
// Instructions Modal
// =============================================================================

export function InstructionsModal({
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
            <Play className="w-4 h-4" />
            Start
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

// =============================================================================
// Status Banners
// =============================================================================

export function DesktopRequiredBanner() {
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

export function InstallProgressBanner({ progress }: { progress: number }) {
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

export function BrowserNotInstalledBanner({
  installing,
  progress,
  error,
  onInstall,
}: {
  installing: boolean;
  progress: number;
  error: string | null;
  onInstall: () => void;
}) {
  if (installing) {
    return (
      <div className="p-4 bg-info-subtle/20 border border-info rounded-lg">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-info flex-shrink-0 mt-0.5 animate-pulse" />
          <div className="flex-1">
            <p className="text-sm font-medium text-default mb-2">Downloading Browser</p>
            <p className="text-xs text-muted mb-3">
              Installing Chromium browser for job applications. This only happens once.
            </p>
            <div className="w-full bg-info/10 rounded-full h-2 mb-2">
              <div
                className="bg-info h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted">{Math.round(progress)}% complete</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-warning-subtle/20 border border-warning rounded-lg">
      <div className="flex items-start gap-3">
        <Download className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-default mb-1">Browser Installation Required</p>
          <p className="text-xs text-muted mb-3">
            The bot needs a browser to apply for jobs. This is a one-time download (~150MB).
          </p>
          {error && (
            <p className="text-xs text-error mb-3">
              Error: {error}
            </p>
          )}
          <button
            onClick={onInstall}
            className="inline-flex items-center gap-2 px-4 py-2 bg-warning hover:bg-warning/90 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Install Browser
          </button>
        </div>
      </div>
    </div>
  );
}

export function BrowserCheckingBanner() {
  return (
    <div className="p-3 bg-muted/10 border border-muted/20 rounded-lg">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-muted animate-spin" />
        <span className="text-sm text-muted">Checking browser installation...</span>
      </div>
    </div>
  );
}

export function SetupMessageBanner({ message, stage }: { message?: string; stage?: string }) {
  return (
    <div className="p-3 bg-primary-subtle/15 border border-primary/20 rounded-lg">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
        <span className="text-sm text-default">{message || `${stage || 'Setting up'}...`}</span>
      </div>
    </div>
  );
}

export function ActivityBanner({
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

export function ProcessInfoBanner({ pid }: { pid: number }) {
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

export function StatusBanner({
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

// =============================================================================
// Stats Components
// =============================================================================

export interface DisplayStats {
  totals: { jobs_found: number; jobs_applied: number; jobs_failed: number; credits_used: number };
  current: { jobs_found: number; jobs_applied: number; jobs_failed: number; credits_used: number };
}

export function StatsGrid({ stats, isActive }: { stats: DisplayStats; isActive: boolean }) {
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
