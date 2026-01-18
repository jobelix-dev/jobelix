/**
 * Bot Launch Panel - Launch bot and display status
 */

import { Rocket, Info, Download, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface BotLaunchPanelProps {
  canLaunch: boolean;
  launching: boolean;
  launchError: string | null;
  hasCredits: boolean;
  checking: boolean;
  onLaunch: () => Promise<{ success: boolean; error?: string }>;
}

export default function BotLaunchPanel({
  canLaunch,
  launching,
  launchError,
  hasCredits,
  checking,
  onLaunch,
}: BotLaunchPanelProps) {
  const [showLaunchWarning, setShowLaunchWarning] = useState(false);

  const handleLaunchClick = async () => {
    if (!canLaunch) {
      setShowLaunchWarning(true);
      setTimeout(() => setShowLaunchWarning(false), 3000);
      return;
    }

    await onLaunch();
  };

  if (checking) {
    return <p className="text-sm text-muted">Checking preferences...</p>;
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleLaunchClick}
        disabled={launching}
        className="w-full px-6 py-3 text-sm font-medium bg-primary hover:bg-primary-hover text-white rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Rocket className="w-5 h-5" />
        {launching ? 'Launching...' : 'Launch Bot'}
      </button>
      
      {/* Desktop App Required Message */}
      {launchError === 'DESKTOP_REQUIRED' && (
        <div className="p-4 bg-info-subtle/20 border border-info rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-info-subtle mb-1">
                Desktop App Required
              </p>
              <p className="text-xs text-info mb-3">
                This feature requires the Jobelix desktop application. Your data is safe and will sync automatically when you download the app.
              </p>
              <Link
                href="/download"
                className="inline-flex items-center gap-2 px-4 py-2 bg-info hover:bg-info text-white text-xs font-medium rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Desktop App
              </Link>
            </div>
          </div>
        </div>
      )}
      
      {/* Other Error Messages */}
      {launchError && launchError !== 'DESKTOP_REQUIRED' && (
        <div className="p-2 bg-error-subtle/20 border border-error rounded text-xs text-error">
          {launchError}
        </div>
      )}
      
      {/* Warning when trying to launch without requirements */}
      {showLaunchWarning && !canLaunch && (
        <div className="p-2 bg-warning-subtle/20 border border-warning rounded text-xs text-warning flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {!hasCredits ? 'Missing credits' : 'You forgot to save your job search preferences'}
          </span>
        </div>
      )}
    </div>
  );
}
