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
import type { ReleaseInfo } from '@/lib/client/github-api';
import { getFallbackDownloadUrl } from '@/lib/client/github-api';
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
        <div className="inline-flex items-center gap-2 text-muted">
          <div className="w-5 h-5 border-2 border-border border-t-primary rounded-full animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // User is already in Electron app
  if (isElectron) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-gradient-to-r from-success-subtle to-success-subtle/20/20 border-2 border-success rounded-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-success/40 rounded-full mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          
          <h2 className="text-2xl font-bold text-default mb-2">
            You're Already Using the Desktop App! 🎉
          </h2>
          
          <p className="text-muted mb-6">
            No download needed. Sign in to access your dashboard and start automating your job applications.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors shadow-md"
          >
            <Rocket className="w-5 h-5" />
            Sign In to Your Account
          </Link>

          {releaseInfo && (
            <p className="mt-4 text-xs text-muted">
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
      <div className="bg-gradient-to-r from-primary-subtle to-info-subtle/20/20 border border-primary-subtle rounded-lg p-8 text-center">
        {fetchError ? (
          // Error state - show fallback link
          <div>
            <h2 className="text-2xl font-bold text-default mb-4">
              Download Jobelix Desktop App
            </h2>
            <p className="text-muted mb-6">
              Unable to fetch release information. Please download directly from GitHub.
            </p>
            <a
              href={getFallbackDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors shadow-md"
            >
              <Rocket className="w-5 h-5" />
              Download from GitHub
            </a>
          </div>
        ) : (
          // Success state - show download button
          <div>
            <h2 className="text-2xl font-bold text-default mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted mb-6">
              Download the desktop app and start automating your job applications today.
            </p>
            <DownloadButton 
              releaseInfo={releaseInfo} 
              loading={!releaseInfo && !fetchError}
              variant="primary"
            />
            
            <p className="mt-6 text-sm text-muted">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
              {' '}or{' '}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                create one
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
