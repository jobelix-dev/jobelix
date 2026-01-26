/**
 * Launch Button - Prominent bot launch button
 */

'use client';

import { useEffect, useState } from 'react';
import { Rocket, AlertCircle, Info, Download, X, LogIn, MousePointer2Off, StopCircle, Shield, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { BotLaunchStatus } from '@/lib/shared/types';
import { PROGRESS_SIMULATION_INTERVAL_MS, SIMULATED_INSTALL_DURATION_MS, MAX_LOGS_TO_DISPLAY } from '@/lib/bot-status/constants';

interface LaunchButtonProps {
  canLaunch: boolean;
  launching: boolean;
  launchError: string | null;
  hasCredits: boolean;
  onLaunch: () => Promise<{ success: boolean; error?: string }>;
  launchStatus?: BotLaunchStatus | null;
}

export default function LaunchButton({
  canLaunch,
  launching,
  launchError,
  hasCredits,
  onLaunch,
  launchStatus,
}: LaunchButtonProps) {
  const [showWarning, setShowWarning] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const installProgress =
    typeof launchStatus?.progress === 'number'
      ? Math.max(0, Math.min(100, launchStatus.progress))
      : null;
  const isInstalling = launchStatus?.stage === 'installing';
  const showSetupMessage = launchStatus && ['checking', 'launching'].includes(launchStatus.stage);
  const showStatusCard = launchStatus && (launching || launchStatus.stage !== 'running');
  const [simulatedProgress, setSimulatedProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!isInstalling) {
      setSimulatedProgress(null);
      return;
    }
    if (typeof installProgress === 'number') {
      setSimulatedProgress(null);
      return;
    }

    const increment = 99 / (SIMULATED_INSTALL_DURATION_MS / PROGRESS_SIMULATION_INTERVAL_MS);
    setSimulatedProgress(0);

    const intervalId = window.setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev === null) return 0;
        return Math.min(99, prev + increment);
      });
    }, PROGRESS_SIMULATION_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [isInstalling, installProgress]);

  const displayProgress =
    typeof installProgress === 'number'
      ? Math.max(installProgress, simulatedProgress ?? 0)
      : simulatedProgress ?? 0;
  const progressValue = Math.max(0, Math.min(100, Math.round(displayProgress)));

  const handleClick = () => {
    if (!canLaunch) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    
    // Check if running in desktop app
    if (!window.electronAPI) {
      // Show desktop required error
      onLaunch(); // This will trigger the DESKTOP_REQUIRED error
      return;
    }
    
    // Show instructions modal before launching (desktop app only)
    setShowInstructions(true);
  };

  const handleConfirmLaunch = async () => {
    setShowInstructions(false);
    await onLaunch();
  };

  return (
    <div className="space-y-3">
      {/* Instructions Modal */}
      {showInstructions && (
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
              <button
                onClick={() => setShowInstructions(false)}
                className="text-muted hover:text-default transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <p className="text-sm text-muted">
                Quick checklist to keep the bot running smoothly:
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex gap-3 p-3 rounded-lg bg-primary-subtle/10">
                  <div className="flex-shrink-0 w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center">
                    <LogIn className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-default">Manual LinkedIn login</p>
                    <p className="text-xs text-muted">You’ll log in each time in the Chromium window.</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 rounded-lg bg-success-subtle/10">
                  <div className="flex-shrink-0 w-9 h-9 bg-success/10 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-default">Credentials never stored</p>
                    <p className="text-xs text-muted">Your login stays local and is not saved.</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 rounded-lg bg-warning-subtle/10">
                  <div className="flex-shrink-0 w-9 h-9 bg-warning/10 rounded-full flex items-center justify-center">
                    <MousePointer2Off className="w-4 h-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-default">Don’t interact with LinkedIn</p>
                    <p className="text-xs text-muted">Avoid clicks or scrolling while the bot runs.</p>
                  </div>
                </div>

                <div className="flex gap-3 p-3 rounded-lg bg-info-subtle/10">
                  <div className="flex-shrink-0 w-9 h-9 bg-info/10 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-info" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-default">1-3 min per application</p>
                    <p className="text-xs text-muted">Timing varies by job and form length.</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-lg bg-muted/10">
                <div className="flex-shrink-0 w-9 h-9 bg-danger/10 rounded-full flex items-center justify-center">
                  <StopCircle className="w-4 h-4 text-danger" />
                </div>
                <div>
                  <p className="text-sm font-medium text-default">Stop anytime</p>
                  <p className="text-xs text-muted">
                    Use the “Stop Bot” button (may take ~15 seconds) or close the Chromium window.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6">
              <button
                onClick={() => setShowInstructions(false)}
                className="flex-1 px-4 py-2.5 bg-muted/20 hover:bg-muted/30 text-default rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLaunch}
                disabled={launching}
                className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Rocket className="w-4 h-4" />
                {launching ? 'Launching...' : 'Launch Bot'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={launching}
        className="w-full px-6 py-4 text-base font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Rocket className="w-6 h-6" />
        {launching ? 'Launching Bot...' : 'Launch Auto Apply Bot'}
      </button>

      {showStatusCard && isInstalling && launchStatus && (
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
                  {launchStatus.logs.slice(-MAX_LOGS_TO_DISPLAY).map((line, index) => (
                    <div key={`${index}-${line.slice(0, 20)}`}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showStatusCard && !isInstalling && showSetupMessage && launchStatus && (
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

      {/* Desktop App Required */}
      {launchError === 'DESKTOP_REQUIRED' && (
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
      )}

      {/* Other Errors */}
      {launchError && launchError !== 'DESKTOP_REQUIRED' && (
        <div className="p-3 bg-error-subtle/20 border border-error rounded-lg text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {launchError}
        </div>
      )}

      {/* Warning when requirements not met */}
      {showWarning && !canLaunch && (
        <div className="p-3 bg-warning-subtle/20 border border-warning rounded-lg text-sm text-warning flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {!hasCredits ? 'You need credits to launch the bot' : 'Please complete your profile and job preferences first'}
        </div>
      )}
    </div>
  );
}
