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
    return <p className="text-sm text-zinc-500">Checking preferences...</p>;
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleLaunchClick}
        disabled={launching}
        className="w-full px-6 py-3 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Rocket className="w-5 h-5" />
        {launching ? 'Launching...' : 'Launch Bot'}
      </button>
      
      {/* Desktop App Required Message */}
      {launchError === 'DESKTOP_REQUIRED' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Desktop App Required
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                This feature requires the Jobelix desktop application. Your data is safe and will sync automatically when you download the app.
              </p>
              <Link
                href="/download"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
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
        <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
          {launchError}
        </div>
      )}
      
      {/* Warning when trying to launch without requirements */}
      {showLaunchWarning && !canLaunch && (
        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            {!hasCredits ? 'Missing credits' : 'You forgot to save your job search preferences'}
          </span>
        </div>
      )}
    </div>
  );
}
