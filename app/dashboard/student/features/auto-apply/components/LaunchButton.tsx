/**
 * Launch Button - Prominent bot launch button
 */

'use client';

import { useState } from 'react';
import { Rocket, AlertCircle, Info, Download, X, LogIn, MousePointer2Off, StopCircle, Shield, Clock } from 'lucide-react';
import Link from 'next/link';
import { BotLaunchStatus } from '@/lib/shared/types';
import { useSimulatedProgress } from '@/app/hooks';
import { InstallProgressBanner, SetupMessageBanner } from './BotLaunchStatusBanners';

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

  const isInstalling = launchStatus?.stage === 'installing';
  const showSetupMessage = launchStatus && ['checking', 'launching'].includes(launchStatus.stage);
  const showStatusCard = launchStatus && (launching || launchStatus.stage !== 'running');

  const progressValue = useSimulatedProgress({
    isActive: isInstalling,
    realProgress: launchStatus?.progress,
  });

  const handleClick = () => {
    if (launching) return;
    
    if (!canLaunch) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    
    // Check if running in desktop app
    if (!window.electronAPI) {
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
      {showInstructions && (
        <InstructionsModal
          launching={launching}
          onClose={() => setShowInstructions(false)}
          onConfirm={handleConfirmLaunch}
        />
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
        <InstallProgressBanner progress={progressValue} />
      )}

      {showStatusCard && !isInstalling && showSetupMessage && launchStatus && (
        <SetupMessageBanner message={launchStatus.message} stage={launchStatus.stage} />
      )}

      {launchError === 'DESKTOP_REQUIRED' && <DesktopRequiredBanner />}

      {launchError && launchError !== 'DESKTOP_REQUIRED' && (
        <div className="p-3 bg-error-subtle/20 border border-error rounded-lg text-sm text-error flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {launchError}
        </div>
      )}

      {showWarning && !canLaunch && (
        <div className="p-3 bg-warning-subtle/20 border border-warning rounded-lg text-sm text-warning flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {!hasCredits ? 'You need credits to launch the bot' : 'Please complete your profile and job preferences first'}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

interface InstructionsModalProps {
  launching: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

function InstructionsModal({ launching, onClose, onConfirm }: InstructionsModalProps) {
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
          <button
            onClick={onClose}
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
            <div className="flex-shrink-0 w-9 h-9 bg-danger/10 rounded-full flex items-center justify-center">
              <StopCircle className="w-4 h-4 text-danger" />
            </div>
            <div>
              <p className="text-sm font-medium text-default">Stop anytime</p>
              <p className="text-xs text-muted">
                Use the "Stop Bot" button (may take ~15 seconds) or close the Chromium window.
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
            disabled={launching}
            className="flex-1 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Rocket className="w-4 h-4" />
            {launching ? 'Launching...' : 'Launch Bot'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface InstructionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  cardBg: string;
  title: string;
  description: string;
}

function InstructionCard({ icon, iconBg, cardBg, title, description }: InstructionCardProps) {
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
