/**
 * Launch Button - Prominent bot launch button
 */

'use client';

import { useState } from 'react';
import { Rocket, AlertCircle, Info, Download } from 'lucide-react';
import Link from 'next/link';

interface LaunchButtonProps {
  canLaunch: boolean;
  launching: boolean;
  launchError: string | null;
  hasCredits: boolean;
  onLaunch: () => Promise<{ success: boolean; error?: string }>;
}

export default function LaunchButton({
  canLaunch,
  launching,
  launchError,
  hasCredits,
  onLaunch,
}: LaunchButtonProps) {
  const [showWarning, setShowWarning] = useState(false);

  const handleClick = async () => {
    if (!canLaunch) {
      setShowWarning(true);
      setTimeout(() => setShowWarning(false), 3000);
      return;
    }
    await onLaunch();
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={launching}
        className="w-full px-6 py-4 text-base font-semibold bg-primary hover:bg-primary-hover text-white rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Rocket className="w-6 h-6" />
        {launching ? 'Launching Bot...' : 'Launch Auto Apply Bot'}
      </button>

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
