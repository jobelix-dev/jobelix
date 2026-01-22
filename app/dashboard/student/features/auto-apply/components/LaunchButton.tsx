/**
 * Launch Button - Prominent bot launch button
 */

'use client';

import { useState } from 'react';
import { Rocket, AlertCircle, Info, Download, X, LogIn, MousePointer2Off, StopCircle } from 'lucide-react';
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
  const [showInstructions, setShowInstructions] = useState(false);

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
            <div className="flex items-center justify-between p-6 border-b border-border">
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
                Please read these important instructions to ensure the bot runs smoothly:
              </p>

              {/* Instruction 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-default mb-1">Manual LinkedIn Login Required</h4>
                  <p className="text-sm text-muted">
                    The bot will open a Chromium browser window. You'll need to log into LinkedIn manually each time. 
                    <strong className="text-default"> Your credentials are never stored or transmitted</strong> — this ensures your account security.
                  </p>
                </div>
              </div>

              {/* Instruction 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                  <MousePointer2Off className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <h4 className="font-medium text-default mb-1">Don't Touch the Browser</h4>
                  <p className="text-sm text-muted">
                    Once logged in, <strong className="text-default">do not click, scroll, or interact</strong> with the browser window. 
                    You can minimize it or switch to other apps, but any interaction will disrupt the bot's automation.
                  </p>
                </div>
              </div>

              {/* Instruction 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-danger/10 rounded-full flex items-center justify-center">
                  <StopCircle className="w-4 h-4 text-danger" />
                </div>
                <div>
                  <h4 className="font-medium text-default mb-1">How to Stop the Bot</h4>
                  <p className="text-sm text-muted">
                    You can stop the bot at any time by either:
                  </p>
                  <ul className="text-sm text-muted mt-2 space-y-1 list-disc list-inside ml-2">
                    <li>Clicking the <strong className="text-default">"Stop Bot"</strong> button in this app <span className="text-muted">(may take up to 15 seconds to close)</span>, or</li>
                    <li>Closing the Chromium browser window</li>
                  </ul>
                </div>
              </div>

              {/* Note */}
              <div className="p-4 bg-info-subtle/10 rounded-lg border border-info-subtle">
                <p className="text-xs text-muted">
                  <strong className="text-default">Tip:</strong> The bot will show live progress updates in the Auto Apply tab. 
                  You can monitor applications in real-time without touching the browser.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-border">
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
