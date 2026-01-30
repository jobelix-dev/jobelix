/**
 * Bot Launch Status Banners
 * 
 * Shared components for displaying bot launch status (installing, setup messages).
 */

'use client';

import { Loader2 } from 'lucide-react';

interface InstallProgressBannerProps {
  progress: number;
}

export function InstallProgressBanner({ progress }: InstallProgressBannerProps) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary-subtle/10 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold text-default">Setting up browser</p>
            <p className="text-xs text-muted">
              First-time setup: installing Chromium browser. This may take a few moments.
            </p>
          </div>
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
              <div
                className="h-full rounded-full bg-primary transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
              <span>{progress}%</span>
              <span className="text-[10px]">Please wait...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface SetupMessageBannerProps {
  message?: string;
  stage?: string;
}

export function SetupMessageBanner({ message, stage }: SetupMessageBannerProps) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary-subtle/10 p-3">
      <div className="flex items-center gap-2 text-sm text-default">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="font-medium">
          {message || (stage === 'checking' ? 'Checking browser...' : 'Launching bot...')}
        </span>
      </div>
    </div>
  );
}
