/**
 * Electron Detector Component
 * 
 * Client component that detects if running in Electron app.
 * Shows different UI based on environment:
 * - In Electron: "You're already using the desktop app" message
 * - In Browser: Download button with release info
 */

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Rocket } from 'lucide-react';
import DownloadButton from '@/app/components/DownloadButton';
import type { ReleaseInfo } from '@/lib/server/github-api';
import { getFallbackDownloadUrl } from '@/lib/server/github-api';
import Link from 'next/link';

interface ElectronDetectorProps {
  releaseInfo?: ReleaseInfo;
  fetchError?: boolean;
}

export default function ElectronDetector({ releaseInfo, fetchError }: ElectronDetectorProps) {
  const [isElectron, setIsElectron] = useState<boolean | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if window.electronAPI exists (only available in Electron)
    setIsElectron(typeof window !== 'undefined' && !!(window as any).electronAPI);
  }, []);

  // Show loading state during hydration
  if (!isClient || isElectron === null) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
          <div className="w-5 h-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-purple-600 rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // User is already in Electron app
  if (isElectron) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            You're Already Using the Desktop App! 🎉
          </h2>
          
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            No download needed. You're all set to use Jobelix's automation features.
          </p>

          <Link
            href="/dashboard/student"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-md"
          >
            <Rocket className="w-5 h-5" />
            Go to Dashboard
          </Link>

          {releaseInfo && (
            <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
              Latest version: {releaseInfo.version}
            </p>
          )}
        </div>
      </div>
    );
  }

  // User is in browser - show download button
  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-8 text-center">
        {fetchError ? (
          // Error state - show fallback link
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Download Jobelix Desktop App
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Unable to fetch release information. Please download directly from GitHub.
            </p>
            <a
              href={getFallbackDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors shadow-md"
            >
              <Rocket className="w-5 h-5" />
              Download from GitHub
            </a>
          </div>
        ) : (
          // Success state - show download button
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Download the desktop app and start automating your job applications today.
            </p>
            <DownloadButton 
              releaseInfo={releaseInfo} 
              loading={!releaseInfo && !fetchError}
              variant="primary"
            />
            
            <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
              Already have an account?{' '}
              <Link href="/login" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
                Sign in
              </Link>
              {' '}or{' '}
              <Link href="/signup" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
                create one
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
